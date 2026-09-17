import { detectDocumentText } from "./vision";
import { PLATE_PATTERN, VIN_PATTERN } from "./patterns";
import type { VehicleDocumentOcrResult } from "../schemas/ocr";

// Prometna dozvola koristi harmonizirane EU šifre polja (isti pristup kao u
// Rent-a-Car Manager projektu, packages/api/src/ocr/extractRegistrationDoc.ts,
// prošireno s dodatnim šiframa koje RaC nije trebao: B, P.1, P.2, R).
//
// Kod mora biti sam na početku retka (uz eventualni razmak) - bez ovog
// sidrišta npr. "A" (registracijska oznaka) bi hvatao bilo koje slovo A
// usred riječi bilo gdje u tekstu.
function matchByCode(text: string, code: string): string | undefined {
  const escaped = code.replace(".", "\\.");
  const pattern = new RegExp(`^\\s*${escaped}\\b[.:\\)]?\\s*[\\r\\n]?\\s*([A-ZČĆŽŠĐ0-9][A-ZČĆŽŠĐa-zčćžšđ0-9\\-.,/\\s]{1,40})`, "m");
  const match = text.match(pattern);
  return match?.[1]?.trim().split(/\s{2,}|[\r\n]/)[0]?.trim();
}

// Vraća tekst KOJI SLIJEDI iza svake pojave šifre polja (ne samo prve) -
// dokumenti često imaju i legendu koja objašnjava svaku šifru, koja bi bila
// lažni prvi pogodak da se gleda samo prvo pojavljivanje.
function findCodeValueWindows(text: string, code: string, windowChars = 150): string[] {
  const escaped = code.replace(".", "\\.");
  const pattern = new RegExp(`^\\s*${escaped}\\b[.:\\)]?\\s*`, "gm");
  const windows: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    const start = match.index + match[0].length;
    windows.push(text.slice(start, start + windowChars));
  }
  return windows;
}

function matchVin(text: string): string | undefined {
  for (const window of findCodeValueWindows(text, "E")) {
    const found = window.match(VIN_PATTERN);
    if (found) return found[0];
  }
  return text.match(VIN_PATTERN)?.[0];
}

function matchLicensePlate(text: string): string | undefined {
  for (const window of findCodeValueWindows(text, "A")) {
    const found = window.match(PLATE_PATTERN);
    if (found) return `${found[1]}${found[2]}${found[3]}`;
  }
  const match = text.match(PLATE_PATTERN);
  if (!match) return undefined;
  return `${match[1]}${match[2]}${match[3]}`;
}

function normalizePlateOrVin(value: string | undefined): string | undefined {
  return value ? value.replace(/[\s-]/g, "").toUpperCase() : undefined;
}

// B = datum prve registracije vozila. Prometna dozvola nema zaseban EU kod za
// "godinu proizvodnje" - datum prve registracije je najbliži dostupan i
// praktični standard koji se koristi za "starost vozila" (isto kako to u
// praksi računa i upravna pristojba, vidi src/lib/upravna-pristojba.ts).
function matchFirstRegistrationDate(text: string): string | undefined {
  const datePattern = /(\d{2})[.\-/](\d{2})[.\-/](\d{4})|(\d{4})-(\d{2})-(\d{2})/;
  for (const window of findCodeValueWindows(text, "B")) {
    const found = window.match(datePattern);
    if (found) return toIsoDate(found);
  }
  const found = text.match(datePattern);
  return found ? toIsoDate(found) : undefined;
}

function toIsoDate(match: RegExpMatchArray): string {
  if (match[4]) return `${match[4]}-${match[5]}-${match[6]}`; // već YYYY-MM-DD
  return `${match[3]}-${match[2]}-${match[1]}`; // DD.MM.YYYY -> YYYY-MM-DD
}

function matchNumericByCode(text: string, code: string): number | undefined {
  for (const window of findCodeValueWindows(text, code)) {
    const found = window.match(/\d+/);
    if (found) return Number(found[0]);
  }
  return undefined;
}

// Prometna dozvola ima dvije strane; ne pretpostavljamo koje je polje na
// kojoj (dizajn varira), pa ova funkcija traži SVE poznate šifre u tekstu
// koji joj se preda. Poziva se zasebno za tekst svake fotografije, a pozivatelj
// (API ruta/forma) spaja rezultate obje strane - vidi merge u ruti.
export function extractVehicleDocumentFields(rawText: string): VehicleDocumentOcrResult {
  const uPrometuOd = matchFirstRegistrationDate(rawText);
  const godinaProizvodnje = uPrometuOd ? Number(uPrometuOd.slice(0, 4)) : undefined;

  return {
    marka: matchByCode(rawText, "D.1"),
    model: matchByCode(rawText, "D.3"),
    sasija: normalizePlateOrVin(matchVin(rawText)),
    registarskaOznaka: normalizePlateOrVin(matchLicensePlate(rawText)),
    uPrometuOd,
    godinaProizvodnje,
    obujamCm3: matchNumericByCode(rawText, "P.1"),
    snagaKw: matchNumericByCode(rawText, "P.2"),
    boja: matchByCode(rawText, "R"),
    rawText,
  };
}

export async function extractVehicleDocumentFromImage(
  imageBuffer: Buffer
): Promise<VehicleDocumentOcrResult> {
  const rawText = await detectDocumentText(imageBuffer);
  return extractVehicleDocumentFields(rawText);
}
