"use client";

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
}

// Popunjava SAMO prazna polja iz OCR prijedloga - ne prepisuje ono što je
// korisnik već ručno unio/ispravio (npr. nakon prve fotografije), i ne
// prepisuje ono što je već stiglo s druge fotografije.
function mergeOcrResult(current: VehicleFormState, result: VehicleDocumentOcrResult): VehicleFormState {
  return {
    vrstaVozila: current.vrstaVozila,
    marka: current.marka || result.marka || "",
    tip: current.tip,
    model: current.model || result.model || "",
    sasija: current.sasija || result.sasija || "",
    registarskaOznaka: current.registarskaOznaka || result.registarskaOznaka || "",
    uPrometuOd: current.uPrometuOd || result.uPrometuOd || "",
    godinaProizvodnje: current.godinaProizvodnje || (result.godinaProizvodnje ? String(result.godinaProizvodnje) : ""),
    obujamCm3: current.obujamCm3 || (result.obujamCm3 ? String(result.obujamCm3) : ""),
    snagaKw: current.snagaKw || (result.snagaKw ? String(result.snagaKw) : ""),
    boja: current.boja || result.boja || "",
  };
}

export default function VehicleForm({ value, onChange }: VehicleFormProps) {
  function setField<K extends keyof VehicleFormState>(key: K, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>Vozilo</h2>

      <div className={styles.ocrRow}>
        <OcrPhotoUpload<VehicleDocumentOcrResult>
          label="Prednja strana prometne"
          endpoint="/api/ocr/vehicle-document"
          onResult={(result) => onChange(mergeOcrResult(value, result))}
        />
        <OcrPhotoUpload<VehicleDocumentOcrResult>
          label="Stražnja strana prometne"
          endpoint="/api/ocr/vehicle-document"
          onResult={(result) => onChange(mergeOcrResult(value, result))}
        />
      </div>
      <p className={styles.hint}>
        Prepoznavanje je samo prijedlog — provjeri i po potrebi ispravi svako polje prije spremanja.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor="marka">Marka</label>
          <input id="marka" value={value.marka} onChange={(e) => setField("marka", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="tip">Tip</label>
          <input id="tip" value={value.tip} onChange={(e) => setField("tip", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="vehModel">Model</label>
          <input id="vehModel" value={value.model} onChange={(e) => setField("model", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="sasija">Broj šasije (VIN)</label>
          <input id="sasija" value={value.sasija} onChange={(e) => setField("sasija", e.target.value.toUpperCase())} />
        </div>
        <div className={styles.field}>
          <label htmlFor="registarskaOznaka">Registarska oznaka</label>
          <input
            id="registarskaOznaka"
            value={value.registarskaOznaka}
            onChange={(e) => setField("registarskaOznaka", e.target.value.toUpperCase())}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="uPrometuOd">U prometu od</label>
          <input
            id="uPrometuOd"
            type="date"
            value={value.uPrometuOd}
            onChange={(e) => setField("uPrometuOd", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="godinaProizvodnje">Godina proizvodnje</label>
          <input
            id="godinaProizvodnje"
            type="number"
            value={value.godinaProizvodnje}
            onChange={(e) => setField("godinaProizvodnje", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor="obujamCm3">Obujam (cm³)</label>
          <input id="obujamCm3" type="number" value={value.obujamCm3} onChange={(e) => setField("obujamCm3", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="snagaKw">Snaga (kW)</label>
          <input id="snagaKw" type="number" value={value.snagaKw} onChange={(e) => setField("snagaKw", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor="boja">Boja</label>
          <input id="boja" value={value.boja} onChange={(e) => setField("boja", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
