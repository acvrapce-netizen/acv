import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEur } from "@/lib/pdf/format";
import styles from "../admin.module.css";

export default async function RacuniListPage() {
  const invoices = await prisma.invoice.findMany({
    where: { status: "FISKALIZIRANO" },
    include: { transaction: { include: { vehicle: true, kupac: true } } },
    orderBy: { izdanoAt: "desc" },
  });

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Izdani računi</h1>

      {invoices.length === 0 ? (
        <p className={styles.empty}>Nema izdanih računa.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Broj računa</th>
              <th>Datum</th>
              <th>Kupac</th>
              <th>Vozilo</th>
              <th>Iznos</th>
              <th>JIR</th>
              <th>PDF</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>
                  <Link href={`/admin/transakcije/${inv.transactionId}`} className={styles.tableLink}>
                    {inv.brojRacuna}
                  </Link>
                </td>
                <td>{inv.izdanoAt ? formatDate(inv.izdanoAt) : "—"}</td>
                <td>
                  {inv.transaction.kupac.ime} {inv.transaction.kupac.prezime}
                </td>
                <td>
                  {inv.transaction.vehicle.marka} {inv.transaction.vehicle.model ?? ""}
                </td>
                <td>{formatEur(Number(inv.ukupanIznos))}</td>
                <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{inv.jir?.slice(0, 8)}…</td>
                <td>
                  <a href={`/api/invoices/${inv.id}/pdf`} target="_blank" rel="noreferrer" className={styles.tableLink}>
                    Otvori
                  </a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
