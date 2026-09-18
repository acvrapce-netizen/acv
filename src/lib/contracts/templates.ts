// Tekst ugovora - odobren nacrt (vidi razgovor), NE mijenjati formulacije bez
// potvrde. Koristi se i na /potpis/[token] stranici i (kasnije) za PDF.
//
// Broj članka ZOO-a za ugovor o komisiji namjerno NIJE naveden - čeka
// potvrdu od Branimira, ne nagađati.

export interface CompanyInfo {
  naziv: string;
  oib: string;
  adresa: string;
}

export interface PersonInfo {
  ime: string;
  prezime: string;
  oib: string;
  adresa: string;
}

export interface VehicleInfo {
  marka: string;
  model: string | null;
  uPrometuOd: string | null;
  sasija: string;
  registarskaOznaka: string | null;
}

const PLACEHOLDER_COMPANY: CompanyInfo = {
  naziv: "[NAZIV FIRME — TBD, vidi CompanySettings]",
  oib: "[OIB FIRME — TBD]",
  adresa: "[ADRESA FIRME — TBD]",
};

// Mjesto sklapanja / mjesna nadležnost - CompanySettings nema zaseban "grad"
// field, a stvarna firma još nema adresu (TBD). Zagreb je isti default kao u
// primjerku KUPOPRODAJNI-UGOVOR.pdf - promijeniti kad firma ima stalnu adresu.
const DEFAULT_MJESTO = "Zagrebu";

// hr-HR lokal već ispisuje datum s završnom točkom (npr. "18. 09. 2026.").
function formatDateHr(date: Date): string {
  return date.toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function formatEur(value: number): string {
  return new Intl.NumberFormat("hr-HR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value) + " €";
}

export interface KomisijaTemplateData {
  datum: Date;
  company: CompanyInfo | null;
  komitent: PersonInfo; // prodavatelj (potpisnik)
  kupac: Pick<PersonInfo, "ime" | "prezime" | "oib">;
  vehicle: VehicleInfo;
  dogovorenaCijena: number;
  proviziaFirme: number;
}

export function buildKomisijaParagraphs(data: KomisijaTemplateData): string[] {
  const company = data.company ?? PLACEHOLDER_COMPANY;
  const ukupno = data.dogovorenaCijena + data.proviziaFirme;
  const v = data.vehicle;

  return [
    "UGOVOR O KOMISIJI ZA PRODAJU MOTORNOG VOZILA",

    `sklopljen dana ${formatDateHr(data.datum)} u ${DEFAULT_MJESTO} između:\n\n` +
      `${company.naziv}, OIB: ${company.oib}, ${company.adresa} (u daljnjem tekstu: Komisionar)\n\n` +
      `i\n\n` +
      `${data.komitent.ime} ${data.komitent.prezime}, OIB: ${data.komitent.oib}, ${data.komitent.adresa} (u daljnjem tekstu: Komitent)`,

    `Čl. 1. Predmet ugovora. Komitent predaje Komisionaru na prodaju motorno vozilo opisano u čl. 2., a Komisionar se obvezuje prodati ga u svoje ime, a za račun Komitenta, kupcu ${data.kupac.ime} ${data.kupac.prezime}, OIB: ${data.kupac.oib}, po cijeni iz čl. 3.`,

    `Čl. 2. Vozilo. Marka: ${v.marka}, model: ${v.model ?? "—"}, u prometu od: ${v.uPrometuOd ?? "—"}, broj šasije: ${v.sasija}, registarska oznaka: ${v.registarskaOznaka ?? "—"}.`,

    `Čl. 3. Cijena. Dogovorena prodajna cijena vozila, koju Komisionar u cijelosti isplaćuje Komitentu, iznosi ${formatEur(data.dogovorenaCijena)}. Kupac plaća Komisionaru ukupni iznos od ${formatEur(ukupno)} — dogovorena cijena uvećana za proviziju Komisionara u iznosu od ${formatEur(data.proviziaFirme)} (uvećano za PDV obračunat na proviziju sukladno čl. 95. st. 2. ZOPDV-a). Ukupan iznos koji plaća kupac iskazan je na fiskaliziranom računu iz čl. 7.`,

    `Čl. 4. Jamstvo. Komitent jamči da je vozilo njegovo vlasništvo te da nije opterećeno ovrhom, zabilježbom ili drugim teretom u korist treće osobe.`,

    `Čl. 4a. Odgovornost Komitenta prema Komisionaru. Komitent jamči da su svi podaci o vozilu koje je dao Komisionaru (stanje kilometraže, tehnički podaci, povijest servisiranja, eventualne prometne nezgode i štete) točni i potpuni, te da mu u trenutku sklapanja ovog ugovora nisu poznati nikakvi skriveni nedostaci vozila koje nije prijavio Komisionaru.\n\n` +
      `Ako Komisionar, sukladno propisima o zaštiti potrošača, bude obvezan kupcu odgovarati za materijalni nedostatak vozila koji je postojao u trenutku predaje vozila kupcu, a taj nedostatak Komitent nije prijavio Komisionaru prije sklapanja ovog ugovora, ili proizlazi iz netočnih ili nepotpunih podataka koje je dao Komitent, Komitent se obvezuje u cijelosti nadoknaditi Komisionaru sve troškove i štetu koje je Komisionar morao snositi po toj osnovi (popravak, sniženje cijene, raskid i povrat isplaćene cijene, sudski i ostali troškovi). Komisionar ovo pravo regresa može ostvariti sudskim putem protiv Komitenta, neovisno o ishodu spora s kupcem.`,

    `Čl. 5. Stanje vozila. Vozilo se prodaje u viđenom stanju. Komisionar ne odgovara za stanje, nedostatke ili svojstva vozila, budući da ga nije imao u posjedu niti ga je pregledao — vozilo je pregledao i prihvatio kupac, o čemu kupac daje zasebnu izjavu (Prihvat računa).`,

    `Čl. 6. Predaja vozila. Vozilo se predaje izravno kupcu, po zaključenju ovog ugovora i uplati cijene. Uz vozilo se predaje: prometna dozvola, registarske pločice, ključevi.`,

    `Čl. 7. Ovlaštenje za izdavanje računa. Komitent ovlašćuje Komisionara da kupcu izda fiskalizirani račun na iznos iz čl. 3., sukladno posebnom postupku oporezivanja marže (čl. 95. st. 2. ZOPDV-a).`,

    `Čl. 8. Nadležnost. U slučaju spora, ugovorne strane prihvaćaju mjesnu nadležnost suda u ${DEFAULT_MJESTO}.`,

    `Komitent: ______________          Komisionar (${company.naziv}): ______________`,
  ];
}

export interface PrihvatRacunaTemplateData {
  datum: Date;
  kupac: Pick<PersonInfo, "ime" | "prezime" | "oib">;
  vehicle: Pick<VehicleInfo, "marka" | "model" | "registarskaOznaka">;
  brojRacuna: string | null;
  ukupanIznos: number;
}

export function buildPrihvatRacunaParagraphs(data: PrihvatRacunaTemplateData): string[] {
  const v = data.vehicle;
  const brojRacuna = data.brojRacuna ?? "(dodjeljuje se pri izdavanju računa)";

  return [
    "PRIHVAT RAČUNA I VOZILA",

    `Ja, ${data.kupac.ime} ${data.kupac.prezime}, OIB: ${data.kupac.oib}, potvrđujem da sam primio/la vozilo ${v.marka} ${v.model ?? ""}, reg. oznaka ${v.registarskaOznaka ?? "—"}, te račun br. ${brojRacuna} na iznos ${formatEur(data.ukupanIznos)}.`,

    `Vozilo sam osobno pregledao/la prije kupnje. Kupnja se obavlja po sustavu viđeno-kupljeno, uz napomenu da sukladno zakonu prodavatelj (Komisionar) odgovara za materijalne nedostatke vozila koji su postojali u trenutku predaje, u opsegu propisanom za prodaju rabljene robe potrošaču (rok odgovornosti skraćen na 1 godinu od predaje, prijava skrivenog nedostatka najkasnije 2 mjeseca od otkrića). Registarske pločice ostaju meni.`,

    `Sukladno čl. 95. st. 2. Zakona o PDV-u, na računu je primijenjen poseban postupak oporezivanja marže te PDV nije iskazan kao zasebna stavka.`,

    `Datum: ${formatDateHr(data.datum)}          Potpis kupca: ______________`,
  ];
}
