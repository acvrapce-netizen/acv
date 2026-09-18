import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEur } from "@/lib/pdf/format";
import styles from "../admin.module.css";

interface PageProps {
  searchParams: Promise<{ od?: string; do?: string }>;
}

function startOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(0, 0, 0, 0);
  return d;
}
function endOfDay(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setHours(23, 59, 59, 999);
  return d;
}

export default async function PrometPoPeriodPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const today = new Date().toISOString().slice(0, 10);
  const od = params.od || today;
  const doDatum = params.do || today;

  const invoices = await prisma.invoice.findMany({
    where: {
      status: "FISKALIZIRANO",
      izdanoAt: { gte: startOfDay(od), lte: endOfDay(doDatum) },
    },
    include: { transaction: { include: { vehicle: true, kupac: true } } },
    orderBy: { izdanoAt: "desc" },
  });

  const ukupanPromet = invoices.reduce((sum, inv) => sum + Number(inv.ukupanIznos), 0);
  const ukupanPdv = invoices.reduce((sum, inv) => sum + Number(inv.pdvIznos), 0);

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Promet po periodu</h1>

      <form className={styles.searchBox}>
        <input type="date" name="od" defaultValue={od} className={styles.searchInput} />
        <input type="date" name="do" defaultValue={doDatum} className={styles.searchInput} />
        <button type="submit" className={styles.searchButton}>
          Filtriraj
        </button>
      </form>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Broj računa</span>
          <span className={styles.statValue}>{invoices.length}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Ukupan promet</span>
          <span className={styles.statValue}>{formatEur(ukupanPromet)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Ukupan PDV</span>
          <span className={styles.statValue}>{formatEur(ukupanPdv)}</span>
        </div>
      </div>

      {invoices.length === 0 ? (
        <p className={styles.empty}>Nema računa u odabranom razdoblju.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Broj računa</th>
              <th>Kupac</th>
              <th>Vozilo</th>
              <th>Iznos</th>
            </tr>
          </thead>
          <tbody>
            {invoices.map((inv) => (
              <tr key={inv.id}>
                <td>{inv.izdanoAt ? formatDate(inv.izdanoAt) : "—"}</td>
                <td>
                  <Link href={`/admin/transakcije/${inv.transactionId}`} className={styles.tableLink}>
                    {inv.brojRacuna}
                  </Link>
                </td>
                <td>
                  {inv.transaction.kupac.ime} {inv.transaction.kupac.prezime}
                </td>
                <td>
                  {inv.transaction.vehicle.marka} {inv.transaction.vehicle.model ?? ""}
                </td>
                <td>{formatEur(Number(inv.ukupanIznos))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
