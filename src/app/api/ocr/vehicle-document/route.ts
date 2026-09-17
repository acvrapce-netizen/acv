import { NextResponse } from "next/server";
import { extractVehicleDocumentFromImage } from "@/lib/ocr/extractVehicleDocument";

export const runtime = "nodejs";

// Fotografija prometne dozvole (bilo koja strana - ne pretpostavlja se
// raspored polja). Ne sprema ništa, samo vraća prijedlog polja za prefill -
// korisnik uvijek pregleda/ispravlja prije submita forme (pravni dokument).
export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "file_required" }, { status: 400 });
  }
  if (file.type === "application/pdf") {
    return NextResponse.json({ error: "pdf_not_supported" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  try {
    const result = await extractVehicleDocumentFromImage(buffer);
    return NextResponse.json(result);
  } catch (err) {
    console.error("OCR extraction failed (vehicle-document)", err);
    return NextResponse.json({ error: "ocr_failed" }, { status: 502 });
  }
}
