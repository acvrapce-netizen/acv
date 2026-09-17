"use client";

import { useState } from "react";
import PersonForm, { emptyPersonForm, type PersonFormState } from "@/components/PersonForm";
import VehicleForm, { emptyVehicleForm, type VehicleFormState } from "@/components/VehicleForm";
import styles from "./page.module.css";

function personToPayload(person: PersonFormState) {
  return { ...person };
}

function vehicleToPayload(vehicle: VehicleFormState) {
  return {
    vrstaVozila: vehicle.vrstaVozila,
    marka: vehicle.marka,
    tip: vehicle.tip || undefined,
    model: vehicle.model || undefined,
    sasija: vehicle.sasija,
    registarskaOznaka: vehicle.registarskaOznaka || undefined,
    uPrometuOd: vehicle.uPrometuOd || undefined,
    godinaProizvodnje: Number(vehicle.godinaProizvodnje),
    obujamCm3: vehicle.obujamCm3 ? Number(vehicle.obujamCm3) : undefined,
    snagaKw: vehicle.snagaKw ? Number(vehicle.snagaKw) : undefined,
    boja: vehicle.boja || undefined,
  };
}

export default function UnosPage() {
  const [prodavatelj, setProdavatelj] = useState<PersonFormState>(emptyPersonForm);
  const [kupac, setKupac] = useState<PersonFormState>(emptyPersonForm);
  const [vehicle, setVehicle] = useState<VehicleFormState>(emptyVehicleForm);
  const [vehicleConfirmed, setVehicleConfirmed] = useState(false);
  const [prodavateljConfirmed, setProdavateljConfirmed] = useState(false);
  const [kupacConfirmed, setKupacConfirmed] = useState(false);
  const [dogovorenaCijena, setDogovorenaCijena] = useState("");
  const [proviziaFirme, setProviziaFirme] = useState("");
  const [status, setStatus] = useState<"idle" | "submitting" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("submitting");
    setErrorMsg(null);

    try {
      const res = await fetch("/api/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prodavatelj: personToPayload(prodavatelj),
          kupac: personToPayload(kupac),
          vehicle: vehicleToPayload(vehicle),
          dogovorenaCijena: Number(dogovorenaCijena),
          proviziaFirme: Number(proviziaFirme),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "create_failed");
      }
      setStatus("done");
    } catch (err) {
      console.error("Intake submit failed", err);
      setErrorMsg("Spremanje nije uspjelo — provjeri podatke i pokušaj ponovno.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <main className={styles.page}>
        <p>Podaci spremljeni. Sljedeći korak (potpis ugovora) dolazi u idućoj fazi.</p>
      </main>
    );
  }

  return (
    <main className={styles.page}>
      <h1>Unos podataka</h1>
      <p className={styles.intro}>
        Fotografiraj dokumente za brže popunjavanje — svako polje provjeri i po potrebi ispravi prije spremanja.
      </p>

      <form onSubmit={handleSubmit} className={styles.form}>
        <VehicleForm
          value={vehicle}
          onChange={setVehicle}
          confirmed={vehicleConfirmed}
          onConfirmedChange={setVehicleConfirmed}
        />
        <PersonForm
          title="Prodavatelj"
          value={prodavatelj}
          onChange={setProdavatelj}
          confirmed={prodavateljConfirmed}
          onConfirmedChange={setProdavateljConfirmed}
        />
        <PersonForm
          title="Kupac"
          value={kupac}
          onChange={setKupac}
          confirmed={kupacConfirmed}
          onConfirmedChange={setKupacConfirmed}
        />

        <div className={styles.priceSection}>
          <h2 className={styles.sectionTitle}>Cijena</h2>
          <div className={styles.priceGrid}>
            <div className={styles.field}>
              <label htmlFor="dogovorenaCijena">Dogovorena cijena vozila (€)</label>
              <input
                id="dogovorenaCijena"
                type="number"
                min={0}
                step="0.01"
                value={dogovorenaCijena}
                onChange={(e) => setDogovorenaCijena(e.target.value)}
                required
              />
            </div>
            <div className={styles.field}>
              <label htmlFor="proviziaFirme">Provizija firme (€)</label>
              <input
                id="proviziaFirme"
                type="number"
                min={0}
                step="0.01"
                value={proviziaFirme}
                onChange={(e) => setProviziaFirme(e.target.value)}
                required
              />
            </div>
          </div>
        </div>

        {errorMsg ? <p className={styles.error}>{errorMsg}</p> : null}

        <button
          type="submit"
          className={styles.submit}
          disabled={status === "submitting" || !vehicleConfirmed || !prodavateljConfirmed || !kupacConfirmed}
        >
          {status === "submitting" ? "Spremam..." : "Spremi"}
        </button>
      </form>
    </main>
  );
}
