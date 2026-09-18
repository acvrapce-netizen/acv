import Link from "next/link";
import styles from "./admin.module.css";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <Link href="/admin" className={styles.navBrand}>
          Admin
        </Link>
        <Link href="/admin/transakcije" className={styles.navLink}>
          Transakcije
        </Link>
        <Link href="/admin/racuni" className={styles.navLink}>
          Računi
        </Link>
        <Link href="/admin/vozila" className={styles.navLink}>
          Vozila
        </Link>
        <Link href="/admin/klijenti" className={styles.navLink}>
          Klijenti
        </Link>
        <Link href="/admin/blagajna" className={styles.navLink}>
          Blagajna
        </Link>
      </nav>
      {children}
    </div>
  );
}
