import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../admin.module.css";

export default async function VozilaListPage() {
  const vehicles = await prisma.vehicle.findMany({
    include: { vlasnik: true, transactions: { orderBy: { createdAt: "desc" }, take: 1 } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Vozila</h1>

      {vehicles.length === 0 ? (
        <p className={styles.empty}>Nema evidentiranih vozila.</p>
      ) : (
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Vozilo</th>
              <th>Reg. oznaka</th>
              <th>VIN</th>
              <th>Vlasnik (prodavatelj)</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id}>
                <td>
                  {v.marka} {v.model ?? ""} ({v.godinaProizvodnje})
                </td>
                <td>{v.registarskaOznaka ?? "—"}</td>
                <td style={{ fontFamily: "monospace", fontSize: "0.78rem" }}>{v.sasija}</td>
                <td>
                  {v.vlasnik.ime} {v.vlasnik.prezime}
                </td>
                <td>
                  {v.transactions[0] ? (
                    <Link href={`/admin/transakcije/${v.transactions[0].id}`} className={styles.tableLink}>
                      Transakcija →
                    </Link>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </main>
  );
}
