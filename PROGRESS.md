# Auto Intermediary Platforma — Progress Log

Dinamički log stanja projekta. Ažurira se na kraju svake veće cjeline/sesije.
Za statičnu arhitekturu/konvencije/poslovna pravila vidi [CLAUDE.md](CLAUDE.md)
i [auto-intermediary-platforma-spec.md](auto-intermediary-platforma-spec.md) —
ovaj dokument je "što je gotovo i zašto", ne "kako treba izgledati".

**Zadnje ažurirano:** 2026-09-23 — inicijalni PROGRESS.md, retroaktivan sažetak
svega odrađenog do sad (git log ima puni detalj po commitu, ovo je čitljiv
pregled). Nema remote/push još — sve je lokalno u `master` grani.

## Status po MVP koracima (CLAUDE.md prioritet)

1. **Kalkulator uštede** — GOTOVO
2. **Unos podataka (prodavatelj/kupac/vozilo, OCR)** — GOTOVO
3. **Dvosmjerni signing flow** — GOTOVO (tekst ugovora odobren i ugrađen)
4. **Fiskalizirani račun na maržu** — GOTOVO (živi JIR sa cistesta)
5. **Baza korisnika/vozila + admin panel** — GOTOVO (dashboard, blagajna,
   dokument trail)

Van MVP-a (namjerno stub/ručno, po CLAUDE.md): cesija automatizacija,
carVertical API integracija, garancija (osim wa.me linka), marketing opt-in.
Ništa od ovoga nije dirano.

---

## 1) Kalkulator uštede

`src/lib/upravna-pristojba.ts` + `src/components/SavingsCalculator.tsx` na
landing pageu (`/`). Statična tarifna tablica 1:1 iz spec.md (automobil €/kW,
motocikl/moped/ATV €/cm³), izuzeća (starije od 30g, električno, de-minimis
≤1,99€). Bez baze, čista frontend logika. Testirano uživo u browseru za sve
grane (standardni izračun, izuzeća, oba tipa vozila).

## 2) Data model + unos podataka

Prisma shema (`prisma/schema.prisma`): `CompanySettings`, `Person`,
`Vehicle`, `Transaction`, `Contract`, `Invoice`/`InvoiceLine`,
`BlagajnaUnos`. Supabase/Postgres, pooler za runtime + direktna konekcija za
migracije (PgBouncer transaction-mode ne podržava prepared statements koje
migracije trebaju — vidi commit `95773e3`).

**OCR** (`src/lib/ocr/`) portan iz Rent-a-Car Manager projekta (Google
Vision REST, RSA rabljen samo za fiskalizaciju ne OCR — ne miješati):
`vision.ts`/`patterns.ts` portano doslovno, `extractVehicleDocument.ts`
prošireno s poljima koje RaC nije trebao (godina, kW, cm³, boja preko EU
harmoniziranih šifri B/P.1/P.2/R), `extractPersonalId.ts` je nov rad (nema
prijašnjeg porta) — label-based ekstrakcija + MRZ fallback, OIB ISO 7064
checksum validacija.

Testirano protiv **pravih skenova** korisnikove osobne/prometne (ne samo
sintetičkih) — otkriveni i popravljeni pravi bugovi: bilingvalni label na
iskaznici ("PREZIME/SURNAME") hvatao je englesku riječ kao vrijednost umjesto
pravog podatka na sljedećem retku; `matchByCode` na prometnoj znao uhvatiti
legendu umjesto vrijednosti (sad odbacuje tekst koji izgleda kao opis polja);
uklonjen opasan "bilo koji datum u dokumentu" fallback za datum prve
registracije (prometna ima više nepovezanih datuma).

**Forme** (`VehicleForm`/`PersonForm`): OCR popunjava SAMO prazna polja,
nikad ne prepisuje ručnu ispravku. Svako OCR-popunjeno polje ima vidljivu
"predloženo, provjeri" oznaku koja nestaje na ručnu izmjenu. Polja koja OCR
ne čita pouzdano (model, tip...) su obična obavezna ručna polja. Svaka
sekcija ima obavezan "pregledao/la sam" checkbox koji gate-a submit —
zadovoljava "OCR predlaže, korisnik potvrđuje" kao stvarnu potvrdu, ne samo
popunjenost polja.

`Transaction.status` na submitu ide na `PODACI_UNESENI` (potvrđeno točno
ime iz sheme).

## 3) Dvosmjerni signing flow

`Contract` (KOMISIJA/PRIHVAT_RACUNA) kreira se automatski kod unosa, oba "na
čekanju" sa svojim `signingToken`. `/potpis/[token]` — scroll-to-accept
(isti prag kao RaC), vlastita canvas signature pad komponenta (native
Pointer Events, **ne** `react-signature-canvas` — izbjegnuta nova ovisnost i
poznati `getTrimmedCanvas()` bug iz RaC-a).

**Tekst ugovora** (`src/lib/contracts/templates.ts`) je odobren u razgovoru,
restrukturiran iz `KUPOPRODAJNI-UGOVOR.pdf` na dvostrani model
prodavatelj↔firma (ne prodavatelj↔kupac). Ključne razlike od prvog nacrta:
kupac plaća cijenu **uvećanu** za proviziju (ne umanjenu), dodan čl. 4a
(regresna klauzula prema prodavatelju ako firma odgovara kupcu za skriveni
nedostatak), stvarni zakonski minimum potrošačke odgovornosti (1 godina/2
mjeseca) umjesto neprovedive "nema prava na prigovor" formulacije. **Broj
članka ZOO-a za ugovor o komisiji namjerno nije naveden** — čeka potvrdu od
Branimira, ne nagađano.

Kad su OBA ugovora potpisana → `Transaction.status = UGOVORI_POTPISANI`
("čeka fiskalizaciju").

## 4) Fiskalizirani račun na maržu

**Prije koda**, istražena službena CIS Tehnička specifikacija v2.6
(porezna-uprava.gov.hr) + unakrsno provjerena XSD shema — `IznosMarza` je
čisto informativno polje, NIJE u CIS-ovoj formuli provjere `IznosUkupno`.
PDV se šalje kroz standardni `<Pdv>` blok obračunat samo na proviziju
(spec.md formula: provizija × 0,20), a dio koji ide prodavatelju ide u
`IznosNePodlOpor` (jedino polje koje čini da zbroj odgovara). Vidi puno
obrazloženje u `src/lib/fiscalization/engine.ts` komentaru iznad
`izracunajMarzuPdv`.

Engine (`src/lib/fiscalization/engine.ts`) portan iz Rent-a-Car Manager
(RSA-SHA256 ZKI/XMLDSig, exclusive c14n, `Reference URI="#RacunZahtjev"` —
identično, već testirano tamo), prošireno s `R2_MARZA` poreznim blokom.
**Testirano uživo protiv cistesta, pravi JIR dobiven** — prvi pokušaj je
pao (`s001`, kriv redoslijed `IznosMarza`/`IznosNePodlOpor` elemenata), sama
CIS greška je otkrila točan redoslijed, popravljeno.

FINA testni cert — isti kao RENT-A-CAR app/FLEET (NAVALIS-CISSA J.D.O.O.,
`CN=FISKAL 1`), radi na cistestu neovisno o tome koja je stvarna firma jer
je testna okolina odvojena. Produkcijski cert nove firme dolazi tek pred
launch.

**PDF računa** (`src/lib/pdf/InvoicePdf.tsx`, `@react-pdf/renderer`) prati
stvarni `MARŽNI-RAČUN.pdf` primjerak polje po polje. Jedna stavka, jedan
zbirni iznos — interni split cijena/provizija ostaje samo u pozadini za PDV
izračun, nikad prikazan kupcu (izričita napomena korisnika). Napomena blok
koristi istu ispravljenu zakonsku formulaciju kao Prihvat računa.

**Bug uhvaćen i popravljen uživo**: ugrađeni PT Sans font subset ima
pokvarenu "fi" ligaturu — "fiskaliziranom" se prikazivalo kao
"fskaliziranom" u oba PDF predloška (ugovor i račun). Popravljeno globalno
(`fontFeatureSettings: { liga: false }` na page stilu).

Kad je račun izdan → `Transaction.status = RACUN_IZDAN`, `BlagajnaUnos`
zapisi (uplata od kupca + isplata prodavatelju, vidi niže).

## 5) Baza korisnika/vozila + admin panel

**Blagajna** — minimalan model (`BlagajnaUnos`: UPLATA/ISPLATA, vezano uz
Transaction). Svaki GOTOVINA račun stvara par zapisa istovremeno (gotovina
"ulazi i odmah izlazi", po korisnikovom opisu) — saldo prati akumuliranu
nepodignutu proviziju, ne bruto promet.

**Admin panel** (`/admin`) — dashboard s 4 uvjetne obavijesne trake (čekaju
potpis, spremne za fiskalizaciju, CESIJA čeka ručnu obradu, blagajna preko
dnevnog maksimuma) + 9 pločica u 3 boje (zeleno=transakcije, narančasto=
matični podaci, crveno=blagajna/financije). `CompanySettings
.dnevniMaksimumBlagajna` default 10.000€ — **interna politika, ne nužno
isti propis kao zakonski prag po transakciji, treba potvrdu**.

Popisi: transakcije, računi, vozila, klijenti (pretraga po OIB-u ILI reg.
oznaci, oba testirana), cesije (samo popis za praćenje — cesija ostaje ručni
proces izvan appa), blagajnički izvještaj, promet po periodu, dnevni polog.

**Detalj transakcije** (`/admin/transakcije/[id]`) — pravi dokumentacijski
trag: strane, vozilo, cijena+blagajna zapisi, kronološki timeline iz stvarnih
vremenskih oznaka (ne izmišljen redoslijed), i dokumenti grid:
- Potpisani ugovori kao pravi PDF (novi `ContractPdf.tsx` +
  `/api/admin/contracts/[id]/pdf` — reuse odobrenog teksta + ugrađen
  potpis iz `Contract.signatureRef`).
- Izdani račun (postojeći `/api/invoices/[id]/pdf`).
- Izvorne fotografije osobne/prometne — **Supabase Storage**, wired i
  testirano uživo (vidi niže).

**Supabase Storage** — `src/lib/storage.ts`, bucket `dokumenti` (lijeno
kreiran, javno čitljiv). OCR rute (`/api/ocr/personal-id`,
`/api/ocr/vehicle-document`) sad uploadaju sliku paralelno s ekstrakcijom i
vraćaju `imageUrl`; forme ga vežu na točan slot (prednja/stražnja) i šalju
kroz `/api/intake`. **Bug uhvaćen prije produkcije**: Zod po defaultu tiho
briše nepoznata polja iz parsiranog objekta — bez eksplicitne deklaracije u
`schemas/ocr.ts`/`schemas/intake.ts`, URL-ovi bi nestali između forme i baze
iako su stvarno poslani preko mreže.

---

## Stack / ovisnosti dodane tijekom rada (sve odobrene prije dodavanja)

Next.js 16 (App Router, TS), Prisma 7 (driver adapter model — `schema.prisma`
više ne nosi `url`, treba `prisma.config.ts` + `@prisma/adapter-pg`),
Supabase/Postgres. `zod`, `node-forge`/`xml-crypto`/`@xmldom/xmldom`
(fiskalizacija), `qrcode`, `@react-pdf/renderer`, `@supabase/supabase-js`.
Bez Tailwinda (CSS modules), bez `react-signature-canvas` (vlastita
implementacija).

## Env varijable (`.env`, gitignored; `.env.example` ima placeholdere)

`DATABASE_URL`/`DIRECT_URL` (Supabase pooler/direct — vidi komentar u
`.env.example` zašto su različiti), `GOOGLE_VISION_API_KEY` (zaseban GCP
projekt za ovu firmu), `FINA_CERT_BASE64`/`FINA_CERT_PASSWORD`/`FINA_OIB`/
`FINA_OZN_PP`/`FINA_OZN_NU`/`FINA_URL` (testni cert, reuse iz RaC-a),
`SUPABASE_URL`/`SUPABASE_SERVICE_ROLE_KEY` (isti Supabase projekt kao baza).

## Otvoreno / čeka potvrdu

- **Broj članka ZOO-a** za ugovor o komisiji (čl. 4a referenca) — čeka
  Branimira, ne nagađano.
- **`dnevniMaksimumBlagajna`** (10.000€ default) — interna politika,
  potvrditi je li to stvarno pravi broj.
- **CompanySettings prazan** (ime/OIB/adresa/IBAN nove firme TBD) — PDF-ovi
  i ugovori zato pokazuju `[NAZIV FIRME — TBD]` placeholdere; popunit će se
  automatski čim red postoji u bazi, bez izmjene koda.
- **Produkcijski FINA cert** nove firme — ide tek pred launch (CLAUDE.md),
  cistest test cert (NAVALIS-CISSA) dovoljan za razvoj.
- **Autentikacija/autorizacija** — admin panel trenutno nema login, otvoren
  svima s pristupom URL-u. Nije traženo do sad, ali treba prije launcha.
- **Nema git remote** — sve je lokalno commitano, ništa pushano nigdje.
