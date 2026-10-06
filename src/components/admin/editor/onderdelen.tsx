import type { ReactNode } from "react";
import { tekstZacht, toon } from "../stijl";
import { tellerKlasse } from "./regels";

// Kleine bouwstenen die de blog- en pagina-editor delen.

export type Melding = { soort: "ok" | "fout"; tekst: string[] };

export function Teller({ waarde, max }: { waarde: string; max: number }) {
  const n = waarde.length;
  return (
    <span className={`text-xs tabular-nums ${tellerKlasse(n, max)}`}>
      {n}/{max}
    </span>
  );
}

export function Meldingen({ soort, tekst }: Melding) {
  return (
    <div
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${
        soort === "ok"
          ? toon.groen
          : toon.rood
      }`}
    >
      {tekst.map((t, i) => (
        <p key={i}>{t}</p>
      ))}
    </div>
  );
}

export function Draaier() {
  return <span aria-hidden className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent align-[-3px]" />;
}

/**
 * Label (met eventueel een teller) boven een invoerveld, met uitleg eronder.
 * `uitlegAls` bepaalt het element van de uitleg: de blog gebruikt een `<p>`, de pagina-editor een `<div>`.
 */
export function Veld({
  label,
  htmlFor,
  teller,
  uitleg,
  uitlegAls = "p",
  children,
}: {
  label: string;
  htmlFor: string;
  teller?: ReactNode;
  uitleg?: ReactNode;
  uitlegAls?: "p" | "div";
  children: ReactNode;
}) {
  const Uitleg = uitlegAls;
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={htmlFor} className="text-sm font-medium">
          {label}
        </label>
        {teller}
      </div>
      {children}
      {uitleg && <Uitleg className={`text-xs ${tekstZacht}`}>{uitleg}</Uitleg>}
    </div>
  );
}

/** Aanvinkvakje met een vetgedrukte titel en optioneel een uitleg eronder. */
export function Vinkje({ checked, onChange, titel, uitleg }: { checked: boolean; onChange: (b: boolean) => void; titel: string; uitleg?: string }) {
  return (
    <label className="flex items-start gap-2 text-sm">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-0.5 size-4 accent-[var(--accent)]" />
      <span>
        <span className="font-medium">{titel}</span>
        {uitleg && <span className={`block text-xs ${tekstZacht}`}>{uitleg}</span>}
      </span>
    </label>
  );
}
