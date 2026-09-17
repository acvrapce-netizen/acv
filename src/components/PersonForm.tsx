"use client";

import type { PersonalIdOcrResult } from "@/lib/schemas/ocr";
import OcrPhotoUpload from "./OcrPhotoUpload";
import styles from "./forms.module.css";

// Polja 1:1 prema Prisma Person modelu (prisma/schema.prisma). email/telefon
// nisu na osobnoj iskaznici pa se uvijek unose ručno.
export interface PersonFormState {
  ime: string;
  prezime: string;
  oib: string;
  adresa: string;
  grad: string;
  email: string;
  telefon: string;
}

export const emptyPersonForm: PersonFormState = {
  ime: "",
  prezime: "",
  oib: "",
  adresa: "",
  grad: "",
  email: "",
  telefon: "",
};

interface PersonFormProps {
  title: string;
  value: PersonFormState;
  onChange: (next: PersonFormState) => void;
}

// Popunjava SAMO prazna polja - ne prepisuje ono što je korisnik već ručno
// unio/ispravio ili što je stiglo s druge fotografije (prednja/stražnja
// strana iskaznice).
function mergeOcrResult(current: PersonFormState, result: PersonalIdOcrResult): PersonFormState {
  return {
    ...current,
    ime: current.ime || result.ime || "",
    prezime: current.prezime || result.prezime || "",
    oib: current.oib || result.oib || "",
    adresa: current.adresa || result.adresa || "",
  };
}

export default function PersonForm({ title, value, onChange }: PersonFormProps) {
  function setField<K extends keyof PersonFormState>(key: K, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.ocrRow}>
        <OcrPhotoUpload<PersonalIdOcrResult>
          label="Prednja strana osobne iskaznice"
          endpoint="/api/ocr/personal-id"
          onResult={(result) => onChange(mergeOcrResult(value, result))}
        />
        <OcrPhotoUpload<PersonalIdOcrResult>
          label="Stražnja strana osobne iskaznice"
          endpoint="/api/ocr/personal-id"
          onResult={(result) => onChange(mergeOcrResult(value, result))}
        />
      </div>
      <p className={styles.hint}>
        Prepoznavanje je samo prijedlog — provjeri i po potrebi ispravi svako polje prije spremanja.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          <label htmlFor={`${title}-ime`}>Ime</label>
          <input id={`${title}-ime`} value={value.ime} onChange={(e) => setField("ime", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-prezime`}>Prezime</label>
          <input id={`${title}-prezime`} value={value.prezime} onChange={(e) => setField("prezime", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-oib`}>OIB</label>
          <input id={`${title}-oib`} value={value.oib} onChange={(e) => setField("oib", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-adresa`}>Adresa</label>
          <input id={`${title}-adresa`} value={value.adresa} onChange={(e) => setField("adresa", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-grad`}>Grad</label>
          <input id={`${title}-grad`} value={value.grad} onChange={(e) => setField("grad", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-email`}>Email</label>
          <input id={`${title}-email`} type="email" value={value.email} onChange={(e) => setField("email", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-telefon`}>Telefon</label>
          <input id={`${title}-telefon`} value={value.telefon} onChange={(e) => setField("telefon", e.target.value)} />
        </div>
      </div>
    </div>
  );
}
