"use client";

import { useState } from "react";

/** Knop die de link naar het bericht kopieert (met terugval als het klembord niet mag). */
const STANDAARD = { kopieer: "Kopieer link", gekopieerd: "Link gekopieerd", vraag: "Kopieer de link:" };

export function KopieerLink({
  url,
  className = "",
  teksten = STANDAARD,
}: {
  url: string;
  className?: string;
  /** Beheerbare teksten (Beheer → Teksten → Blog → Onder elk bericht). */
  teksten?: { kopieer: string; gekopieerd: string; vraag: string };
}) {
  const [status, setStatus] = useState<"" | "gekopieerd" | "mislukt">("");

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(url);
      setStatus("gekopieerd");
    } catch {
      // Oudere browsers of geweigerde toestemming: laat de link zien om zelf te kopiëren.
      window.prompt(teksten.vraag, url);
      setStatus("mislukt");
    }
    window.setTimeout(() => setStatus(""), 2500);
  }

  return (
    <button type="button" onClick={kopieer} className={className}>
      <span aria-live="polite">{status === "gekopieerd" ? teksten.gekopieerd : teksten.kopieer}</span>
    </button>
  );
}
