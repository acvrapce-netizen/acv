import { z } from "zod";

const personSchema = z.object({
  ime: z.string().min(1),
  prezime: z.string().min(1),
  oib: z.string().min(1),
  adresa: z.string().min(1),
  grad: z.string().min(1),
  email: z.string().email(),
  telefon: z.string().min(1),
  // Javni URL-ovi izvorne fotografije osobne iskaznice (Supabase Storage) -
  // pravni trag u admin panelu, vidi CLAUDE.md.
  osobnaPrednjaUrl: z.string().nullable().optional(),
  osobnaStraznjaUrl: z.string().nullable().optional(),
});

const vehicleSchema = z.object({
  vrstaVozila: z.string().min(1),
  marka: z.string().min(1),
  tip: z.string().optional(),
  model: z.string().optional(),
  sasija: z.string().min(1),
  registarskaOznaka: z.string().optional(),
  uPrometuOd: z.string().optional(), // ISO datum string, parsira se u ruti
  godinaProizvodnje: z.number().int(),
  obujamCm3: z.number().int().optional(),
  snagaKw: z.number().int().optional(),
  boja: z.string().optional(),
  prometnaPrednjaUrl: z.string().nullable().optional(),
  prometnaStraznjaUrl: z.string().nullable().optional(),
});

export const intakeSchema = z.object({
  prodavatelj: personSchema,
  kupac: personSchema,
  vehicle: vehicleSchema,
  dogovorenaCijena: z.number().positive(),
  proviziaFirme: z.number().nonnegative(),
});
export type IntakePayload = z.infer<typeof intakeSchema>;
