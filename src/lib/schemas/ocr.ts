import { z } from "zod";

// Prijedlog polja s prometne dozvole - nazivi polja 1:1 prema Prisma Vehicle
// modelu (prisma/schema.prisma), ne izmišljati nova imena. Rezultat je uvijek
// samo PREFILL prijedlog - korisnik pregleda/ispravlja prije spremanja.
export const vehicleDocumentOcrResultSchema = z.object({
  marka: z.string().optional(),
  model: z.string().optional(),
  sasija: z.string().optional(),
  registarskaOznaka: z.string().optional(),
  uPrometuOd: z.string().optional(), // ISO datum (YYYY-MM-DD), string radi jednostavnog prikaza/izmjene u formi
  godinaProizvodnje: z.number().optional(), // izvedeno iz godine u uPrometuOd (datum prve registracije) - najbliži dostupan podatak na prometnoj
  obujamCm3: z.number().optional(),
  snagaKw: z.number().optional(),
  boja: z.string().optional(),
  rawText: z.string(),
});
export type VehicleDocumentOcrResult = z.infer<typeof vehicleDocumentOcrResultSchema>;

// Prijedlog polja s osobne iskaznice - nazivi polja 1:1 prema Prisma Person
// modelu. Email/telefon nisu na iskaznici, unose se ručno.
export const personalIdOcrResultSchema = z.object({
  ime: z.string().optional(),
  prezime: z.string().optional(),
  oib: z.string().optional(),
  adresa: z.string().optional(),
  rawText: z.string(),
});
export type PersonalIdOcrResult = z.infer<typeof personalIdOcrResultSchema>;
