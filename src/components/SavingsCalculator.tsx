"use client";

import { useMemo, useState } from "react";
import { izracunajUstedu, type VrstaVozila } from "@/lib/upravna-pristojba";
import styles from "./SavingsCalculator.module.css";

const TEKUCA_GODINA = new Date().getFullYear();
const GODINE = Array.from({ length: 36 }, (_, i) => TEKUCA_GODINA - i);

const RAZLOG_TEKST: Record<string, string> = {
  starije_od_30_godina: "Vozilo je starije od 30 godina (oldtimer) — pristojba se ne plaća ni inače.",
  elektricno_vozilo: "Vozila na isključivo električni pogon izuzeta su od pristojbe.",
  de_minimis: "Izračunata pristojba je ispod praga od 1,99 € pa se ne naplaćuje.",
};

export default function SavingsCalculator() {
  const [vrstaVozila, setVrstaVozila] = useState<VrstaVozila>("automobil");
  const [godinaProizvodnje, setGodinaProizvodnje] = useState(TEKUCA_GODINA - 5);
  const [snagaKw, setSnagaKw] = useState<string>("90");
  const [obujamCm3, setObujamCm3] = useState<string>("125");
  const [elektricnoVozilo, setElektricnoVozilo] = useState(false);

  const rezultat = useMemo(() => {
    return izracunajUstedu({
      vrstaVozila,
      godinaProizvodnje,
      snagaKw: Number(snagaKw) || 0,
      obujamCm3: Number(obujamCm3) || 0,
      elektricnoVozilo,
      godinaTrenutna: TEKUCA_GODINA,
    });
  }, [vrstaVozila, godinaProizvodnje, snagaKw, obujamCm3, elektricnoVozilo]);

  return (
    <div className={styles.wrapper}>
      <div className={styles.tabs}>
        <button
          type="button"
          className={vrstaVozila === "automobil" ? styles.tabActive : styles.tab}
          onClick={() => setVrstaVozila("automobil")}
        >
          Automobil
        </button>
        <button
          type="button"
          className={vrstaVozila === "motocikl" ? styles.tabActive : styles.tab}
          onClick={() => setVrstaVozila("motocikl")}
        >
          Motocikl / moped / ATV
        </button>
      </div>

      <div className={styles.field}>
        <label htmlFor="godina">Godina proizvodnje</label>
        <select
          id="godina"
          value={godinaProizvodnje}
          onChange={(e) => setGodinaProizvodnje(Number(e.target.value))}
        >
          {GODINE.map((g) => (
            <option key={g} value={g}>
              {g}
            </option>
          ))}
        </select>
      </div>

      {vrstaVozila === "automobil" ? (
        <div className={styles.field}>
          <label htmlFor="kw">Snaga motora (kW)</label>
          <input
            id="kw"
            type="number"
            min={0}
            inputMode="numeric"
            value={snagaKw}
            onChange={(e) => setSnagaKw(e.target.value)}
          />
        </div>
      ) : (
        <div className={styles.field}>
          <label htmlFor="cm3">Obujam motora (cm³)</label>
          <input
            id="cm3"
            type="number"
            min={0}
            inputMode="numeric"
            value={obujamCm3}
            onChange={(e) => setObujamCm3(e.target.value)}
          />
        </div>
      )}

      <label className={styles.checkbox}>
        <input
          type="checkbox"
          checked={elektricnoVozilo}
          onChange={(e) => setElektricnoVozilo(e.target.checked)}
        />
        Vozilo je isključivo na električni pogon
      </label>

      <div className={styles.result}>
        {rezultat.izuzeto ? (
          <>
            <div className={styles.resultRow}>
              <span>Upravna pristojba</span>
              <strong>0 €</strong>
            </div>
            <p className={styles.note}>
              {rezultat.razlogIzuzeca ? RAZLOG_TEKST[rezultat.razlogIzuzeca] : null}
            </p>
          </>
        ) : (
          <>
            <div className={styles.resultRow}>
              <span>Kod izravne kupoprodaje (P2P)</span>
              <strong>{rezultat.pristojbaP2P.toFixed(2)} €</strong>
            </div>
            <div className={styles.resultRow}>
              <span>Kroz platformu</span>
              <strong>0 €</strong>
            </div>
            <div className={styles.resultRowHighlight}>
              <span>Vaša ušteda</span>
              <strong>{rezultat.usteda.toFixed(2)} €</strong>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
