import { StyleSheet } from "@react-pdf/renderer";

// Layout prati stvarni primjerak (MARŽNI-RAČUN.pdf, Auto centar Vrapče d.o.o.) -
// polja/redoslijed nisu izmišljeni, vidi CLAUDE.md.
export const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 9,
    fontFamily: "PTSans",
    color: "#111111",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
  },
  companyBlock: {
    maxWidth: 300,
  },
  companyName: {
    fontSize: 12,
    fontFamily: "PTSans",
    fontWeight: "bold",
    marginBottom: 2,
  },
  companyLine: {
    fontSize: 8,
    color: "#333333",
  },
  invoiceNumberBlock: {
    alignItems: "flex-end",
  },
  invoiceNumberTitle: {
    fontSize: 13,
    fontFamily: "PTSans",
    fontWeight: "bold",
  },
  invoiceMeta: {
    fontSize: 8,
    color: "#333333",
    marginTop: 2,
  },
  recipientBlock: {
    marginBottom: 10,
  },
  recipientLabel: {
    fontSize: 8,
    color: "#666666",
    marginBottom: 2,
  },
  recipientLine: {
    fontSize: 9.5,
  },
  table: {
    marginTop: 4,
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottom: "1px solid #111111",
    paddingBottom: 3,
  },
  tableRow: {
    flexDirection: "row",
    paddingTop: 4,
  },
  colArtikal: { flex: 1 },
  colNum: { width: 62, textAlign: "right" },
  tableCellHeader: {
    fontSize: 7.5,
    fontFamily: "PTSans",
    fontWeight: "bold",
    color: "#444444",
  },
  itemTitle: {
    fontSize: 10,
    fontFamily: "PTSans",
    fontWeight: "bold",
    marginBottom: 2,
  },
  specGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  specLine: {
    fontSize: 7.5,
    color: "#444444",
    width: "50%",
    marginBottom: 1,
  },
  totalsBlock: {
    marginTop: 6,
    alignSelf: "flex-end",
    width: 180,
  },
  totalsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 9,
    marginBottom: 2,
  },
  totalsRowBold: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10.5,
    fontFamily: "PTSans",
    fontWeight: "bold",
    borderTop: "1px solid #111111",
    paddingTop: 3,
    marginTop: 2,
  },
  marzaNote: {
    fontSize: 8,
    color: "#333333",
    marginTop: 10,
  },
  fiscalRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginTop: 10,
  },
  fiscalCol: {
    flex: 1,
    paddingRight: 10,
  },
  fiscalLine: {
    fontSize: 8,
    marginBottom: 2,
  },
  mono: {
    fontFamily: "Courier",
    fontSize: 7.5,
  },
  qrImg: {
    width: 60,
    height: 60,
  },
  metaLine: {
    fontSize: 8,
    marginTop: 8,
  },
  noteBlock: {
    marginTop: 10,
    paddingTop: 6,
    borderTop: "1px solid #cccccc",
  },
  noteTitle: {
    fontSize: 8,
    fontFamily: "PTSans",
    fontWeight: "bold",
    marginBottom: 3,
  },
  noteText: {
    fontSize: 7.5,
    color: "#333333",
    lineHeight: 1.4,
  },
  signatureRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
    fontSize: 8,
  },
  legalNote: {
    fontSize: 6.5,
    color: "#777777",
    marginTop: 10,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 32,
    right: 32,
    fontSize: 6.5,
    color: "#888888",
  },
});
