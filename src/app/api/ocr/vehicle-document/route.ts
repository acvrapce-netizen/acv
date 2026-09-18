import { NextResponse } from "next/server";
import { extractVehicleDocumentFromImage } from "@/lib/ocr/extractVehicleDocument";
import { uploadDocumentImage } from "@/lib/storage";

export const runtime = "nodejs";

// Fotografija prometne dozvole (bilo koja strana - ne pretpostavlja se
// raspored polja). Vraća prijedlog polja za prefill (korisnik uvijek
// pregleda/ispravlja prije submita forme - pravni dokument) + javni URL
// izvorne slike (Supabase Storage), spremljene radi pravnog traga u admin
// panelu.
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
    const [result, imageUrl] = await Promise.all([
      extractVehicleDocumentFromImage(buffer),
      uploadDocumentImage(buffer, file.type, "prometne").catch((err) => {
        console.error("Document image upload failed (vehicle-document)", err);
        return null;
      }),
    ]);
    return NextResponse.json({ ...result, imageUrl });
  } catch (err) {
    console.error("OCR extraction failed (vehicle-document)", err);
    return NextResponse.json({ error: "ocr_failed" }, { status: 502 });
  }
}
