import { Document, Page, Text, View, Image } from "./components";
import { StyleSheet } from "@react-pdf/renderer";
import { styles } from "./styles";
import { formatDateTime } from "./format";

const local = StyleSheet.create({
  title: {
    fontSize: 13,
    fontFamily: "PTSans",
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 14,
  },
  paragraph: {
    fontSize: 9,
    lineHeight: 1.5,
    marginBottom: 8,
    whiteSpace: "pre-line",
  },
  signatureBlock: {
    marginTop: 20,
  },
  signatureLabel: {
    fontSize: 8,
    color: "#555555",
    marginBottom: 4,
  },
  signatureImg: {
    width: 160,
    height: 60,
  },
  signatureMeta: {
    fontSize: 7.5,
    color: "#555555",
    marginTop: 3,
  },
});

export interface ContractPdfProps {
  title: string;
  paragraphs: string[];
  signerName: string;
  signatureDataUrl: string | null;
  potpisanoAt: Date | null;
}

// Renderira ODOBRENI tekst ugovora (vidi src/lib/contracts/templates.ts) +
// potpis (canvas snapshot) kao PDF - koristi se za "potpisani ugovor o
// komisiji" / "potpisani prihvat računa" u detalju transakcije.
export function ContractPdfDocument({ title, paragraphs, signerName, signatureDataUrl, potpisanoAt }: ContractPdfProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={local.title}>{title}</Text>
        {paragraphs.map((p, i) => (
          <Text key={i} style={local.paragraph}>
            {p}
          </Text>
        ))}

        <View style={local.signatureBlock}>
          <Text style={local.signatureLabel}>Potpis ({signerName})</Text>
          {signatureDataUrl ? (
            // eslint-disable-next-line jsx-a11y/alt-text -- @react-pdf/renderer Image, no alt prop
            <Image src={signatureDataUrl} style={local.signatureImg} />
          ) : (
            <Text style={local.signatureMeta}>Nije potpisano.</Text>
          )}
          {potpisanoAt ? <Text style={local.signatureMeta}>Potpisano: {formatDateTime(potpisanoAt)}</Text> : null}
        </View>
      </Page>
    </Document>
  );
}
