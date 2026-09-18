import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatEur } from "@/lib/pdf/format";
import { TRANSACTION_STATUS_LABEL as STATUS_LABEL } from "../../statusLabels";
import styles from "../../admin.module.css";

const CONTRACT_TITLE: Record<string, string> = {
  KOMISIJA: "Ugovor o komisiji (prodavatelj)",
  PRIHVAT_RACUNA: "Prihvat računa (kupac)",
};

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function TransakcijaDetailPage({ params }: PageProps) {
  const { id } = await params;

  const transaction = await prisma.transaction.findUnique({
    where: { id },
    include: {
      vehicle: true,
      prodavatelj: true,
      kupac: true,
      contracts: true,
      invoices: { include: { lines: true } },
      blagajnaUnosi: true,
    },
  });
  if (!transaction) notFound();

  const komisija = transaction.contracts.find((c) => c.type === "KOMISIJA");
  const prihvatRacuna = transaction.contracts.find((c) => c.type === "PRIHVAT_RACUNA");
  const invoice = transaction.invoices[0];

  // Timeline - kronološki redoslijed događaja koji stvarno postoje.
  const timelineEvents: { label: string; at: Date }[] = [{ label: "Transakcija kreirana (unos podataka)", at: transaction.createdAt }];
  if (komisija?.potpisanoAt) timelineEvents.push({ label: "Ugovor o komisiji potpisan", at: komisija.potpisanoAt });
  if (prihvatRacuna?.potpisanoAt) timelineEvents.push({ label: "Prihvat računa potpisan", at: prihvatRacuna.potpisanoAt });
  if (invoice?.izdanoAt) timelineEvents.push({ label: `Račun ${invoice.brojRacuna} izdan (JIR dobiven)`, at: invoice.izdanoAt });
  timelineEvents.sort((a, b) => a.at.getTime() - b.at.getTime());

  return (
    <main className={styles.container}>
      <Link href="/admin/transakcije" className={styles.backLink}>
        ← Transakcije
      </Link>
      <h1 className={styles.pageTitle}>
        {transaction.vehicle.marka} {transaction.vehicle.model ?? ""} ({transaction.vehicle.registarskaOznaka ?? "bez oznake"})
      </h1>
      <p style={{ marginTop: "-0.75rem", marginBottom: "1.5rem" }}>
        <span className={`${styles.badge} ${styles.badgeNeutral}`}>{STATUS_LABEL[transaction.status]}</span>
        {transaction.nacinPlacanja === "CESIJA" && (
          <span className={`${styles.badge} ${styles.badgeWarn}`} style={{ marginLeft: "0.5rem" }}>
            Cesija — ručna obrada
          </span>
        )}
      </p>

      <div className={styles.grid2}>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Prodavatelj</div>
          <p>
            {transaction.prodavatelj.ime} {transaction.prodavatelj.prezime}
            <br />
            OIB: {transaction.prodavatelj.oib}
            <br />
            {transaction.prodavatelj.adresa}, {transaction.prodavatelj.grad}
            <br />
            {transaction.prodavatelj.email} · {transaction.prodavatelj.telefon}
          </p>
        </div>
        <div className={styles.card}>
          <div className={styles.cardTitle}>Kupac</div>
          <p>
            {transaction.kupac.ime} {transaction.kupac.prezime}
            <br />
            OIB: {transaction.kupac.oib}
            <br />
            {transaction.kupac.adresa}, {transaction.kupac.grad}
            <br />
            {transaction.kupac.email} · {transaction.kupac.telefon}
          </p>
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Vozilo</div>
        <p>
          {transaction.vehicle.marka} {transaction.vehicle.tip ?? ""} {transaction.vehicle.model ?? ""} (
          {transaction.vehicle.godinaProizvodnje})
          <br />
          VIN: {transaction.vehicle.sasija} · Reg. oznaka: {transaction.vehicle.registarskaOznaka ?? "—"}
          <br />
          {transaction.vehicle.snagaKw ? `${transaction.vehicle.snagaKw} kW` : ""}{" "}
          {transaction.vehicle.obujamCm3 ? `· ${transaction.vehicle.obujamCm3} cm³` : ""}{" "}
          {transaction.vehicle.boja ? `· ${transaction.vehicle.boja}` : ""}
        </p>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Cijena i blagajna</div>
        <div className={styles.statRow}>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Dogovorena cijena (prodavatelju)</span>
            <span className={styles.statValue}>{formatEur(Number(transaction.dogovorenaCijena))}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Provizija firme</span>
            <span className={styles.statValue}>{formatEur(Number(transaction.proviziaFirme))}</span>
          </div>
          <div className={styles.stat}>
            <span className={styles.statLabel}>Ukupno (kupac plaća)</span>
            <span className={styles.statValue}>
              {formatEur(Number(transaction.dogovorenaCijena) + Number(transaction.proviziaFirme))}
            </span>
          </div>
        </div>
        {transaction.blagajnaUnosi.length > 0 && (
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
              {transaction.blagajnaUnosi.map((e) => (
                <tr key={e.id}>
                  <td>{formatDateTime(e.createdAt)}</td>
                  <td>{e.tip === "UPLATA" ? "Uplata" : "Isplata"}</td>
                  <td>{formatEur(Number(e.iznos))}</td>
                  <td>{e.opis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Dokumentacija</div>
        <div className={styles.docGrid}>
          {/* Izvorni dokumenti - Supabase Storage wiring dolazi zasebno, vidi status poruku */}
          {[
            { label: "Osobna — prodavatelj (prednja)", url: transaction.prodavatelj.osobnaPrednjaUrl },
            { label: "Osobna — prodavatelj (stražnja)", url: transaction.prodavatelj.osobnaStraznjaUrl },
            { label: "Osobna — kupac (prednja)", url: transaction.kupac.osobnaPrednjaUrl },
            { label: "Osobna — kupac (stražnja)", url: transaction.kupac.osobnaStraznjaUrl },
            { label: "Prometna (prednja)", url: transaction.vehicle.prometnaPrednjaUrl },
            { label: "Prometna (stražnja)", url: transaction.vehicle.prometnaStraznjaUrl },
          ].map((doc) =>
            doc.url ? (
              <a key={doc.label} href={doc.url} target="_blank" rel="noreferrer" className={styles.docLink}>
                {doc.label}
              </a>
            ) : (
              <span key={doc.label} className={styles.docLinkDisabled}>
                {doc.label} — nije spremljeno
              </span>
            )
          )}

          {komisija && (
            <a href={`/api/admin/contracts/${komisija.id}/pdf`} target="_blank" rel="noreferrer" className={styles.docLink}>
              {CONTRACT_TITLE.KOMISIJA} {komisija.status === "POTPISANO" ? "(potpisano)" : "(na čekanju)"}
            </a>
          )}
          {prihvatRacuna && (
            <a href={`/api/admin/contracts/${prihvatRacuna.id}/pdf`} target="_blank" rel="noreferrer" className={styles.docLink}>
              {CONTRACT_TITLE.PRIHVAT_RACUNA} {prihvatRacuna.status === "POTPISANO" ? "(potpisano)" : "(na čekanju)"}
            </a>
          )}
          {invoice ? (
            <a href={`/api/invoices/${invoice.id}/pdf`} target="_blank" rel="noreferrer" className={styles.docLink}>
              Fiskalizirani račun {invoice.brojRacuna} (JIR: {invoice.jir?.slice(0, 8)}…)
            </a>
          ) : (
            <span className={styles.docLinkDisabled}>Račun — još nije izdan</span>
          )}
        </div>
      </div>

      <div className={styles.card}>
        <div className={styles.cardTitle}>Tijek transakcije</div>
        <div className={styles.timeline}>
          {timelineEvents.map((ev, i) => (
            <div key={i} className={styles.timelineRow}>
              <div className={styles.timelineDot} />
              <div>
                <div>{ev.label}</div>
                <div className={styles.timelineMeta}>{formatDateTime(ev.at)}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
