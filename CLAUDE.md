# Auto Intermediary Platforma — CLAUDE.md

Ovaj file čita se automatski na početku svake Claude Code sesije u ovom repu. Sadrži poslovni kontekst, pravila i konvencije koje moraju ostati konzistentne kroz sve buduće sesije/kontekstne prozore.

## Reference dokumenti u folderu (pročitati prije pisanja koda)

- `auto-intermediary-platforma-spec.md` — pun spec proizvoda: flow, pravna/porezna osnova, tablica upravne pristojbe, financijski model. Izvor istine za sve poslovne pravila.
- `KUPOPRODAJNI-UGOVOR.pdf` — primjerak ugovora o komisiji/kupoprodaji koji prodavatelj potpisuje s firmom. Koristiti kao osnovu za data model (koja polja ugovor treba) i za generiranje PDF predloška.
- `MARŽNI-RAČUN.pdf` — primjerak fiskaliziranog računa na maržu koji se izdaje kupcu. Koristiti kao osnovu za layout/polja PDF računa (JIR/ZKI/QR blok, iskaz marže, napomena "posebni postupak oporezivanja marže" bez PDV stavke).

Prije generiranja bilo kakvog PDF predloška (ugovor ili račun), prvo pročitati oba primjerka i sažeti koja polja/sekcije sadrže — ne pogađati strukturu.

## Poslovni model (sažetak — puni detalji u spec.md)

- Platforma NIJE marketplace/oglasnik. Kupac i prodavatelj su se već sami dogovorili oko cijene; platforma je dokumentacijski/closing sloj preko firme kao **komisionara**.
- Vozilo se registrira **izravno na kupca** (prodavatelj → kupac). Firma nikad ne postaje vlasnik.
- PDV: **posebni postupak oporezivanja marže** (čl. 92 ZOPDV) — PDV se obračunava samo na proviziju firme, ne na cijelu cijenu vozila.
- Kupac je fizička osoba (B2C) → račun je **običan fiskalizirani račun** (JIR/ZKI/QR), **NIKAD strukturirani eRačun** (eRačun vrijedi samo B2B/B2G).
- Ušteda za kupca = ne plaća **upravnu pristojbu** na prijepis, jer prodavatelj (porezni obveznik = firma) na računu primjenjuje poseban postupak oporezivanja marže. Puna tarifna tablica i izuzeća su u spec.md — koristiti TOČNO te brojke, ne izmišljati/aproksimirati.
- Plaćanje: gotovina kroz blagajnu firme, do 10.000 € (zakonski maksimum, apsolutna zabrana iznad). Za vozila ≥10.000 € koristi se **cesija** (firma cedira veći dio potraživanja izravno prodavatelju) — u MVP-u ovo je **ručni proces izvan appa**, ne automatizirati sad.
- Potpisi su **dvosmjerni**: prodavatelj potpisuje ugovor o komisiji s firmom, kupac potpisuje prihvat računa. Oboje treba svoj pristup/link u appu.
- CarVertical izvješće i garancija na vozilo su **upsell stavke s drugačijim PDV tretmanom** od marže na vozilu — nikad ih ne zbrajati u istu stavku na računu:
  - carVertical: standardni PDV 25%, redovna preprodaja usluge.
  - garancija: MVP = čisti referral/lead-gen (wa.me link s predefiniranim tekstom prema partner-agenciji), provizija od agencije = standardni PDV 25%, BEZ HANFA registracije jer platforma ne savjetuje niti sklapa ugovor o osiguranju. Ne graditi insurance-intermediary logiku u MVP-u.

## MVP opseg — prioritet gradnje

1. Kalkulator uštede (statična logika, tarifna tablica iz spec.md) — landing page, bez potrebe za bazom.
2. Unos podataka (prodavatelj + kupac): osobna, prometna, email, telefon.
3. Dvosmjerni signing flow (poboljšana verzija postojećeg iz Rent-a-Car Managera).
4. Fiskalizirani račun na maržu (port fiskalizacijskog enginea — vidi niže).
5. Baza korisnika/vozila.

Van MVP-a (stub/placeholder ili ručno za launch): cesija automatizacija, carVertical API integracija (za sad fiksna cijena/postotak popusta u UI), garancija (samo wa.me link), marketing opt-in.

## Fiskalizacija — reuse, ne graditi ispočetka

Postoji već radeći fiskalizacijski engine (JIR/ZKI/QR, CIS SOAP) portan i testiran u Rent-a-Car Manager projektu — potpuno riješen s cistestom, uključujući:
- SignatureMethod/DigestMethod moraju biti **RSA-SHA256** (standardni W3C URI-ji: `http://www.w3.org/2001/04/xmldsig-more#rsa-sha256` / `http://www.w3.org/2001/04/xmlenc#sha256`), NE RSA-SHA1 (stari algoritam odbačen na cistestu od 1.7.2026, u produkciji od 1.1.2027).
- ZKI se računa RSA-SHA256 → MD5.
- Exclusive c14n canonicalization, Reference URI `#RacunZahtjev`, bez `ds:` prefiksa na potpisu.
- PoslovniProstorZahtjev je zastarjeli model (v2.7 spec) — nije potreban za izdavanje računa, koristi se PrijaviRadnoVrijemeZahtjev.
- QR kod format: `https://porezna.gov.hr/rn?jir={JIR}&datv={GGGGMMDD_HHMM}&izn={eurocenti kao cijeli broj}`.

Za testiranje koristiti postojeći FINA test certifikat (isti kao FLEET/Rent-a-Car Manager) protiv cistesta — ne čekati produkcijski certifikat nove firme da bi se krenulo s razvojem. Produkcijski FINA_URL + certifikat nove firme ubacuju se tek pred pravi launch (env varijabla), to ne blokira razvoj.

Za ovaj projekt treba samo **R2 na maržu** varijanta (fizička osoba kupac, poseban postupak oporezivanja marže, bez PDV stavke na računu) — ne treba puni R1 flow osim ako se pokaže potreba.

## Konvencije rada (iz ostalih Navalis projekata, primijeniti i ovdje)

- Testiranje uživo u produkciji dok se gradi, popravljanje u hodu — nije potrebna puna pred-verifikacija prije shippanja.
- Prije svake nove ovisnosti (npr. novi npm paket) — pitati.
- Nakon svake značajne promjene — javiti status commit/push (je li commitano i pushano ili ne).
- Verifikacija protiv produkcijske baze ide kroz privremeni debug route, ne nagađanjem.

## Stack (default — reuse iz FLEET/Rent-a-Car Manager radi konzistentnosti, promijeniti ako Brane kaže drugačije)

Next.js, Prisma + Supabase/Postgres, Vercel hosting, Resend za email. Potpisivanje "preko mobitela" = mobile-responsive web, ne nužno native Expo app — potvrditi s Branom ako se ispostavi da treba native app iz nekog razloga.

## Pravna firma

Nositelj posla (komisionar) je **nova, zasebna firma**, ne NAVALIS-CISSA. Ime/OIB TBD — CompanySettings mora biti lako mijenjati prije launcha kad ime bude poznato.
