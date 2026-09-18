import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { loadFiscalCertFromEnv } from "@/lib/fiscalization/cert";
import { fiscalizeRacun, izracunajMarzuPdv, nacinPlacanjaCIS, buildFiscalQrUrl } from "@/lib/fiscalization/engine";

export const runtime = "nodejs";

// Izdaje fiskalizirani R2-na-maržu račun za transakciju (korak 4 -> 5 CLAUDE.md
// flowa). Jedna Transaction -> jedan VOZILO_MARZA Invoice s JEDNOM InvoiceLine
// (puna cijena koju plaća kupac, bez internog splita vidljivog kupcu - vidi
// napomenu u InvoicePdf.tsx).
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId_required" }, { status: 400 });
  }

  const transaction = await prisma.transaction.findUnique({
    where: { id: transactionId },
    include: { vehicle: true, prodavatelj: true, kupac: true },
  });
  if (!transaction) {
    return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
  }
  if (transaction.status !== "UGOVORI_POTPISANI") {
    return NextResponse.json({ error: "contracts_not_signed" }, { status: 409 });
  }
  if (transaction.nacinPlacanja !== "GOTOVINA") {
    // Cesija (≥10.000 €) je ručni proces izvan appa u MVP-u - vidi CLAUDE.md.
    return NextResponse.json({ error: "cesija_manual_process" }, { status: 400 });
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
      nacinPlacanjaCode: nacinPlacanjaCIS("gotovina"),
    });
  } catch (err) {
    console.error("Fiskalizacija nije uspjela", err);
    return NextResponse.json({ error: "fiscalization_failed", detail: (err as Error).message }, { status: 502 });
  }

  const qrKodPodaci = buildFiscalQrUrl(fiscalResult.jir, datumRacuna, ukupniIznos);
  const vehicleOpis = `${transaction.vehicle.marka} ${transaction.vehicle.model ?? ""}`.trim();

  const result = await prisma.$transaction(async (tx) => {
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
      data: { status: "RACUN_IZDAN" },
    });

    // Blagajna: gotovina ulazi od kupca i (u istom koraku) izlazi prodavatelju -
    // dva retka, vidi shema napomenu na BlagajnaUnos.
    await tx.blagajnaUnos.create({
      data: {
        tip: "UPLATA",
        iznos: ukupniIznos,
        opis: `Naplata računa ${brojRacuna} od kupca`,
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

  return NextResponse.json({ invoiceId: result.id, jir: fiscalResult.jir, zki: fiscalResult.zki, brojRacuna });
}
