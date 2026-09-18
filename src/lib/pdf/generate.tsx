import { renderToBuffer } from "@react-pdf/renderer";
import "./fonts";
import { InvoicePdfDocument, type InvoicePdfProps } from "./InvoicePdf";

export async function renderInvoicePdf(props: InvoicePdfProps): Promise<Buffer> {
  return renderToBuffer(<InvoicePdfDocument {...props} />);
}
