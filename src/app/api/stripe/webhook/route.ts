import { NextResponse } from "next/server";
import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { getStripe } from "@/lib/stripe";
import { issueVoziloMarzaInvoice, IssueInvoiceError } from "@/lib/invoices/issueVoziloMarzaInvoice";

export const runtime = "nodejs";

// Stripe webhook - jedini okidač izdavanja fiskaliziranog računa za GOTOVINA
// transakcije nakon naplate provizije karticom (dogovoreno u PROGRESS.md).
// Sirov body + potpis su obavezni za stripe.webhooks.constructEvent, zato NE
// koristimo request.json() ovdje.
export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!signature || !webhookSecret) {
    return NextResponse.json({ error: "webhook_not_configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = getStripe().webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    console.error("Stripe webhook - neispravan potpis", err);
    return NextResponse.json({ error: "invalid_signature" }, { status: 400 });
  }

  if (event.type !== "checkout.session.completed") {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object as Stripe.Checkout.Session;
  const transactionId = session.metadata?.transactionId ?? session.client_reference_id;
  if (!transactionId) {
    console.error("Stripe webhook - checkout.session.completed bez transactionId", session.id);
    return NextResponse.json({ error: "missing_transaction_id" }, { status: 400 });
  }

  // Idempotencija - Stripe zna retryati webhookove, a admin/kupac ne smiju
  // dobiti drugi fiskalizirani račun za istu uplatu.
  const transaction = await prisma.transaction.findUnique({ where: { id: transactionId } });
  if (!transaction) {
    console.error("Stripe webhook - transakcija ne postoji", transactionId);
    return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
  }
  if (transaction.proviziaPlacenaAt) {
    return NextResponse.json({ received: true, note: "already_processed" });
  }

  try {
    const result = await issueVoziloMarzaInvoice({
      transactionId,
      nacinPlacanjaNaziv: "ostalo",
      stripePayment: {
        checkoutSessionId: session.id,
        paymentIntentId: typeof session.payment_intent === "string" ? session.payment_intent : null,
        placenoAt: new Date(),
      },
    });
    console.log("Stripe webhook - račun izdan nakon naplate provizije", result.brojRacuna, transactionId);
  } catch (err) {
    if (err instanceof IssueInvoiceError) {
      console.error("Stripe webhook - izdavanje računa nije uspjelo", err.code, transactionId);
      // 500 da Stripe pokuša ponovno (moguće privremena CIS greška).
      return NextResponse.json({ error: err.code }, { status: 500 });
    }
    console.error("Stripe webhook - neočekivana greška", err);
    return NextResponse.json({ error: "unknown_error" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
