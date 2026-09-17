# Auto Intermediary Platforma — Spec flowa (MVP)

## Koncept

Web app/stranica koja **NIJE marketplace/oglasnik** — kupac i prodavatelj su se već sami našli i dogovorili cijenu (npr. preko Njuškala ili poznanstva). Platforma je **closing/dokumentacijski sloj** preko firme kao **komisionara**: na dogovorenu cijenu se plaća naknada platformi, firma izdaje jedinstveni račun kupcu (dogovorena kupoprodajna cijena + provizija), rješava dokumentaciju i potpis ugovora, i time otvara upsell na vozilo history report i garanciju. Ovo drastično sužava MVP opseg — nema pretrage, oglasa ni cjenkanja u appu.

Glavni selling point za kupca: **ušteda na upravnoj pristojbi** pri prijepisu, jer ju plaća samo kod kupoprodaje između dvije privatne osobe — ne i kad prodavatelj (porezni obveznik) na računu iskaže PDV ili primijeni poseban postupak oporezivanja marže.

Tržište: procjena par desetaka tisuća P2P prodaja vozila godišnje u HR (treba potvrditi točan broj — HAK/DZS podaci o prijenosu vlasništva, za kasnije).

## Pravna/porezna osnova (istraženo, potvrđeno)

- **Model transakcije: komisiona prodaja.** Firma prodaje vozilo u svoje ime, za tuđi račun (ugovor o komisiji s prodavateljem). Standardni model auto-kuća u HR za ovu svrhu.
- **Potvrđeno (iz postojeće prakse):** vozilo se registrira **izravno na kupca** — firma nikad ne postaje (privremeni) vlasnik, nema dvostruke registracije/dvostruke pristojbe. Firma postoji u transakciji samo kroz ugovor i račun.
- **Potpisi — oba nužna, iz različitih razloga:** prodavatelj potpisuje ugovor o komisiji s firmom (firma mora imati knjigovodstveni "ulaz i izlaz" iako registracija ide izravno); kupac potpisuje jer prihvaća račun — i radi eventualnih kasnijih pritužbi/reklamacija. Znači: **dvosmjerni flow**, obje strane trebaju svoj pristup/potpis u appu, ne samo kupac koji unosi podatke za oboje.
- **PDV: posebni postupak oporezivanja marže** (čl. 92 ZOPDV) — primjenjuje se jer je prodavatelj privatna osoba bez prava iskaza PDV-a. PDV se računa samo na maržu (proviziju firme), ne na cijelu cijenu vozila: marža × 0,20 = PDV (faktor za 25% "iznutra").
- **Upravna pristojba na prijepis** — ne plaća se kad prodavatelj (porezni obveznik) na računu iskaže PDV ili primijeni poseban postupak oporezivanja marže. Ovo je pravna osnova uštede koju kalkulator prikazuje.
- **Fiskalizacija računa kupcu:** kupac je fizička osoba → **B2C, običan fiskalizirani račun** (JIR/ZKI/QR), NE strukturirani eRačun (eRačun vrijedi isključivo B2B/B2G). Od 1.1.2026. fiskalizacija obavezna za sve načine plaćanja, uključujući virman. Postojeći fiskalizacijski engine iz Rent-a-Car Manager/FLEET (R1/R2, JIR/ZKI/QR, RSA-SHA256) je izravno ponovno iskoristiv za ovo.
- **CarVertical izvješće:** standardna preprodaja usluge, PDV 25% na redovnoj osnovi (pretporez na nabavu, izlazni PDV na prodaju).
- **Plaćanje / novčani tok:** novac ide kroz **blagajnu firme, u gotovini**. Zakonski je gotovinsko plaćanje/primanje **zabranjeno od 10.000 € naviše** (Zakon o sprječavanju pranja novca — apsolutna zabrana, ne samo prijava) za svaku osobu koja obavlja registriranu djelatnost. Za vozila **ispod 10.000 €**: standardni tok, sve kroz blagajnu.
  Za vozila **od 10.000 € naviše**: rješava se **cesijom** — firma ustupa (cedira) veći dio potraživanja izravno prodavatelju, tako da kupac taj veći dio plaća direktno prodavatelju (izvan blagajne firme), a kroz blagajnu firme prolazi samo ostatak + provizija — svaka pojedina gotovinska noga time ostaje ispod zakonskog praga od 10.000 €. Ovo je već postojeća praksa, ne novi mehanizam — app treba podržati granu flowa koja generira i evidentira cesijski ugovor kad je cijena ≥10.000 €.
- **Garancija na vozilo / osiguranje:** MVP pristup = **čisti referral/lead-gen**, NE insurance intermediation. Dok god platforma ne savjetuje o uvjetima police niti sklapa ugovor o osiguranju (to radi partner-agencija), aktivnost ne spada pod distribuciju osiguranja i ne treba HANFA registraciju (ni puna licenca, ni sporedni posrednik). Provizija koju NAVALIS prima od agencije = obična marketinška/referral usluga, standardni PDV 25%, ne PDV-oslobođena. Alternativa za kasnije (ako se pokaže vrijednim): registracija kao **sporedni posrednik u osiguranju** kod HANFA-e (lakša licenca, limit premije ~624 €/god. ili ~208 € za pokriće ≤3 mj.) čime bi provizija bila PDV-oslobođena — odgođeno, nije MVP.

## Upravna pristojba — referentna tablica (za kalkulator)

**Formula:**
- Osobni automobili: `pristojba = T[€/kW] × snaga motora [kW]`
- Motocikli/mopedi/ATV: `pristojba = T[€/cm³] × obujam motora [cm³]`

**Tarifa (T) po starosti vozila — automobili (€/kW):**

| Starost vozila | €/kW |
|---|---|
| ≤ 1 godina | 6,64 |
| 2 godine | 5,97 |
| 3 godine | 5,31 |
| 4 godine | 4,65 |
| 5 godina | 3,98 |
| 6 godina | 3,32 |
| 7 godina | 2,65 |
| 8–10 godina | 1,99 |
| 11–14 godina | 1,33 |
| 15–18 godina | 0,66 |
| 19–20 godina | 0,40 |
| 21–30 godina | 0,13 |
| > 30 godina (oldtimer) | izuzeto (vidi niže) |

**Tarifa (T) po starosti vozila — motocikli/mopedi/ATV (€/cm³):**

| Starost vozila | €/cm³ |
|---|---|
| ≤ 1 godina | 0,40 |
| 2 godine | 0,37 |
| 3 godine | 0,32 |
| 4 godine | 0,27 |
| 5–7 godina | 0,21 |
| 8–10 godina | 0,16 |
| 11–14 godina | 0,11 |
| 15–18 godina | 0,05 |
| 19–20 godina | 0,03 |
| 21–30 godina | 0,01 |

**Izuzeća (pristojba se NE plaća):**
- iznos pristojbe ≤ 1,99 € (de minimis prag)
- vozilo isključivo na električni pogon
- vozilo s 0 g CO₂/km
- vozilo starije od 30 godina (oldtimer, po posebnim propisima)
- kupnja od pravne osobe koja na računu iskazuje PDV ili primjenjuje poseban postupak oporezivanja marže **← ovo je mehanizam na kojem se temelji cijela ušteda u appu**
- darovanje (po ugovoru o daru)
- diplomatska/EU institucionalna vozila; sanitetska, dostavna, prilagođena za invalide, pickup — po dodatnim uvjetima iz uredbe (provjeriti opseg ako postane relevantno)

**Plaća se/obračunava:** na stanici za tehnički pregled vozila, kod prijepisa/registracije.

**Pravna osnova:**
- Zakon o posebnom porezu na motorna vozila (NN 15/13, 108/13, 115/16, 127/17, 121/19, 130/25)
- Uredba o tarifi upravnih pristojbi, Tar. br. 11 (NN 156/22, s ranijim izmjenama NN 92/21, 93/21, 95/21; tarifa u eurima od 1.1.2023.)

⚠️ Napomena za implementaciju: ovo su iznosi na dan istraživanja (rujan 2026.); tarife/izuzeća se mijenjaju uredbama, pa prije produkcijskog lansiranja vrijedi provjeriti važeću Uredbu na cvh.hr ili porezna-uprava.gov.hr i po potrebi ažurirati tablicu u kodu (ne hardkodirati bez izvora datuma provjere).

## Korisnički flow

1. **Landing / kalkulator uštede** — prvi korak, javno dostupan bez registracije.
   - Korisnik iz padajućeg izbornika bira godište vozila i upisuje snagu motora (kW).
   - Kalkulator prikazuje iznos upravne pristojbe koju bi platio kod direktne P2P kupoprodaje vs. 0 € kroz platformu.
2. **Dodatne opcije (upsell):**
   - CarVertical izvješće — da/ne; 50% jeftinije ako se uzima zajedno s ostatkom usluga (bundle popust).
   - Garancija na vozilo — da/ne; ova odluka može pričekati do kraja (nakon što je prijepis odrađen).
3. **Podaci i dokumentacija:**
   - Potrebno: osobna prodavatelja, prometna vozila, osobna kupca.
   - Korisnik unosi/provjerava podatke; e-mail i broj telefona za obje strane.
4. **Pristanak:**
   - Prihvat uvjeta korištenja (obavezno).
   - Opt-in za marketinške ponude (jeftinija osiguranja, autodijelovi i sl.) — **za razviti kasnije**, nije MVP.
5. **Potpis ugovora — dvosmjerno** — preko mobitela, oba potpisuju (prodavatelj ugovor o komisiji s firmom, kupac prihvat računa); planirano poboljšanje u odnosu na postojeći signing flow iz Rent-a-Car Manager aplikacije.
6. **Izdavanje računa** — kupoprodajna cijena + marža (provizija firme), fiskalizirani B2C račun na maržu.
7. **Kupac plaća i odlazi na prijepis** — bez upravne pristojbe, jer je izdavatelj račun s PDV/marža shemom.
8. **Baza korisnika** — kupac (novi vlasnik) i njegovo vozilo se evidentiraju u platformi.
9. **Garancija (ako odabrano)** — wa.me link s predefiniranom porukom ("Kupio sam auto putem X aplikacije, interesira me garancija za vozilo") vodi izravno partner-agenciji; korisnik kroz platformu ostvaruje dogovoreni x% popust. Čist handoff, bez savjetovanja na strani platforme.

## Financijski model — primjer (vozilo)

- Kupoprodajna cijena (prodavatelju): 10.000 €
- Marža/provizija firme: 100 €
- Od toga PDV (100 × 0,20): 20 €
- Neto zarada firme: 80 €
- Iznos na računu kupcu: **10.100 €**

Odvojeno od ovoga (različit PDV tretman, ne miješati u istu stavku):
- CarVertical marža — standardni PDV 25%
- Provizija od garancije/osiguranja (referral) — standardni PDV 25%, poseban ugovor s partner-agencijom

## Tehničke napomene

- Za B2C fiskalizaciju izravno reuse postojećeg enginea iz Rent-a-Car Manager / FLEET (JIR/ZKI/QR, RSA-SHA256, PDV/marža rule već riješeno).
- Mobilni potpis ugovora — nova, poboljšana verzija u odnosu na Rent-a-Car Manager.
- Baza kupaca + vozila — vjerojatno isti stack (Next.js/Supabase/Prisma) kao ostatak Navalis portfolija, radi konzistentnosti i mogućeg dijeljenja podataka sa servisnom poviješću iz rent-a-car aplikacije.

## Pravna struktura firme

- Nositelj posla (komisionar) je **nova, zasebna firma** — ne NAVALIS-CISSA. Sav promet platforme ide kroz tu jednu firmu (visok očekivani promet po dizajnu).
- Ime/registracija te firme — TBD, nije još odlučeno.

## Otvoreno / za kasnije

- **Ciljani segment vozila** — još nije definirano cilja li se na određeni raspon starosti/kW gdje je pristojba (i time ušteda) najveća, ili je univerzalno za sva vozila.
- Dogovoriti bulk/partner cijene s carVertical (do 73% popusta na volumen spomenuto u njihovom B2B programu).
- Kontaktirati 2-3 agencije za garanciju/osiguranje (npr. Motive Zastupanje/Triglav i slične) radi referral % i wa.me integracije.
- Marketing opt-in modul (ponude za osiguranja, autodijelove) — kasnija faza.
- Potencijalna nadogradnja: registracija kao sporedni posrednik u osiguranju, ako volumen opravda PDV-oslobođenu proviziju umjesto referral modela.
- Ime/pravni oblik nove firme-komisionara — odlučiti prije registracije domene/pravnih koraka.
