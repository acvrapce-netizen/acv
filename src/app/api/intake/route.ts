import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { intakeSchema } from "@/lib/schemas/intake";

export const runtime = "nodejs";

// Kreira prodavatelja, kupca, vozilo i transakciju iz forme "unos podataka"
// (korak 3 CLAUDE.md flowa). Svi podaci koje je korisnik unio su već
// pregledani/ispravljeni (OCR je bio samo prijedlog) - ovdje se samo
// persistira.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = intakeSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_payload", details: parsed.error.flatten() }, { status: 400 });
  }
  const { prodavatelj, kupac, vehicle, dogovorenaCijena, proviziaFirme } = parsed.data;

  try {
    const result = await prisma.$transaction(async (tx) => {
      const prodavateljRow = await tx.person.create({ data: prodavatelj });
      const kupacRow = await tx.person.create({ data: kupac });
      const vehicleRow = await tx.vehicle.create({
        data: {
          ...vehicle,
          uPrometuOd: vehicle.uPrometuOd ? new Date(vehicle.uPrometuOd) : undefined,
          vlasnikId: prodavateljRow.id,
        },
      });
      const transactionRow = await tx.transaction.create({
        data: {
          prodavateljId: prodavateljRow.id,
          kupacId: kupacRow.id,
          vehicleId: vehicleRow.id,
          dogovorenaCijena,
          proviziaFirme,
          status: "PODACI_UNESENI",
        },
      });
      return { prodavateljRow, kupacRow, vehicleRow, transactionRow };
    });

    return NextResponse.json({ transactionId: result.transactionRow.id });
  } catch (err) {
    console.error("Intake create failed", err);
    return NextResponse.json({ error: "create_failed" }, { status: 500 });
  }
}
