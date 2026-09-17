// Zajednički regex obrasci za OCR ekstrakciju vozila/osobnih dokumenata.
// VIN_PATTERN i PLATE_PATTERN portani iz Rent-a-Car Manager projekta
// (packages/api/src/ocr/patterns.ts) — identična validacija formata.

// VIN/broj šasije - 17 znakova, bez I/O/Q (ISO 3779).
export const VIN_PATTERN = /\b[A-HJ-NPR-Z0-9]{17}\b/;

// Hrvatska registarska oznaka - dva slova (oznaka županije) + 3-4 znamenke
// + 1-2 slova, s opcionalnim razmakom/crticom (npr. "ZG 1234 AB",
// "ZG1234AB", "ZG 1278-JI").
export const PLATE_PATTERN = /\b([A-Z]{2})[\s-]?(\d{3,4})[\s-]?([A-Z]{1,2})\b/;

// OIB - 11 znamenki. Sam format je nužan ali ne dovoljan uvjet (vidi
// isValidOib za ISO 7064 MOD 11-10 checksum) - OCR često pogodi neku drugu
// 11-znamenkastu sekvencu (npr. dio broja dokumenta) pa je checksum bitan
// filter prije nego se vrijednost ponudi kao prijedlog.
export const OIB_PATTERN = /\b\d{11}\b/;

// ISO 7064 MOD 11-10 - algoritam kojim je stvarno definiran hrvatski OIB.
export function isValidOib(oib: string): boolean {
  if (!/^\d{11}$/.test(oib)) return false;
  let remainder = 10;
  for (let i = 0; i < 10; i++) {
    remainder = (remainder + Number(oib[i])) % 10;
    remainder = remainder === 0 ? 10 : remainder;
    remainder = (remainder * 2) % 11;
  }
  const checkDigit = (11 - remainder) % 10;
  return checkDigit === Number(oib[10]);
}
