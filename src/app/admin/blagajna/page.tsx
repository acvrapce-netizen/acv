import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBlagajnaSaldo, getDnevniMaksimumBlagajna } from "@/lib/blagajna";
import { formatDateTime, formatEur } from "@/lib/pdf/format";
import styles from "../admin.module.css";

export default async function BlagajnaIzvjestajPage() {
  const [entries, saldo, maksimum] = await Promise.all([
    prisma.blagajnaUnos.findMany({ orderBy: { createdAt: "desc" }, take: 100 }),
    getBlagajnaSaldo(),
    getDnevniMaksimumBlagajna(),
  ]);

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Blagajnički izvještaj</h1>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Trenutni saldo</span>
          <span className={styles.statValue} style={{ color: saldo > maksimum ? "#ff8080" : undefined }}>
            {formatEur(saldo)}
          </span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Dnevni maksimum</span>
          <span className={styles.statValue}>{formatEur(maksimum)}</span>
        </div>
      </div>

      {entries.length === 0 ? (
        <p className={styles.empty}>Nema knjiženja u blagajni.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Datum/vrijeme</th>
              <th>Tip</th>
              <th>Iznos</th>
              <th>Opis</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>{formatDateTime(e.createdAt)}</td>
                <td>
                  <span className={`${styles.badge} ${e.tip === "UPLATA" ? styles.badgeGood : styles.badgeDanger}`}>
                    {e.tip === "UPLATA" ? "Uplata" : "Isplata"}
                  </span>
                </td>
                <td>{formatEur(Number(e.iznos))}</td>
                <td>{e.opis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
