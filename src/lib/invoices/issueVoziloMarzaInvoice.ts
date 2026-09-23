import { prisma } from "@/lib/prisma";
import { loadFiscalCertFromEnv } from "@/lib/fiscalization/cert";
import { fiscalizeRacun, izracunajMarzuPdv, nacinPlacanjaCIS, buildFiscalQrUrl } from "@/lib/fiscalization/engine";

export class IssueInvoiceError extends Error {
  constructor(
    public code: "transaction_not_found" | "contracts_not_signed" | "cesija_manual_process" | "fiscalization_failed",
    message?: string
  ) {
    super(message ?? code);
  }
}

export interface IssueInvoiceOptions {
  transactionId: string;
  // Stvarni CIS "način plaćanja" naziv (vidi engine.ts NACIN_PLAC_MAP) - "gotovina"
  // za čisto gotovinski tok, "ostalo" kad je dio (provizija) plaćen karticom preko
  // Stripea a ostatak gotovinom (CIS nema poseban "mixed" kod - "O" je standardna
  // praksa za split-tender račune, vidi PROGRESS.md otvorena stavka za potvrdu s
  // knjigovođom prije launcha).
  nacinPlacanjaNaziv: string;
  stripePayment?: { checkoutSessionId: string; paymentIntentId: string | null; placenoAt: Date };
}

// Izdaje fiskalizirani R2-na-maržu račun za transakciju (korak 4 -> 5 CLAUDE.md
// flowa). Dijeljena logika između ručnog /api/invoices poziva i Stripe webhooka
// (checkout.session.completed) - vidi CLAUDE.md "Fiskalizacija" i PROGRESS.md.
export async function issueVoziloMarzaInvoice(opts: IssueInvoiceOptions) {
  const transaction = await prisma.transaction.findUnique({
    where: { id: opts.transactionId },
    include: { vehicle: true, prodavatelj: true, kupac: true },
  });
  if (!transaction) {
    throw new IssueInvoiceError("transaction_not_found");
  }
  if (transaction.status !== "UGOVORI_POTPISANI") {
    throw new IssueInvoiceError("contracts_not_signed");
  }
  if (transaction.nacinPlacanja !== "GOTOVINA") {
    // Cesija (≥10.000 €) je ručni proces izvan appa u MVP-u - vidi CLAUDE.md.
    throw new IssueInvoiceError("cesija_manual_process");
  }

  const ukupniIznos = Number(transaction.dogovorenaCijena) + Number(transaction.proviziaFirme);
  const proviziaFirme = Number(transaction.proviziaFirme);
  const marza = izracunajMarzuPdv({ ukupniIznos, proviziaFirme });

  const cert = loadFiscalCertFromEnv();
  const datumRacuna = new Date();
  const sequenceNumber = (await prisma.invoice.count()) + 1;
  const brojRacuna = `${sequenceNumber}/${cert.oznPP}/${cert.oznNU}`;

  let fiscalResult: { jir: string; zki: string };
  try {
    fiscalResult = await fiscalizeRacun({
      cert,
      brOznRac: String(sequenceNumber),
      datumRacuna,
      uSustavuPdv: true,
      ukupniIznos,
      porez: { vrsta: "R2_MARZA", pdv: marza.pdv, iznosNePodlOpor: marza.iznosNePodlOpor, iznosMarza: marza.iznosMarza },
      nacinPlacanjaCode: nacinPlacanjaCIS(opts.nacinPlacanjaNaziv),
    });
  } catch (err) {
    console.error("Fiskalizacija nije uspjela", err);
    throw new IssueInvoiceError("fiscalization_failed", (err as Error).message);
  }

  const qrKodPodaci = buildFiscalQrUrl(fiscalResult.jir, datumRacuna, ukupniIznos);
  const vehicleOpis = `${transaction.vehicle.marka} ${transaction.vehicle.model ?? ""}`.trim();

  const invoice = await prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.create({
      data: {
        transactionId: transaction.id,
        type: "VOZILO_MARZA",
        status: "FISKALIZIRANO",
        brojRacuna,
        poslovniProstorOznaka: cert.oznPP,
        naplatniUredajOznaka: cert.oznNU,
        ukupanIznos: ukupniIznos,
        pdvIznos: marza.pdv.iznos,
        jir: fiscalResult.jir,
        zki: fiscalResult.zki,
        qrKodPodaci,
        izdanoAt: datumRacuna,
        rokPlacanja: datumRacuna,
        lines: {
          create: [
            {
              opis: vehicleOpis,
              kolicina: 1,
              jedinicnaCijena: ukupniIznos,
              rabatPostotak: 0,
              iznos: ukupniIznos,
            },
          ],
        },
      },
    });

    await tx.transaction.update({
      where: { id: transaction.id },
      data: {
        status: "RACUN_IZDAN",
        ...(opts.stripePayment
          ? {
              stripeCheckoutSessionId: opts.stripePayment.checkoutSessionId,
              stripePaymentIntentId: opts.stripePayment.paymentIntentId,
              proviziaPlacenaAt: opts.stripePayment.placenoAt,
            }
          : {}),
      },
    });

    // Blagajna: gotovina ulazi od kupca i (u istom koraku) izlazi prodavatelju -
    // dva retka, vidi shema napomenu na BlagajnaUnos. Kad je provizija naplaćena
    // karticom (Stripe), taj dio više ne prolazi kroz gotovinsku blagajnu - upisuje
    // se samo iznos koji stvarno prolazi kroz blagajnu (dogovorenaCijena), ne cijeli
    // račun, da blagajnički izvještaj odgovara stvarnom gotovinskom prometu.
    const blagajnaUplataIznos = opts.stripePayment ? Number(transaction.dogovorenaCijena) : ukupniIznos;
    await tx.blagajnaUnos.create({
      data: {
        tip: "UPLATA",
        iznos: blagajnaUplataIznos,
        opis: opts.stripePayment
          ? `Naplata računa ${brojRacuna} od kupca (dio cijene, provizija plaćena karticom preko Stripea)`
          : `Naplata računa ${brojRacuna} od kupca`,
        transactionId: transaction.id,
      },
    });
    await tx.blagajnaUnos.create({
      data: {
        tip: "ISPLATA",
        iznos: transaction.dogovorenaCijena,
        opis: `Isplata prodavatelju za ${vehicleOpis}`,
        transactionId: transaction.id,
      },
    });

    return invoice;
  });

  return { invoiceId: invoice.id, jir: fiscalResult.jir, zki: fiscalResult.zki, brojRacuna };
}
