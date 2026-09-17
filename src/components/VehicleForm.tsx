"use client";

import { useState } from "react";
import type { VehicleDocumentOcrResult } from "@/lib/schemas/ocr";
import OcrPhotoUpload from "./OcrPhotoUpload";
import styles from "./forms.module.css";

// Polja 1:1 prema Prisma Vehicle modelu (prisma/schema.prisma) - string
// vrijednosti za kontrolirane inpute, pretvorba u brojeve/datume tek na
// submitu (u pozivatelju).
export interface VehicleFormState {
  vrstaVozila: string;
  marka: string;
  tip: string;
  model: string;
  sasija: string;
  registarskaOznaka: string;
  uPrometuOd: string;
  godinaProizvodnje: string;
  obujamCm3: string;
  snagaKw: string;
  boja: string;
}

export const emptyVehicleForm: VehicleFormState = {
  vrstaVozila: "M1",
  marka: "",
  tip: "",
  model: "",
  sasija: "",
  registarskaOznaka: "",
  uPrometuOd: "",
  godinaProizvodnje: "",
  obujamCm3: "",
  snagaKw: "",
  boja: "",
};

interface VehicleFormProps {
  value: VehicleFormState;
  onChange: (next: VehicleFormState) => void;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
}

// Popunjava SAMO prazna polja iz OCR prijedloga - ne prepisuje ono što je
// korisnik već ručno unio/ispravio (npr. nakon prve fotografije), i ne
// prepisuje ono što je već stiglo s druge fotografije. Vraća i skup polja
// koja je OCR stvarno popunio ovim pozivom, za "predloženo, provjeri" oznaku.
function mergeOcrResult(
  current: VehicleFormState,
  result: VehicleDocumentOcrResult
): { next: VehicleFormState; filledByOcr: (keyof VehicleFormState)[] } {
  const filledByOcr: (keyof VehicleFormState)[] = [];
  function pick(key: keyof VehicleFormState, ocrValue: string | number | undefined) {
    if (current[key]) return current[key];
    const str = ocrValue !== undefined && ocrValue !== "" ? String(ocrValue) : "";
    if (str) filledByOcr.push(key);
    return str;
  }

  const next: VehicleFormState = {
    vrstaVozila: current.vrstaVozila,
    marka: pick("marka", result.marka),
    tip: current.tip,
    model: pick("model", result.model),
    sasija: pick("sasija", result.sasija),
    registarskaOznaka: pick("registarskaOznaka", result.registarskaOznaka),
    uPrometuOd: pick("uPrometuOd", result.uPrometuOd),
    godinaProizvodnje: pick("godinaProizvodnje", result.godinaProizvodnje),
    obujamCm3: pick("obujamCm3", result.obujamCm3),
    snagaKw: pick("snagaKw", result.snagaKw),
    boja: pick("boja", result.boja),
  };
  return { next, filledByOcr };
}

export default function VehicleForm({ value, onChange, confirmed, onConfirmedChange }: VehicleFormProps) {
  const [ocrFields, setOcrFields] = useState<Set<keyof VehicleFormState>>(new Set());

  function setField<K extends keyof VehicleFormState>(key: K, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
    // Ručna izmjena = korisnik je pregledao/ispravio polje - skida "predloženo" oznaku.
    if (ocrFields.has(key)) {
      setOcrFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    onConfirmedChange(false);
  }

  function handleOcrResult(result: VehicleDocumentOcrResult) {
    const { next, filledByOcr } = mergeOcrResult(value, result);
    onChange(next);
    if (filledByOcr.length) {
      setOcrFields((prev) => new Set([...prev, ...filledByOcr]));
      onConfirmedChange(false);
    }
  }

  function renderLabel(key: keyof VehicleFormState, text: string, required: boolean) {
    return (
      <label htmlFor={key}>
        {text}
        {required ? <span className={styles.required}> *</span> : null}
        {ocrFields.has(key) ? <span className={styles.ocrBadge}>predloženo, provjeri</span> : null}
      </label>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Vozilo</h2>

      <div className={styles.ocrRow}>
        <OcrPhotoUpload<VehicleDocumentOcrResult>
          label="Prednja strana prometne"
          endpoint="/api/ocr/vehicle-document"
          onResult={handleOcrResult}
        />
        <OcrPhotoUpload<VehicleDocumentOcrResult>
          label="Stražnja strana prometne"
          endpoint="/api/ocr/vehicle-document"
          onResult={handleOcrResult}
        />
      </div>
      <p className={styles.hint}>
        Prepoznavanje je samo prijedlog — polja označena &ldquo;predloženo, provjeri&rdquo; obavezno pregledaj.
        Polja koja prepoznavanje nije pouzdano pročitalo ostaju prazna za ručni unos.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          {renderLabel("marka", "Marka", true)}
          <input id="marka" required value={value.marka} onChange={(e) => setField("marka", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("tip", "Tip", false)}
          <input id="tip" value={value.tip} onChange={(e) => setField("tip", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("model", "Model", true)}
          <input id="vehModel" required value={value.model} onChange={(e) => setField("model", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("sasija", "Broj šasije (VIN)", true)}
          <input
            id="sasija"
            required
            value={value.sasija}
            onChange={(e) => setField("sasija", e.target.value.toUpperCase())}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("registarskaOznaka", "Registarska oznaka", true)}
          <input
            id="registarskaOznaka"
            required
            value={value.registarskaOznaka}
            onChange={(e) => setField("registarskaOznaka", e.target.value.toUpperCase())}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("uPrometuOd", "U prometu od", true)}
          <input
            id="uPrometuOd"
            type="date"
            required
            value={value.uPrometuOd}
            onChange={(e) => setField("uPrometuOd", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("godinaProizvodnje", "Godina proizvodnje", true)}
          <input
            id="godinaProizvodnje"
            type="number"
            required
            value={value.godinaProizvodnje}
            onChange={(e) => setField("godinaProizvodnje", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("obujamCm3", "Obujam (cm³)", false)}
          <input id="obujamCm3" type="number" value={value.obujamCm3} onChange={(e) => setField("obujamCm3", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("snagaKw", "Snaga (kW)", true)}
          <input
            id="snagaKw"
            type="number"
            required
            value={value.snagaKw}
            onChange={(e) => setField("snagaKw", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("boja", "Boja", true)}
          <input id="boja" required value={value.boja} onChange={(e) => setField("boja", e.target.value)} />
        </div>
      </div>

      <label className={styles.confirmCheckbox}>
        <input
          type="checkbox"
          required
          checked={confirmed}
          onChange={(e) => onConfirmedChange(e.target.checked)}
        />
        Pregledao/la sam podatke o vozilu i potvrđujem da su točni.
      </label>
    </div>
  );
}
