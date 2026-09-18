import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDate, formatEur } from "@/lib/pdf/format";
import { TRANSACTION_STATUS_LABEL, TRANSACTION_STATUS_BADGE } from "../statusLabels";
import styles from "../admin.module.css";

// Cesija = vozila ≥10.000 € gdje firma cedira veći dio potraživanja izravno
// prodavatelju - ručni proces izvan appa u MVP-u, vidi CLAUDE.md. Ova stranica
// je samo popis za praćenje, ne automatizira ništa.
export default async function CesijeListPage() {
  const transactions = await prisma.transaction.findMany({
    where: { nacinPlacanja: "CESIJA", status: { notIn: ["ZAVRSENO", "OTKAZANO"] } },
    include: { vehicle: true, prodavatelj: true, kupac: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Cesije</h1>
      <p className={styles.empty} style={{ marginTop: "-0.5rem", marginBottom: "1.5rem" }}>
        Vozila ≥10.000 € — cesija se rješava ručno izvan aplikacije (vidi CLAUDE.md). Ovo je samo popis za praćenje.
      </p>

      {transactions.length === 0 ? (
        <p className={styles.empty}>Nema aktivnih cesija.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datum</th>
              <th>Vozilo</th>
              <th>Prodavatelj</th>
              <th>Kupac</th>
              <th>Cijena</th>
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
                <td>{formatEur(Number(t.dogovorenaCijena) + Number(t.proviziaFirme))}</td>
                <td>
                  <span className={`${styles.badge} ${TRANSACTION_STATUS_BADGE[t.status]}`}>
                    {TRANSACTION_STATUS_LABEL[t.status]}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
