"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import styles from "./page.module.css";

interface ContractData {
  id: string;
  type: "KOMISIJA" | "PRIHVAT_RACUNA";
  status: "NA_CEKANJU" | "POTPISANO" | "ODBIJENO";
  signer: { ime: string; prezime: string; oib: string; adresa: string; grad: string };
  transaction: {
    dogovorenaCijena: string;
    proviziaFirme: string;
    vehicle: { marka: string; model: string | null; registarskaOznaka: string | null; sasija: string };
    prodavatelj: { ime: string; prezime: string };
    kupac: { ime: string; prezime: string };
  };
  company: { naziv: string; oib: string; adresa: string } | null;
}

const TITLES: Record<ContractData["type"], string> = {
  KOMISIJA: "Ugovor o komisiji",
  PRIHVAT_RACUNA: "Prihvat računa",
};

export default function PotpisPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");
  const [errorReason, setErrorReason] = useState<string | null>(null);
  const [contract, setContract] = useState<ContractData | null>(null);

  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    fetch(`/api/contracts/${token}`)
      .then(async (res) => {
        const body = await res.json();
        if (!res.ok) {
          setErrorReason(body?.error ?? "invalid_token");
          setLoadState("error");
          return;
        }
        setContract(body);
        setLoadState("ready");
      })
      .catch(() => {
        setErrorReason("invalid_token");
        setLoadState("error");
      });
  }, [token]);

  function handleScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 10) {
      setScrolledToBottom(true);
    }
  }

  async function handleSubmit() {
    if (!accepted || !signature) return;
    setSubmitting(true);
    setSubmitError(null);
    const res = await fetch(`/api/contracts/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signatureRef: signature }),
    });
    setSubmitting(false);
    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setSubmitError(body?.error === "already_signed" ? "Ugovor je već potpisan." : "Slanje nije uspjelo, pokušaj ponovno.");
      return;
    }
    setSuccess(true);
  }

  if (loadState === "loading") {
    return (
      <main className={styles.page}>
        <p>Učitavanje...</p>
      </main>
    );
  }

  if (loadState === "error") {
    return (
      <main className={styles.page}>
        <p>{errorReason === "invalid_token" ? "Link nije važeći." : "Greška pri učitavanju."}</p>
      </main>
    );
  }

  if (!contract) return null;

  if (success || contract.status === "POTPISANO") {
    return (
      <main className={styles.page}>
        <h1>Hvala!</h1>
        <p>{TITLES[contract.type]} je uspješno potpisan.</p>
      </main>
    );
  }

  const { vehicle } = contract.transaction;

  return (
    <main className={styles.page}>
      <h1>{TITLES[contract.type]}</h1>
      <p className={styles.summary}>
        {vehicle.marka} {vehicle.model ?? ""} {vehicle.registarskaOznaka ? `(${vehicle.registarskaOznaka})` : ""}
        <br />
        {contract.transaction.prodavatelj.ime} {contract.transaction.prodavatelj.prezime} → {contract.transaction.kupac.ime}{" "}
        {contract.transaction.kupac.prezime}
      </p>

      <div className={styles.textBox} onScroll={handleScroll}>
        <p className={styles.draftNotice}>
          ⚠️ NACRT — točan pravni tekst ovog dokumenta čeka tvoju potvrdu prije nego postane konačan. Ovo je
          privremeni placeholder koji dokazuje da mehanizam (dohvat, scroll-to-accept, potpis, spremanje) radi
          end-to-end.
        </p>
        <p>
          Ovdje će stajati puni tekst {TITLES[contract.type].toLowerCase()}a, restrukturiran prema{" "}
          {contract.type === "KOMISIJA" ? "KUPOPRODAJNI-UGOVOR.pdf predlošku (dvostrani model prodavatelj↔firma)" : "napomenama s dna MARŽNI-RAČUN.pdf predloška"}
          .
        </p>
      </div>

      <label className={styles.acceptRow}>
        <input
          type="checkbox"
          checked={accepted}
          disabled={!scrolledToBottom}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        Pročitao/la sam i prihvaćam {TITLES[contract.type].toLowerCase()}.
      </label>
      {!scrolledToBottom && <p className={styles.hint}>Doscrolaj do dna teksta da bi mogao/la prihvatiti.</p>}

      <div className={styles.signatureSection}>
        <h2>Potpis</h2>
        <SignaturePad onChange={setSignature} />
      </div>

      {submitError && <p className={styles.error}>{submitError}</p>}

      <button
        type="button"
        className={styles.submit}
        disabled={!accepted || !signature || submitting}
        onClick={handleSubmit}
      >
        {submitting ? "Slanje..." : "Potpiši"}
      </button>
    </main>
  );
}
