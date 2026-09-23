import { NextResponse } from "next/server";
import { issueVoziloMarzaInvoice, IssueInvoiceError } from "@/lib/invoices/issueVoziloMarzaInvoice";

export const runtime = "nodejs";

// Izdaje fiskalizirani R2-na-maržu račun za transakciju (korak 4 -> 5 CLAUDE.md
// flowa). Jedna Transaction -> jedan VOZILO_MARZA Invoice s JEDNOM InvoiceLine
// (puna cijena koju plaća kupac, bez internog splita vidljivog kupcu - vidi
// napomenu u InvoicePdf.tsx). Ovo je ručni/test put (čisto gotovinski nacin
// plaćanja "G") - od uvođenja Stripe naplate provizije, normalan tok ide kroz
// /api/stripe/webhook (checkout.session.completed -> "O", vidi
// issueVoziloMarzaInvoice.ts), ova ruta ostaje za manualni override/testiranje.
export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const transactionId = typeof body?.transactionId === "string" ? body.transactionId : null;
  if (!transactionId) {
    return NextResponse.json({ error: "transactionId_required" }, { status: 400 });
  }

  try {
    const result = await issueVoziloMarzaInvoice({ transactionId, nacinPlacanjaNaziv: "gotovina" });
    return NextResponse.json(result);
  } catch (err) {
    if (err instanceof IssueInvoiceError) {
      const status: Record<string, number> = {
        transaction_not_found: 404,
        contracts_not_signed: 409,
        cesija_manual_process: 400,
        fiscalization_failed: 502,
      };
      return NextResponse.json({ error: err.code, detail: err.message }, { status: status[err.code] ?? 400 });
    }
    throw err;
  }
}
