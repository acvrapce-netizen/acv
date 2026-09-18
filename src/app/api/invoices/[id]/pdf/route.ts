import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderInvoicePdf } from "@/lib/pdf/generate";

export const runtime = "nodejs";

// PDF se generira on-demand iz spremljenih podataka (nema object storage u
// projektu jos - vidi CLAUDE.md stack) - ne persistira se kao datoteka.
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      transaction: { include: { vehicle: true, kupac: true } },
    },
  });
  if (!invoice || !invoice.jir || !invoice.zki || !invoice.qrKodPodaci) {
    return NextResponse.json({ error: "invoice_not_found_or_not_fiscalized" }, { status: 404 });
  }

  const company = await prisma.companySettings.findFirst({ orderBy: { createdAt: "desc" } });
  const { vehicle, kupac } = invoice.transaction;

  const QRCode = (await import("qrcode")).default;
  const qrDataUrl = await QRCode.toDataURL(invoice.qrKodPodaci, { errorCorrectionLevel: "M", margin: 2, width: 256 });

  const pdfBuffer = await renderInvoicePdf({
    company: {
      naziv: company?.naziv ?? "[NAZIV FIRME — TBD]",
      adresa: company?.adresa ?? "[ADRESA FIRME — TBD]",
      oib: company?.oib ?? process.env.FINA_OIB ?? "",
      iban: company?.iban ?? "[IBAN — TBD]",
      email: company?.email ?? null,
      telefon: company?.telefon ?? null,
      mbs: company?.mbs ?? null,
      euid: company?.euid ?? null,
      temeljniKapital: company?.temeljniKapital ? Number(company.temeljniKapital) : null,
      direktor: company?.direktor ?? null,
    },
    izdao: company?.direktor ?? "—",
    brojRacuna: invoice.brojRacuna ?? "—",
    datumVrijeme: invoice.izdanoAt ?? invoice.createdAt,
    kupac: {
      ime: kupac.ime,
      prezime: kupac.prezime,
      adresa: kupac.adresa,
      grad: kupac.grad,
      drzava: kupac.drzava,
      oib: kupac.oib,
    },
    vehicle: {
      marka: vehicle.marka,
      model: vehicle.model,
      tip: vehicle.tip,
      vrstaVozila: vehicle.vrstaVozila,
      godinaProizvodnje: vehicle.godinaProizvodnje,
      sasija: vehicle.sasija,
      obujamCm3: vehicle.obujamCm3,
      snagaKw: vehicle.snagaKw,
      boja: vehicle.boja,
      brojSjedala: vehicle.brojSjedala,
      oblik: vehicle.oblik,
      vrstaMotora: vehicle.vrstaMotora,
      kilometraza: vehicle.kilometraza,
      nosivost: vehicle.nosivost,
      coEmisija: vehicle.coEmisija,
      zemljaPorijekla: vehicle.zemljaPorijekla,
    },
    ukupanIznos: Number(invoice.ukupanIznos),
    jir: invoice.jir,
    zki: invoice.zki,
    qrDataUrl,
    rokPlacanja: invoice.rokPlacanja ?? invoice.createdAt,
    datumIsporuke: invoice.izdanoAt ?? invoice.createdAt,
    nacinPlacanjaLabel: "Novčanice i kovanice",
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="racun-${invoice.brojRacuna?.replace(/\//g, "-")}.pdf"`,
    },
  });
}
