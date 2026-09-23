import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";

export const runtime = "nodejs";

// Kreira Stripe Checkout Session za naplatu provizije firme (100 €, kartica) -
// nudi se kupcu nakon što potpiše Prihvat računa I nakon što je i prodavatelj
// potpisao ugovor o komisiji (Transaction.status === UGOVORI_POTPISANI). Samo
// GOTOVINA transakcije u ovom MVP koraku - CESIJA (≥10.000 €) ostaje ručni
// proces izvan appa (CLAUDE.md), fiskalizacija za taj slučaj nije još automatizirana
// pa nema smisla naplaćivati proviziju karticom prije nego to postoji.
export async function POST(_request: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;

  const contract = await prisma.contract.findUnique({
    where: { signingToken: token },
    include: { transaction: { include: { vehicle: true, invoices: true } } },
  });
  if (!contract) {
    return NextResponse.json({ error: "invalid_token" }, { status: 404 });
  }
  if (contract.type !== "PRIHVAT_RACUNA") {
    return NextResponse.json({ error: "wrong_contract_type" }, { status: 400 });
  }

  const { transaction } = contract;
  if (transaction.status !== "UGOVORI_POTPISANI") {
    return NextResponse.json({ error: "contracts_not_signed" }, { status: 409 });
  }
  if (transaction.nacinPlacanja !== "GOTOVINA") {
    return NextResponse.json({ error: "cesija_manual_process" }, { status: 400 });
  }
  if (transaction.proviziaPlacenaAt || transaction.invoices.length > 0) {
    return NextResponse.json({ error: "already_paid" }, { status: 409 });
  }

  const origin = new URL(_request.url).origin;
  const vehicleOpis = `${transaction.vehicle.marka} ${transaction.vehicle.model ?? ""}`.trim();

  const session = await getStripe().checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: "eur",
          unit_amount: Math.round(Number(transaction.proviziaFirme) * 100),
          product_data: {
            name: "Provizija za posredovanje kupoprodaje vozila",
            description: vehicleOpis || undefined,
          },
        },
        quantity: 1,
      },
    ],
    client_reference_id: transaction.id,
    metadata: { transactionId: transaction.id },
    success_url: `${origin}/potpis/${token}?placanje=uspjesno`,
    cancel_url: `${origin}/potpis/${token}?placanje=otkazano`,
  });

  await prisma.transaction.update({
    where: { id: transaction.id },
    data: { stripeCheckoutSessionId: session.id },
  });

  return NextResponse.json({ url: session.url });
}
