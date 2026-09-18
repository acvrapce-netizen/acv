import { Document, Page, Text, View, Image } from "./components";
import { styles } from "./styles";
import { formatDate, formatEur } from "./format";

// Layout prati stvarni primjerak MARŽNI-RAČUN.pdf (Auto centar Vrapče d.o.o.) -
// polja i redoslijed nisu izmišljeni, vidi CLAUDE.md. JEDNA stavka, JEDAN zbirni
// iznos - interni split cijena vozila/provizija (za PDV u CIS XML-u) NIKAD se ne
// prikazuje kupcu kao dvije stavke (izričita napomena od Brane).
export interface InvoicePdfProps {
  company: {
    naziv: string;
    adresa: string;
    oib: string;
    iban: string;
    email: string | null;
    telefon: string | null;
    mbs: string | null;
    euid: string | null;
    temeljniKapital: number | null;
    direktor: string | null;
  };
  izdao: string;
  brojRacuna: string;
  datumVrijeme: Date;
  kupac: {
    ime: string;
    prezime: string;
    adresa: string;
    grad: string;
    drzava: string;
    oib: string;
  };
  vehicle: {
    marka: string;
    model: string | null;
    tip: string | null;
    vrstaVozila: string;
    godinaProizvodnje: number;
    sasija: string;
    obujamCm3: number | null;
    snagaKw: number | null;
    boja: string | null;
    brojSjedala: number | null;
    oblik: string | null;
    vrstaMotora: string | null;
    kilometraza: number | null;
    nosivost: number | null;
    coEmisija: number | null;
    zemljaPorijekla: string | null;
  };
  ukupanIznos: number; // dogovorenaCijena + proviziaFirme - jedini iznos prikazan kupcu
  jir: string;
  zki: string;
  qrDataUrl: string;
  rokPlacanja: Date;
  datumIsporuke: Date;
  nacinPlacanjaLabel: string; // npr. "Novčanice i kovanice"
}

function specLine(label: string, value: string | number | null): string {
  return `${label}: ${value ?? ""}`;
}

export function InvoicePdfDocument({
  company,
  izdao,
  brojRacuna,
  datumVrijeme,
  kupac,
  vehicle,
  ukupanIznos,
  jir,
  zki,
  qrDataUrl,
  rokPlacanja,
  datumIsporuke,
  nacinPlacanjaLabel,
}: InvoicePdfProps) {
  const itemTitle = `${vehicle.marka} ${vehicle.model ?? ""}`.trim();

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.headerRow}>
          <View style={styles.companyBlock}>
            <Text style={styles.companyName}>{company.naziv}</Text>
            <Text style={styles.companyLine}>{company.adresa}</Text>
            <Text style={styles.companyLine}>OIB: {company.oib}</Text>
            <Text style={styles.companyLine}>IBAN: {company.iban}</Text>
          </View>
          <View style={styles.invoiceNumberBlock}>
            <Text style={styles.invoiceNumberTitle}>Račun {brojRacuna}</Text>
            <Text style={styles.invoiceMeta}>Izdao: {izdao}</Text>
            <Text style={styles.invoiceMeta}>
              Datum: {formatDate(datumVrijeme)} Vrijeme:{" "}
              {datumVrijeme.toLocaleTimeString("hr-HR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </Text>
          </View>
        </View>

        <View style={styles.recipientBlock}>
          <Text style={styles.recipientLabel}>Podaci za račun</Text>
          <Text style={styles.recipientLine}>
            {kupac.ime} {kupac.prezime}
          </Text>
          <Text style={styles.recipientLine}>{kupac.adresa}</Text>
          <Text style={styles.recipientLine}>{kupac.grad}</Text>
          <Text style={styles.recipientLine}>{kupac.drzava}</Text>
          <Text style={styles.recipientLine}>OIB: {kupac.oib}</Text>
        </View>

        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            <Text style={[styles.colArtikal, styles.tableCellHeader]}>Artikal/Usluga</Text>
            <Text style={[styles.colNum, styles.tableCellHeader]}>Kol.</Text>
            <Text style={[styles.colNum, styles.tableCellHeader]}>MPC</Text>
            <Text style={[styles.colNum, styles.tableCellHeader]}>Rabat %</Text>
            <Text style={[styles.colNum, styles.tableCellHeader]}>MPC-R</Text>
            <Text style={[styles.colNum, styles.tableCellHeader]}>Iznos</Text>
          </View>
          <View style={styles.tableRow}>
            <View style={styles.colArtikal}>
              <Text style={styles.itemTitle}>{itemTitle}</Text>
              <View style={styles.specGrid}>
                <Text style={styles.specLine}>{specLine("Vrsta vozila", vehicle.vrstaVozila)}</Text>
                <Text style={styles.specLine}>{specLine("Marka", vehicle.marka)}</Text>
                <Text style={styles.specLine}>{specLine("Tip", vehicle.tip)}</Text>
                <Text style={styles.specLine}>{specLine("Model", vehicle.model)}</Text>
                <Text style={styles.specLine}>{specLine("Šasija", vehicle.sasija)}</Text>
                <Text style={styles.specLine}>{specLine("Godina proizvodnje", vehicle.godinaProizvodnje)}</Text>
                <Text style={styles.specLine}>{specLine("Obujam", vehicle.obujamCm3 ? `${vehicle.obujamCm3} cm³` : null)}</Text>
                <Text style={styles.specLine}>{specLine("Snaga", vehicle.snagaKw ? `${vehicle.snagaKw} kW` : null)}</Text>
                <Text style={styles.specLine}>{specLine("Boja", vehicle.boja)}</Text>
                <Text style={styles.specLine}>{specLine("Sjedala", vehicle.brojSjedala)}</Text>
                <Text style={styles.specLine}>{specLine("Oblik", vehicle.oblik)}</Text>
                <Text style={styles.specLine}>{specLine("Vrsta motora", vehicle.vrstaMotora)}</Text>
                <Text style={styles.specLine}>{specLine("Kilometraža", vehicle.kilometraza)}</Text>
                <Text style={styles.specLine}>{specLine("Nosivost", vehicle.nosivost)}</Text>
                <Text style={styles.specLine}>{specLine("CO emisija", vehicle.coEmisija)}</Text>
                <Text style={styles.specLine}>{specLine("Zemlja porijekla", vehicle.zemljaPorijekla)}</Text>
              </View>
            </View>
            <Text style={styles.colNum}>1.00</Text>
            <Text style={styles.colNum}>{formatEur(ukupanIznos)}</Text>
            <Text style={styles.colNum}>0,00</Text>
            <Text style={styles.colNum}>{formatEur(ukupanIznos)}</Text>
            <Text style={styles.colNum}>{formatEur(ukupanIznos)}</Text>
          </View>
        </View>

        <View style={styles.totalsBlock}>
          <View style={styles.totalsRow}>
            <Text>POPUST:</Text>
            <Text>{formatEur(0)}</Text>
          </View>
          <View style={styles.totalsRowBold}>
            <Text>UKUPNO:</Text>
            <Text>{formatEur(ukupanIznos)}</Text>
          </View>
        </View>

        <Text style={styles.marzaNote}>
          Sukladno članku 95., stavak 2. Zakona o PDV-u primijenjen je poseban postupak oporezivanja marže – rabljena
          dobra.
        </Text>

        <View style={styles.fiscalRow}>
          <View style={styles.fiscalCol}>
            <Text style={styles.fiscalLine}>
              ZKI: <Text style={styles.mono}>{zki}</Text>
            </Text>
            <Text style={styles.fiscalLine}>
              JIR: <Text style={styles.mono}>{jir}</Text>
            </Text>
          </View>
          {/* eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, not HTML img; no alt prop exists */}
          <Image src={qrDataUrl} style={styles.qrImg} />
        </View>

        <Text style={styles.metaLine}>
          Rok plaćanja: {formatDate(rokPlacanja)} | Datum isporuke: {formatDate(datumIsporuke)}
        </Text>
        <Text style={styles.metaLine}>Plaćanje: {nacinPlacanjaLabel}</Text>

        <View style={styles.noteBlock}>
          <Text style={styles.noteTitle}>Napomena</Text>
          <Text style={styles.noteText}>
            Vozilo je prodano po sustavu viđeno-kupljeno. Sukladno zakonu, prodavatelj odgovara za materijalne
            nedostatke vozila koji su postojali u trenutku predaje, u opsegu propisanom za prodaju rabljene robe
            potrošaču (rok odgovornosti 1 godina od predaje, prijava skrivenog nedostatka najkasnije 2 mjeseca od
            otkrića). Na vozilo nije zasebno izdana garancija. Registarske pločice ostaju kupcu.
          </Text>
        </View>

        <View style={styles.signatureRow}>
          <Text>M.P. _______________</Text>
          <Text>Kupac _______________</Text>
        </View>

        <Text style={styles.legalNote}>
          Sukladno članku 9. stavak 2. Zakona o računovodstvu ova knjigovodstvena isprava je sastavljena kao
          elektronički zapis, te sadrži ime i prezime ovlaštene osobe umjesto potpisa.
        </Text>

        <Text style={styles.footer}>
          {company.naziv}
          {company.email ? ` - E: ${company.email}` : ""}
          {company.telefon ? ` M: ${company.telefon}` : ""} - {company.adresa} - IBAN: {company.iban}
          {"\n"}
          {company.mbs ? `Upis u trgovački registar: MBS ${company.mbs}` : ""}
          {company.euid ? `, EUID ${company.euid}` : ""}
          {company.temeljniKapital != null ? `, temeljni kapital ${formatEur(company.temeljniKapital)}` : ""}
          {company.direktor ? `, direktor ${company.direktor}` : ""}
        </Text>
      </Page>
    </Document>
  );
}
