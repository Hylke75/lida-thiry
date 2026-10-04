"use client";

import { useState, type MouseEvent } from "react";

/** Downloadt een CSV van de aangevinkte relaties (vinkjes `name="id"` in hetzelfde formulier). */
export function ExporteerSelectie({ className }: { className?: string }) {
  const [melding, setMelding] = useState<string | null>(null);
  const klik = (e: MouseEvent<HTMLButtonElement>) => {
    const form = e.currentTarget.form;
    const ids = form
      ? Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]:checked')).map((el) => el.value)
      : [];
    if (!ids.length) {
      setMelding("Selecteer eerst een of meer relaties.");
      return;
    }
    setMelding(null);
    const p = new URLSearchParams();
    for (const id of ids) p.append("id", id);
    // Een download (CSV), geen navigatie: via een tijdelijke link.
    const a = document.createElement("a");
    a.href = `/admin/adresboek/export?${p}`;
    a.download = "";
    document.body.appendChild(a);
    a.click();
    a.remove();
  };
  return (
    <>
      <button type="button" onClick={klik} className={className}>
        Exporteren (CSV)
      </button>
      {melding && (
        <span role="status" className="text-xs text-red-700 dark:text-red-300">
          {melding}
        </span>
      )}
    </>
  );
}

/** Kopieert tekst (bijv. het adres) naar het klembord. */
export function KopieerKnop({ tekst, children, className }: { tekst: string; children: React.ReactNode; className?: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);
  return (
    <button
      type="button"
      className={className}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(tekst);
          setGekopieerd(true);
          setTimeout(() => setGekopieerd(false), 2000);
        } catch {
          window.prompt("Kopieer het adres:", tekst);
        }
      }}
    >
      {gekopieerd ? "Gekopieerd ✓" : children}
    </button>
  );
}
