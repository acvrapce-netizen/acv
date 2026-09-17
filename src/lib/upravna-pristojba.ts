// Upravna pristojba na prijepis vozila — tarifna tablica.
// Izvor: Uredba o tarifi upravnih pristojbi, Tar. br. 11 (NN 156/22, s ranijim izmjenama
// NN 92/21, 93/21, 95/21; tarifa u eurima od 1.1.2023.) — vidi auto-intermediary-platforma-spec.md.
// Provjeriti važeću uredbu na cvh.hr / porezna-uprava.gov.hr prije produkcijskog lansiranja.

export type VrstaVozila = "automobil" | "motocikl";

interface TarifniRazred {
  maxStarost: number; // gornja granica starosti (uključivo) za koju vrijedi ova tarifa
  tarifa: number; // €/kW (automobil) ili €/cm³ (motocikl)
}

// Poredano rastuće po starosti; zadnji razred je gornja granica nakon koje slijedi izuzeće (oldtimer).
const TARIFA_AUTOMOBIL: TarifniRazred[] = [
  { maxStarost: 1, tarifa: 6.64 },
  { maxStarost: 2, tarifa: 5.97 },
  { maxStarost: 3, tarifa: 5.31 },
  { maxStarost: 4, tarifa: 4.65 },
  { maxStarost: 5, tarifa: 3.98 },
  { maxStarost: 6, tarifa: 3.32 },
  { maxStarost: 7, tarifa: 2.65 },
  { maxStarost: 10, tarifa: 1.99 },
  { maxStarost: 14, tarifa: 1.33 },
  { maxStarost: 18, tarifa: 0.66 },
  { maxStarost: 20, tarifa: 0.4 },
  { maxStarost: 30, tarifa: 0.13 },
];

const TARIFA_MOTOCIKL: TarifniRazred[] = [
  { maxStarost: 1, tarifa: 0.4 },
  { maxStarost: 2, tarifa: 0.37 },
  { maxStarost: 3, tarifa: 0.32 },
  { maxStarost: 4, tarifa: 0.27 },
  { maxStarost: 7, tarifa: 0.21 },
  { maxStarost: 10, tarifa: 0.16 },
  { maxStarost: 14, tarifa: 0.11 },
  { maxStarost: 18, tarifa: 0.05 },
  { maxStarost: 20, tarifa: 0.03 },
  { maxStarost: 30, tarifa: 0.01 },
];

const DE_MINIMIS_PRAG = 1.99; // pristojba ≤ ovaj iznos se ne plaća

export type RazlogIzuzeca =
  | "starije_od_30_godina"
  | "elektricno_vozilo"
  | "de_minimis"
  | null;

export interface UlazKalkulatora {
  vrstaVozila: VrstaVozila;
  godinaProizvodnje: number;
  snagaKw?: number; // za automobil
  obujamCm3?: number; // za motocikl/moped/ATV
  elektricnoVozilo?: boolean;
  godinaTrenutna?: number; // default = tekuća godina, injektabilno radi testiranja
}

export interface RezultatKalkulatora {
  starostGodina: number;
  tarifa: number | null; // null ako izuzeto prije primjene tarife
  pristojbaP2P: number; // iznos koji bi se platio kod izravne kupoprodaje između privatnih osoba
  pristojbaKrozPlatformu: 0; // uvijek 0 — firma primjenjuje poseban postupak oporezivanja marže
  usteda: number;
  izuzeto: boolean;
  razlogIzuzeca: RazlogIzuzeca;
}

function nadjiTarifu(starost: number, tablica: TarifniRazred[]): number | null {
  if (starost > 30) return null; // oldtimer, izuzeto
  for (const razred of tablica) {
    if (starost <= razred.maxStarost) return razred.tarifa;
  }
  return null;
}

export function izracunajUstedu(ulaz: UlazKalkulatora): RezultatKalkulatora {
  const tekucaGodina = ulaz.godinaTrenutna ?? new Date().getFullYear();
  const starostGodina = Math.max(0, tekucaGodina - ulaz.godinaProizvodnje);

  if (starostGodina > 30) {
    return {
      starostGodina,
      tarifa: null,
      pristojbaP2P: 0,
      pristojbaKrozPlatformu: 0,
      usteda: 0,
      izuzeto: true,
      razlogIzuzeca: "starije_od_30_godina",
    };
  }

  if (ulaz.elektricnoVozilo) {
    return {
      starostGodina,
      tarifa: null,
      pristojbaP2P: 0,
      pristojbaKrozPlatformu: 0,
      usteda: 0,
      izuzeto: true,
      razlogIzuzeca: "elektricno_vozilo",
    };
  }

  const tablica = ulaz.vrstaVozila === "automobil" ? TARIFA_AUTOMOBIL : TARIFA_MOTOCIKL;
  const osnovica = ulaz.vrstaVozila === "automobil" ? ulaz.snagaKw ?? 0 : ulaz.obujamCm3 ?? 0;

  const tarifa = nadjiTarifu(starostGodina, tablica);
  if (tarifa === null) {
    return {
      starostGodina,
      tarifa: null,
      pristojbaP2P: 0,
      pristojbaKrozPlatformu: 0,
      usteda: 0,
      izuzeto: true,
      razlogIzuzeca: "starije_od_30_godina",
    };
  }

  const pristojbaSirova = tarifa * osnovica;

  if (pristojbaSirova <= DE_MINIMIS_PRAG) {
    return {
      starostGodina,
      tarifa,
      pristojbaP2P: 0,
      pristojbaKrozPlatformu: 0,
      usteda: 0,
      izuzeto: true,
      razlogIzuzeca: "de_minimis",
    };
  }

  const pristojbaP2P = Math.round(pristojbaSirova * 100) / 100;

  return {
    starostGodina,
    tarifa,
    pristojbaP2P,
    pristojbaKrozPlatformu: 0,
    usteda: pristojbaP2P,
    izuzeto: false,
    razlogIzuzeca: null,
  };
}
