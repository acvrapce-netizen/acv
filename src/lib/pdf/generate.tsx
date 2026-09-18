import { renderToBuffer } from "@react-pdf/renderer";
import "./fonts";
import { InvoicePdfDocument, type InvoicePdfProps } from "./InvoicePdf";
import { ContractPdfDocument, type ContractPdfProps } from "./ContractPdf";

export async function renderInvoicePdf(props: InvoicePdfProps): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument {...props} />);
}

export async function renderContractPdf(props: ContractPdfProps): Promise<Buffer> {
  return renderToBuffer(<ContractPdfDocument {...props} />);
}
