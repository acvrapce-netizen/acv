import Link from "next/link";
import { prisma } from "@/lib/prisma";
import styles from "../admin.module.css";

interface PageProps {
  searchParams: Promise<{ q?: string }>;
}

export default async function KlijentiSearchPage({ searchParams }: PageProps) {
  const { q } = await searchParams;
  const query = q?.trim() ?? "";

  const [people, vehicles] = query
    ? await Promise.all([
        prisma.person.findMany({
          where: {
            OR: [
              { oib: { contains: query } },
              { ime: { contains: query, mode: "insensitive" } },
              { prezime: { contains: query, mode: "insensitive" } },
            ],
          },
          take: 25,
        }),
        prisma.vehicle.findMany({
          where: { registarskaOznaka: { contains: query, mode: "insensitive" } },
          include: { vlasnik: true },
          take: 25,
        }),
      ])
    : [[], []];

  return (
    <main className={styles.container}>
      <Link href="/admin" className={styles.backLink}>
        ← Pregled
      </Link>
      <h1 className={styles.pageTitle}>Klijenti</h1>

      <form className={styles.searchBox}>
        <input
          type="text"
          name="q"
          defaultValue={query}
          placeholder="OIB, ime/prezime ili registarska oznaka..."
          className={styles.searchInput}
        />
        <button type="submit" className={styles.searchButton}>
          Pretraži
        </button>
      </form>

      {query && people.length === 0 && vehicles.length === 0 && (
        <p className={styles.empty}>Nema rezultata za &ldquo;{query}&rdquo;.</p>
      )}

      {people.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Osobe</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Ime</th>
                <th>OIB</th>
                <th>Adresa</th>
                <th>Kontakt</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => (
                <tr key={p.id}>
                  <td>
                    {p.ime} {p.prezime}
                  </td>
                  <td>{p.oib}</td>
                  <td>
                    {p.adresa}, {p.grad}
                  </td>
                  <td>
                    {p.email} · {p.telefon}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {vehicles.length > 0 && (
        <div className={styles.card}>
          <div className={styles.cardTitle}>Vozila</div>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Vozilo</th>
                <th>Reg. oznaka</th>
                <th>Vlasnik</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {vehicles.map((v) => (
                <tr key={v.id}>
                  <td>
                    {v.marka} {v.model ?? ""}
                  </td>
                  <td>{v.registarskaOznaka}</td>
                  <td>
                    {v.vlasnik.ime} {v.vlasnik.prezime}
                  </td>
                  <td>
                    <Link href={`/admin/vozila`} className={styles.tableLink}>
                      Detalji →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </main>
  );
}
