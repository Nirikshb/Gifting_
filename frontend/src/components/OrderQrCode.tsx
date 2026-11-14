"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";

type OrderQrCodeProps = {
  value: string;
  label: string;
  downloadName: string;
  caption?: string;
};

export function OrderQrCode({ value, label, downloadName, caption }: OrderQrCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    let cancelled = false;
    setReady(false);

    QRCode.toCanvas(canvas, value, {
      width: 168,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#1c1c1c",
        light: "#ffffff",
      },
    })
      .then(() => {
        if (!cancelled) setReady(true);
      })
      .catch(() => {
        if (!cancelled) setReady(false);
      });

    return () => {
      cancelled = true;
    };
  }, [value]);

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement("a");
    link.href = canvas.toDataURL("image/png");
    link.download = `${downloadName}.png`;
    link.click();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
      <canvas
        ref={canvasRef}
        width={168}
        height={168}
        aria-label={label}
        style={{
          width: 168,
          height: 168,
          borderRadius: 12,
          border: "1px solid #e5e0d6",
          background: "#fff",
        }}
      />
      {caption ? (
        <p style={{ margin: 0, color: "#6f6b5c", fontSize: 12.5, lineHeight: 1.5, textAlign: "center", maxWidth: 240 }}>
          {caption}
        </p>
      ) : null}
      <button
        type="button"
        onClick={download}
        disabled={!ready}
        style={{
          padding: "10px 16px",
          border: "1px solid #3f4034",
          borderRadius: 999,
          background: ready ? "#3f4034" : "#b8b3a4",
          color: "#f7f4ee",
          font: "inherit",
          fontSize: 12.5,
          fontWeight: 700,
          cursor: ready ? "pointer" : "not-allowed",
        }}
      >
        Download QR
      </button>
    </div>
  );
}
