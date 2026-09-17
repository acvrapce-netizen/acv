import { detectDocumentText } from "./vision";
import { isValidOib, OIB_PATTERN } from "./patterns";
import type { PersonalIdOcrResult } from "../schemas/ocr";

// Hrvatska osobna iskaznica (eOI) - nov rad, nema postojećeg porta (za razliku
// od prometne dozvole). Prednja strana: ime, prezime, OIB. Stražnja strana:
// prebivalište/adresa + MRZ (strojno čitljiva zona). Ne pretpostavljamo koja
// je fotografija koja strana - funkcija traži sve poznate oznake u tekstu koji
// joj se preda, a pozivatelj (API ruta) spaja rezultate obje fotografije.

// Naslovi polja su dvojezični (hrvatski/engleski) na eOI - tražimo oboje.
function matchByLabel(text: string, labels: string[]): string | undefined {
  for (const label of labels) {
    const pattern = new RegExp(`${label}[:\\s]*[\\r\\n]?\\s*([A-ZČĆŽŠĐ][A-ZČĆŽŠĐ'\\-\\s]{1,60})`, "i");
    const match = text.match(pattern);
    const value = match?.[1]?.trim().split(/[\r\n]/)[0]?.trim();
    if (value) return value;
  }
  return undefined;
}

// Adresa je obično duža i može sadržavati brojeve (kućni broj, poštanski
// broj) - zaseban, širi regex od matchByLabel (koji cilja samo slovne
// vrijednosti kao ime/prezime).
function matchAddress(text: string): string | undefined {
  const labels = ["PREBIVALIŠTE I ADRESA", "RESIDENCE AND ADDRESS", "PREBIVALIŠTE", "ADRESA"];
  for (const label of labels) {
    const pattern = new RegExp(`${label}[:\\s]*[\\r\\n]?\\s*([A-ZČĆŽŠĐ0-9][A-ZČĆŽŠĐa-zčćžšđ0-9.,\\-/\\s]{3,80})`, "i");
    const match = text.match(pattern);
    const value = match?.[1]?.trim().split(/[\r\n]/)[0]?.trim();
    if (value) return value;
  }
  return undefined;
}

// OIB - traži SVE 11-znamenkaste sekvence u tekstu (može ih biti više: OIB,
// broj dokumenta, JMBG na starijim ispravama...) i vraća prvu koja prolazi
// ISO 7064 checksum - bez ove validacije OCR bi lako ponudio krivi broj kao
// OIB.
function matchOib(text: string): string | undefined {
  const matches = text.match(new RegExp(OIB_PATTERN, "g")) ?? [];
  return matches.find(isValidOib);
}

// MRZ (strojno čitljiva zona, ICAO 9303 TD1 format) - treći redak je
// "PREZIME<<IME<<<<..." - koristi se kao fallback ako label-based
// ekstrakcija ne uspije (npr. fotografirana samo stražnja strana s MRZ-om,
// bez vizualnih labela na toj strani u kadru).
function matchFromMrz(text: string): { ime?: string; prezime?: string } {
  const mrzLine = text.match(/^[A-Z<]{20,30}$/m)?.[0];
  if (!mrzLine || !mrzLine.includes("<<")) return {};
  const [prezimeRaw, imeRaw] = mrzLine.split("<<");
  const prezime = prezimeRaw?.replace(/</g, " ").trim();
  const ime = imeRaw?.replace(/</g, " ").trim();
  return {
    prezime: prezime || undefined,
    ime: ime || undefined,
  };
}

export function extractPersonalIdFields(rawText: string): PersonalIdOcrResult {
  const fromMrz = matchFromMrz(rawText);

  return {
    ime: matchByLabel(rawText, ["IME", "GIVEN NAME\\(S\\)"]) ?? fromMrz.ime,
    prezime: matchByLabel(rawText, ["PREZIME", "SURNAME"]) ?? fromMrz.prezime,
    oib: matchOib(rawText),
    adresa: matchAddress(rawText),
    rawText,
  };
}

export async function extractPersonalIdFromImage(imageBuffer: Buffer): Promise<PersonalIdOcrResult> {
  const rawText = await detectDocumentText(imageBuffer);
  return extractPersonalIdFields(rawText);
}
