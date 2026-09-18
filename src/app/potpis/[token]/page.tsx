"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import SignaturePad from "@/components/SignaturePad";
import { buildKomisijaParagraphs, buildPrihvatRacunaParagraphs } from "@/lib/contracts/templates";
import styles from "./page.module.css";

interface ContractData {
  id: string;
  type: "KOMISIJA" | "PRIHVAT_RACUNA";
  status: "NA_CEKANJU" | "POTPISANO" | "ODBIJENO";
  potpisanoAt: string | null;
  signer: { ime: string; prezime: string; oib: string; adresa: string; grad: string };
  transaction: {
    dogovorenaCijena: string;
    proviziaFirme: string;
    vehicle: {
      marka: string;
      model: string | null;
      uPrometuOd: string | null;
      registarskaOznaka: string | null;
      sasija: string;
    };
    prodavatelj: { ime: string; prezime: string; oib: string; adresa: string };
    kupac: { ime: string; prezime: string; oib: string; adresa: string };
  };
  company: { naziv: string; oib: string; adresa: string } | null;
}

function formatDateForTemplate(iso: string | null): string | null {
  if (!iso) return null;
  // hr-HR lokal već ispisuje datum s završnom točkom (npr. "23. 05. 2018.").
  return new Date(iso).toLocaleDateString("hr-HR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function buildParagraphs(contract: ContractData): string[] {
  const dogovorenaCijena = Number(contract.transaction.dogovorenaCijena);
  const proviziaFirme = Number(contract.transaction.proviziaFirme);
  const datum = contract.potpisanoAt ? new Date(contract.potpisanoAt) : new Date();

  if (contract.type === "KOMISIJA") {
    return buildKomisijaParagraphs({
      datum,
      company: contract.company,
      komitent: contract.signer,
      kupac: contract.transaction.kupac,
      vehicle: { ...contract.transaction.vehicle, uPrometuOd: formatDateForTemplate(contract.transaction.vehicle.uPrometuOd) },
      dogovorenaCijena,
      proviziaFirme,
    });
  }

  return buildPrihvatRacunaParagraphs({
    datum,
    kupac: contract.signer,
    vehicle: contract.transaction.vehicle,
    brojRacuna: null, // Invoice još ne postoji u ovoj fazi flowa (nastaje pri fiskalizaciji)
    ukupanIznos: dogovorenaCijena + proviziaFirme,
  });
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
  const paragraphs = buildParagraphs(contract);

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
        {paragraphs.map((paragraph, i) => (
          <p key={i} className={styles.paragraph}>
            {paragraph}
          </p>
        ))}
      </div>

      <label className={styles.acceptRow}>
        <input
          type="checkbox"
          checked={accepted}
          disabled={!scrolledToBottom}
          onChange={(e) => setAccepted(e.target.checked)}
        />
        Pročitao/la sam gornji tekst i slažem se s njim.
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
