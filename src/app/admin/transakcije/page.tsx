import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/pdf/format";
import { TRANSACTION_STATUS_LABEL as STATUS_LABEL, TRANSACTION_STATUS_BADGE as STATUS_BADGE } from "../statusLabels";
import styles from "../admin.module.css";

export default async function TransakcijeListPage() {
  const transactions = await prisma.transaction.findMany({
    where: { status: { notIn: ["RACUN_IZDAN", "ZAVRSENO"] } },
    include: { vehicle: true, prodavatelj: true, kupac: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Transakcije u tijeku</h1>

      {transactions.length === 0 ? (
        <p className={styles.empty}>Nema transakcija u tijeku.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Vozilo</th>
              <th>Prodavatelj</th>
              <th>Kupac</th>
              <th>Način plaćanja</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => (
              <tr key={t.id}>
                <td>{formatDate(t.createdAt)}</td>
                <td>
                  <Link href={`/admin/transakcije/${t.id}`} className={styles.tableLink}>
                    {t.vehicle.marka} {t.vehicle.model ?? ""}
                  </Link>
                </td>
                <td>
                  {t.prodavatelj.ime} {t.prodavatelj.prezime}
                </td>
                <td>
                  {t.kupac.ime} {t.kupac.prezime}
                </td>
                <td>{t.nacinPlacanja === "CESIJA" ? "Cesija" : "Gotovina"}</td>
                <td>
                  <span className={`${styles.badge} ${STATUS_BADGE[t.status]}`}>{STATUS_LABEL[t.status]}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
