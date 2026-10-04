"use client";

import { useState } from "react";

/** Knop die de link naar het bericht kopieert (met terugval als het klembord niet mag). */
export function KopieerLink({ url, className = "" }: { url: string; className?: string }) {
  const [status, setStatus] = useState<"" | "gekopieerd" | "mislukt">("");

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("gekopieerd");
    } catch {
      // Oudere browsers of geweigerde toestemming: laat de link zien om zelf te kopiëren.
      window.prompt("Kopieer de link:", url);
      setStatus("mislukt");
    }
    window.setTimeout(() => setStatus(""), 2500);
  }

  return (
    <button type="button" onClick={kopieer} className={className}>
      <span aria-live="polite">{status === "gekopieerd" ? "Link gekopieerd" : "Kopieer link"}</span>
    </button>
  );
}
