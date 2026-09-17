"use client";

import { useRef, useState } from "react";
import styles from "./OcrPhotoUpload.module.css";

interface OcrPhotoUploadProps<T> {
  label: string;
  endpoint: string;
  onResult: (result: T) => void;
}

// Generička komponenta za jedan OCR slot: fotografiraj/odaberi sliku,
// pošalji na dani endpoint, javi rezultat pozivatelju. NE sprema ništa sama
// - samo prosljeđuje prijedlog polja; forma koja je koristi mora prikazati
// polja korisniku na pregled/ispravak prije submita (pravni dokumenti).
export default function OcrPhotoUpload<T>({ label, endpoint, onResult }: OcrPhotoUploadProps<T>) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  async function handleFile(file: File) {
    setStatus("loading");
    setErrorMsg(null);
    setPreviewUrl(URL.createObjectURL(file));

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch(endpoint, { method: "POST", body: formData });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error ?? "ocr_failed");
      }
      onResult(data as T);
      setStatus("done");
    } catch (err) {
      console.error("OCR upload failed", err);
      setErrorMsg("Prepoznavanje nije uspjelo — unesi podatke ručno.");
      setStatus("error");
    }
  }

  return (
    <div className={styles.wrapper}>
      <button
        type="button"
        className={styles.button}
        onClick={() => inputRef.current?.click()}
        disabled={status === "loading"}
      >
        {previewUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={previewUrl} alt="" className={styles.thumbnail} />
        ) : (
          <span className={styles.icon}>📷</span>
        )}
        <span>
          {label}
          {status === "loading" && " — čitam..."}
          {status === "done" && " — pročitano, provjeri polja ispod"}
        </span>
      </button>
      {errorMsg ? <p className={styles.error}>{errorMsg}</p> : null}
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className={styles.hiddenInput}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleFile(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}
