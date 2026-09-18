"use client";

import { useState } from "react";
import type { PersonalIdOcrResult } from "@/lib/schemas/ocr";
import OcrPhotoUpload from "./OcrPhotoUpload";
import styles from "./forms.module.css";

// Polja 1:1 prema Prisma Person modelu (prisma/schema.prisma) - sva su
// obavezna u shemi (email/telefon nisu na iskaznici, uvijek ručni unos).
export interface PersonFormState {
  ime: string;
  prezime: string;
  oib: string;
  adresa: string;
  grad: string;
  email: string;
  telefon: string;
  osobnaPrednjaUrl: string | null;
  osobnaStraznjaUrl: string | null;
}

export const emptyPersonForm: PersonFormState = {
  ime: "",
  prezime: "",
  oib: "",
  adresa: "",
  grad: "",
  email: "",
  telefon: "",
  osobnaPrednjaUrl: null,
  osobnaStraznjaUrl: null,
};

type OcrExtractableField = "ime" | "prezime" | "oib" | "adresa";

interface PersonFormProps {
  title: string;
  value: PersonFormState;
  onChange: (next: PersonFormState) => void;
  confirmed: boolean;
  onConfirmedChange: (confirmed: boolean) => void;
}

function mergeOcrResult(
  current: PersonFormState,
  result: PersonalIdOcrResult
): { next: PersonFormState; filledByOcr: (keyof PersonFormState)[] } {
  const filledByOcr: (keyof PersonFormState)[] = [];
  function pick(key: OcrExtractableField, ocrValue: string | undefined) {
    if (current[key]) return current[key];
    if (ocrValue) filledByOcr.push(key);
    return ocrValue ?? "";
  }

  return {
    next: {
      ...current,
      ime: pick("ime", result.ime),
      prezime: pick("prezime", result.prezime),
      oib: pick("oib", result.oib),
      adresa: pick("adresa", result.adresa),
    },
    filledByOcr,
  };
}

export default function PersonForm({ title, value, onChange, confirmed, onConfirmedChange }: PersonFormProps) {
  const [ocrFields, setOcrFields] = useState<Set<keyof PersonFormState>>(new Set());

  function setField<K extends keyof PersonFormState>(key: K, fieldValue: string) {
    onChange({ ...value, [key]: fieldValue });
    if (ocrFields.has(key)) {
      setOcrFields((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    }
    onConfirmedChange(false);
  }

  function handleOcrResult(result: PersonalIdOcrResult, slot: "prednja" | "straznja") {
    const { next, filledByOcr } = mergeOcrResult(value, result);
    const urlKey = slot === "prednja" ? "osobnaPrednjaUrl" : "osobnaStraznjaUrl";
    onChange({ ...next, [urlKey]: result.imageUrl ?? next[urlKey] });
    if (filledByOcr.length) {
      setOcrFields((prev) => new Set([...prev, ...filledByOcr]));
      onConfirmedChange(false);
    }
  }

  function renderLabel(key: keyof PersonFormState, text: string) {
    return (
      <label htmlFor={`${title}-${key}`}>
        {text}
        <span className={styles.required}> *</span>
        {ocrFields.has(key) ? <span className={styles.ocrBadge}>predloženo, provjeri</span> : null}
      </label>
    );
  }

  return (
    <div className={styles.section}>
      <h2 className={styles.sectionTitle}>{title}</h2>

      <div className={styles.ocrRow}>
        <OcrPhotoUpload<PersonalIdOcrResult>
          label="Prednja strana osobne iskaznice"
          endpoint="/api/ocr/personal-id"
          onResult={(result) => handleOcrResult(result, "prednja")}
        />
        <OcrPhotoUpload<PersonalIdOcrResult>
          label="Stražnja strana osobne iskaznice"
          endpoint="/api/ocr/personal-id"
          onResult={(result) => handleOcrResult(result, "straznja")}
        />
      </div>
      <p className={styles.hint}>
        Prepoznavanje je samo prijedlog — polja označena &ldquo;predloženo, provjeri&rdquo; obavezno pregledaj.
      </p>

      <div className={styles.grid}>
        <div className={styles.field}>
          {renderLabel("ime", "Ime")}
          <input id={`${title}-ime`} required value={value.ime} onChange={(e) => setField("ime", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("prezime", "Prezime")}
          <input
            id={`${title}-prezime`}
            required
            value={value.prezime}
            onChange={(e) => setField("prezime", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          {renderLabel("oib", "OIB")}
          <input id={`${title}-oib`} required value={value.oib} onChange={(e) => setField("oib", e.target.value)} />
        </div>
        <div className={styles.field}>
          {renderLabel("adresa", "Adresa")}
          <input
            id={`${title}-adresa`}
            required
            value={value.adresa}
            onChange={(e) => setField("adresa", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-grad`}>
            Grad<span className={styles.required}> *</span>
          </label>
          <input id={`${title}-grad`} required value={value.grad} onChange={(e) => setField("grad", e.target.value)} />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-email`}>
            Email<span className={styles.required}> *</span>
          </label>
          <input
            id={`${title}-email`}
            type="email"
            required
            value={value.email}
            onChange={(e) => setField("email", e.target.value)}
          />
        </div>
        <div className={styles.field}>
          <label htmlFor={`${title}-telefon`}>
            Telefon<span className={styles.required}> *</span>
          </label>
          <input
            id={`${title}-telefon`}
            required
            value={value.telefon}
            onChange={(e) => setField("telefon", e.target.value)}
          />
        </div>
      </div>

      <label className={styles.confirmCheckbox}>
        <input type="checkbox" required checked={confirmed} onChange={(e) => onConfirmedChange(e.target.checked)} />
        Pregledao/la sam podatke i potvrđujem da su točni.
      </label>
    </div>
  );
}
