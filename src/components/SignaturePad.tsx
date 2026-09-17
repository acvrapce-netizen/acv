"use client";

import { useEffect, useRef, useState } from "react";
import styles from "./SignaturePad.module.css";

interface SignaturePadProps {
  onChange: (dataUrl: string | null) => void;
}

// Vlastita, minimalna implementacija (canvas + pointer eventi) umjesto
// react-signature-canvas - izbjegava novu ovisnost, i poznati bug s
// getTrimmedCanvas() ("trim-canvas" baca grešku u tom bundle okruženju,
// vidi Rent-a-Car Manager PROGRESS.md) tako što uopće ne trimamo canvas.
export default function SignaturePad({ onChange }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const drawingRef = useRef(false);
  const [isEmpty, setIsEmpty] = useState(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Fizička rezolucija canvasa prati devicePixelRatio da potpis ne bude
    // mutan na mobitelu, dok CSS veličina ostaje deklarirana u pikselima.
    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    ctx.scale(ratio, ratio);
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#ededed";

    function getPos(e: PointerEvent) {
      const r = canvas!.getBoundingClientRect();
      return { x: e.clientX - r.left, y: e.clientY - r.top };
    }

    function handlePointerDown(e: PointerEvent) {
      drawingRef.current = true;
      const { x, y } = getPos(e);
      ctx!.beginPath();
      ctx!.moveTo(x, y);
    }
    function handlePointerMove(e: PointerEvent) {
      if (!drawingRef.current) return;
      const { x, y } = getPos(e);
      ctx!.lineTo(x, y);
      ctx!.stroke();
      setIsEmpty(false);
    }
    function handlePointerUp() {
      drawingRef.current = false;
    }

    canvas.addEventListener("pointerdown", handlePointerDown);
    canvas.addEventListener("pointermove", handlePointerMove);
    window.addEventListener("pointerup", handlePointerUp);
    return () => {
      canvas.removeEventListener("pointerdown", handlePointerDown);
      canvas.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", handlePointerUp);
    };
  }, []);

  function handleClear() {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (canvas && ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    onChange(null);
  }

  function handleDone() {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    onChange(canvas.toDataURL("image/png"));
  }

  return (
    <div className={styles.wrapper}>
      <canvas
        ref={canvasRef}
        className={styles.canvas}
        style={{ touchAction: "none" }}
        onPointerUp={handleDone}
      />
      <button type="button" className={styles.clearButton} onClick={handleClear}>
        Obriši potpis
      </button>
    </div>
  );
}
