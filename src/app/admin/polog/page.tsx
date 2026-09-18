import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBlagajnaSaldo, getDnevniMaksimumBlagajna } from "@/lib/blagajna";
import { formatDateTime, formatEur } from "@/lib/pdf/format";
import styles from "../admin.module.css";

export default async function DnevniPologPage() {
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const [danasnjiUnosi, saldo, maksimum] = await Promise.all([
    prisma.blagajnaUnos.findMany({ where: { createdAt: { gte: startOfToday } }, orderBy: { createdAt: "asc" } }),
    getBlagajnaSaldo(),
    getDnevniMaksimumBlagajna(),
  ]);

  const danasnjeUplate = danasnjiUnosi.filter((e) => e.tip === "UPLATA").reduce((s, e) => s + Number(e.iznos), 0);
  const danasnjeIsplate = danasnjiUnosi.filter((e) => e.tip === "ISPLATA").reduce((s, e) => s + Number(e.iznos), 0);

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Dnevni polog</h1>

      <div className={styles.statRow}>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Današnje uplate</span>
          <span className={styles.statValue}>{formatEur(danasnjeUplate)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Današnje isplate</span>
          <span className={styles.statValue}>{formatEur(danasnjeIsplate)}</span>
        </div>
        <div className={styles.stat}>
          <span className={styles.statLabel}>Trenutni saldo blagajne</span>
          <span className={styles.statValue} style={{ color: saldo > maksimum ? "#ff8080" : undefined }}>
            {formatEur(saldo)}
          </span>
        </div>
      </div>

      {saldo > maksimum ? (
        <div className={`${styles.notification} ${styles.notificationDanger}`} style={{ marginBottom: "1.5rem" }}>
          Saldo prelazi dnevni maksimum ({formatEur(maksimum)}) — preporučen polog u iznosu od {formatEur(saldo)}.
        </div>
      ) : (
        <p className={styles.empty} style={{ marginTop: 0 }}>
          Saldo je unutar dnevnog maksimuma ({formatEur(maksimum)}) — polog trenutno nije nužan.
        </p>
      )}

      {danasnjiUnosi.length === 0 ? (
        <p className={styles.empty}>Nema knjiženja danas.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vrijeme</th>
              <th>Tip</th>
              <th>Iznos</th>
              <th>Opis</th>
            </tr>
          </thead>
          <tbody>
            {danasnjiUnosi.map((e) => (
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
