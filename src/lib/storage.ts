import { createClient } from "@supabase/supabase-js";

const BUCKET = "dokumenti";

function getClient() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("Nedostaju SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env varijable");
  }
  return createClient(url, key);
}

let bucketEnsured = false;

// Bucket se kreira lijeno pri prvom uploadu (idempotentno - ignorira "already
// exists"), umjesto da se pretpostavi da već postoji u Supabase projektu.
async function ensureBucket() {
  if (bucketEnsured) return;
  const supabase = getClient();
  const { error } = await supabase.storage.createBucket(BUCKET, { public: true });
  if (error && !error.message.toLowerCase().includes("already exists")) {
    throw error;
  }
  bucketEnsured = true;
}

// Sprema izvornu fotografiju dokumenta (osobna/prometna) - pravni trag u
// admin panelu, vidi CLAUDE.md. Vraća javni URL.
export async function uploadDocumentImage(
  buffer: Buffer,
  contentType: string,
  pathPrefix: "osobne" | "prometne"
): Promise<string> {
  await ensureBucket();
  const supabase = getClient();
  const ext = contentType.split("/")[1] ?? "jpg";
  const path = `${pathPrefix}/${Date.now()}-${crypto.randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, { contentType });
  if (error) throw error;

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}
