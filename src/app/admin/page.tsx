import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getBlagajnaSaldo, getDnevniMaksimumBlagajna } from "@/lib/blagajna";
import { formatEur } from "@/lib/pdf/format";
import styles from "./admin.module.css";

export default async function AdminDashboard() {
  const [cekajuPotpis, spremneZaFiskalizaciju, cesijeAktivne, saldo, maksimum] = await Promise.all([
    prisma.transaction.count({ where: { status: "PODACI_UNESENI" } }),
    prisma.transaction.count({ where: { status: "UGOVORI_POTPISANI", nacinPlacanja: "GOTOVINA" } }),
    prisma.transaction.count({
      where: { nacinPlacanja: "CESIJA", status: { notIn: ["ZAVRSENO", "OTKAZANO"] } },
    }),
    getBlagajnaSaldo(),
    getDnevniMaksimumBlagajna(),
  ]);

  const saldoPrekoracen = saldo > maksimum;

  return (
    <main className={styles.container}>
      <h1 className={styles.pageTitle}>Pregled</h1>

      <div className={styles.notifications}>
        {cekajuPotpis > 0 && (
          <Link href="/admin/transakcije" className={`${styles.notification} ${styles.notificationInfo}`}>
            <span>
              Imate <strong>{cekajuPotpis}</strong> {cekajuPotpis === 1 ? "transakciju koja čeka" : "transakcija koje čekaju"} potpis
            </span>
            <span className={styles.notificationArrow}>→</span>
          </Link>
        )}
        {spremneZaFiskalizaciju > 0 && (
          <Link href="/admin/transakcije" className={`${styles.notification} ${styles.notificationInfo}`}>
            <span>
              Imate <strong>{spremneZaFiskalizaciju}</strong> {spremneZaFiskalizaciju === 1 ? "transakciju spremnu" : "transakcija spremnih"} za fiskalizaciju
            </span>
            <span className={styles.notificationArrow}>→</span>
          </Link>
        )}
        {cesijeAktivne > 0 && (
          <Link href="/admin/cesije" className={`${styles.notification} ${styles.notificationWarn}`}>
            <span>
              Imate <strong>{cesijeAktivne}</strong> CESIJA {cesijeAktivne === 1 ? "transakciju koja čeka" : "transakcija koje čekaju"} ručnu obradu
            </span>
            <span className={styles.notificationArrow}>→</span>
          </Link>
        )}
        {saldoPrekoracen && (
          <Link href="/admin/polog" className={`${styles.notification} ${styles.notificationDanger}`}>
            <span>
              Gotovina u blagajni ({formatEur(saldo)}) prelazi dnevni maksimum ({formatEur(maksimum)}) — potreban polog
            </span>
            <span className={styles.notificationArrow}>→</span>
          </Link>
        )}
        {cekajuPotpis === 0 && spremneZaFiskalizaciju === 0 && cesijeAktivne === 0 && !saldoPrekoracen && (
          <p className={styles.empty}>Nema aktivnih obavijesti.</p>
        )}
      </div>

      <div className={styles.tileGroup}>
        <div className={styles.tileGroupTitle}>Transakcije / računi</div>
        <div className={styles.tileGrid}>
          <Link href="/unos" className={`${styles.tile} ${styles.tileGreen}`}>
            <div className={styles.tileTitle}>Nova transakcija</div>
            <div className={styles.tileSub}>Unos podataka prodavatelja/kupca/vozila</div>
          </Link>
          <Link href="/admin/racuni" className={`${styles.tile} ${styles.tileGreen}`}>
            <div className={styles.tileTitle}>Izdani računi</div>
            <div className={styles.tileSub}>Fiskalizirani računi, JIR/ZKI, PDF</div>
          </Link>
          <Link href="/admin/transakcije" className={`${styles.tile} ${styles.tileGreen}`}>
            <div className={styles.tileTitle}>Transakcije u tijeku</div>
            <div className={styles.tileSub}>Unos → potpis → fiskalizacija</div>
          </Link>
        </div>
      </div>

      <div className={styles.tileGroup}>
        <div className={styles.tileGroupTitle}>Matični podaci</div>
        <div className={styles.tileGrid}>
          <Link href="/admin/vozila" className={`${styles.tile} ${styles.tileOrange}`}>
            <div className={styles.tileTitle}>Vozila</div>
            <div className={styles.tileSub}>Popis svih evidentiranih vozila</div>
          </Link>
          <Link href="/admin/klijenti" className={`${styles.tile} ${styles.tileOrange}`}>
            <div className={styles.tileTitle}>Klijenti</div>
            <div className={styles.tileSub}>Pretraga po OIB-u ili reg. oznaci</div>
          </Link>
          <Link href="/admin/cesije" className={`${styles.tile} ${styles.tileOrange}`}>
            <div className={styles.tileTitle}>Cesije</div>
            <div className={styles.tileSub}>Vozila ≥10.000 € — ručna obrada</div>
          </Link>
        </div>
      </div>

      <div className={styles.tileGroup}>
        <div className={styles.tileGroupTitle}>Blagajna / financije</div>
        <div className={styles.tileGrid}>
          <Link href="/admin/blagajna" className={`${styles.tile} ${styles.tileRed}`}>
            <div className={styles.tileTitle}>Blagajnički izvještaj</div>
            <div className={styles.tileSub}>Saldo, uplate/isplate</div>
          </Link>
          <Link href="/admin/promet" className={`${styles.tile} ${styles.tileRed}`}>
            <div className={styles.tileTitle}>Promet po periodu</div>
            <div className={styles.tileSub}>Filtriraj po datumskom rasponu</div>
          </Link>
          <Link href="/admin/polog" className={`${styles.tile} ${styles.tileRed}`}>
            <div className={styles.tileTitle}>Dnevni polog</div>
            <div className={styles.tileSub}>Današnji promet, prijedlog pologa</div>
          </Link>
        </div>
      </div>
    </main>
  );
}
