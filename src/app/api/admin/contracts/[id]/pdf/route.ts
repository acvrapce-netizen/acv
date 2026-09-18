import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { renderContractPdf } from "@/lib/pdf/generate";
import { buildKomisijaParagraphs, buildPrihvatRacunaParagraphs } from "@/lib/contracts/templates";

export const runtime = "nodejs";

const TITLES: Record<string, string> = {
  KOMISIJA: "Ugovor o komisiji",
  PRIHVAT_RACUNA: "Prihvat računa",
};

// Admin pregled potpisanog ugovora kao PDF (po Contract.id, ne po signingToken -
// ta ruta je za mobilni potpisni link, ova je za detalj transakcije u adminu).
export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const contract = await prisma.contract.findUnique({
    where: { id },
    include: {
      signer: true,
      transaction: { include: { vehicle: true, prodavatelj: true, kupac: true, invoices: true } },
    },
  });
  if (!contract) {
    return NextResponse.json({ error: "contract_not_found" }, { status: 404 });
  }

  const company = await prisma.companySettings.findFirst({ orderBy: { createdAt: "desc" } });
  const { transaction } = contract;
  const dogovorenaCijena = Number(transaction.dogovorenaCijena);
  const proviziaFirme = Number(transaction.proviziaFirme);
  const datum = contract.potpisanoAt ?? contract.createdAt;

  const paragraphs =
    contract.type === "KOMISIJA"
      ? buildKomisijaParagraphs({
          datum,
          company: company ? { naziv: company.naziv, oib: company.oib, adresa: company.adresa } : null,
          komitent: contract.signer,
          kupac: transaction.kupac,
          vehicle: {
            ...transaction.vehicle,
            uPrometuOd: transaction.vehicle.uPrometuOd
              ? transaction.vehicle.uPrometuOd.toLocaleDateString("hr-HR", {
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })
              : null,
          },
          dogovorenaCijena,
          proviziaFirme,
        })
      : buildPrihvatRacunaParagraphs({
          datum,
          kupac: contract.signer,
          vehicle: transaction.vehicle,
          brojRacuna: transaction.invoices[0]?.brojRacuna ?? null,
          ukupanIznos: dogovorenaCijena + proviziaFirme,
        });

  const pdfBuffer = await renderContractPdf({
    title: TITLES[contract.type],
    paragraphs,
    signerName: `${contract.signer.ime} ${contract.signer.prezime}`,
    signatureDataUrl: contract.signatureRef,
    potpisanoAt: contract.potpisanoAt,
  });

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${contract.type.toLowerCase()}-${contract.id}.pdf"`,
    },
  });
}
