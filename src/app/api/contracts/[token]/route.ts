import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const runtime = "nodejs";

async function findContractByToken(token: string) {
  return prisma.contract.findUnique({
    where: { signingToken: token },
    include: {
      signer: true,
      transaction: {
        include: { vehicle: true, prodavatelj: true, kupac: true },
      },
    },
  });
}

// Mobilni pristup ugovoru preko tokena iz linka - prodavatelj vidi ugovor o
// komisiji, kupac prihvat računa. Ništa se ne mijenja ovim pozivom, samo se
// dohvaća sadržaj za prikaz prije potpisa.
export async function GET(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const contract = await findContractByToken(token);
  if (!contract) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }

  const company = await prisma.companySettings.findFirst({ orderBy: { createdAt: "desc" } });

  return NextResponse.json({
    id: contract.id,
    type: contract.type,
    status: contract.status,
    potpisanoAt: contract.potpisanoAt,
    signer: {
      ime: contract.signer.ime,
      prezime: contract.signer.prezime,
      oib: contract.signer.oib,
      adresa: contract.signer.adresa,
      grad: contract.signer.grad,
    },
    transaction: {
      dogovorenaCijena: contract.transaction.dogovorenaCijena,
      proviziaFirme: contract.transaction.proviziaFirme,
      vehicle: contract.transaction.vehicle,
      prodavatelj: {
        ime: contract.transaction.prodavatelj.ime,
        prezime: contract.transaction.prodavatelj.prezime,
        oib: contract.transaction.prodavatelj.oib,
        adresa: contract.transaction.prodavatelj.adresa,
        grad: contract.transaction.prodavatelj.grad,
      },
      kupac: {
        ime: contract.transaction.kupac.ime,
        prezime: contract.transaction.kupac.prezime,
        oib: contract.transaction.kupac.oib,
        adresa: contract.transaction.kupac.adresa,
        grad: contract.transaction.kupac.grad,
      },
    },
    company,
  });
}

// Potpis - zapisuje potpisanoAt + signatureRef (data URL slike s canvasa),
// pa provjerava je li i DRUGI ugovor iste transakcije već potpisan - ako
// jest, transakcija prelazi u UGOVORI_POTPISANI (čeka fiskalizaciju).
export async function POST(request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const body = await request.json().catch(() => null);
  const signatureRef = typeof body?.signatureRef === "string" ? body.signatureRef : null;
  if (!signatureRef) {
    return NextResponse.json({ error: "signature_required" }, { status: 400 });
  }

  const contract = await findContractByToken(token);
  if (!contract) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (contract.status === "POTPISANO") {
    return NextResponse.json({ error: "already_signed" }, { status: 409 });
  }

  await prisma.$transaction(async (tx) => {
    await tx.contract.update({
      where: { id: contract.id },
      data: { status: "POTPISANO", potpisanoAt: new Date(), signatureRef },
    });

    const siblingSigned = await tx.contract.findFirst({
      where: {
        transactionId: contract.transactionId,
        type: contract.type === "KOMISIJA" ? "PRIHVAT_RACUNA" : "KOMISIJA",
        status: "POTPISANO",
      },
    });
    if (siblingSigned) {
      await tx.transaction.update({
        where: { id: contract.transactionId },
        data: { status: "UGOVORI_POTPISANI" },
      });
    }
  });

  return NextResponse.json({ ok: true });
}
