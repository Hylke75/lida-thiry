import type { ReactNode } from "react";

// Kleine bouwstenen voor de editor van één adviestype (servercomponenten).

export function Verborgen({ waarden }: { waarden: Record<string, string | number> }) {
  return (
    <>
      {Object.entries(waarden).map(([k, v]) => (
        <input key={k} type="hidden" name={k} value={v} />
      ))}
    </>
  );
}

/** Uitleg van de opmaak die de PDF begrijpt (zie schoon() en blokken() in de PDF-code). */
export function OpmaakUitleg() {
  return (
    <ul className="list-disc space-y-1 pl-5 text-xs leading-relaxed text-foreground/70">
      <li>
        <strong>Lege regel</strong> = nieuwe alinea. Regels direct onder elkaar
        (zonder lege regel) worden in de PDF aan elkaar geplakt tot één alinea.
      </li>
      <li>
        Een regel die begint met <code>- </code> (streepje en spatie) of{" "}
        <code>• </code> wordt een <strong>opsommingsteken</strong>.
      </li>
      <li>
        <code>**vet**</code> wordt <strong>vet</strong>, bijvoorbeeld voor
        modelnamen: <code>**Bootcut**: een taille die…</code>
      </li>
      <li>
        <code>*cursief*</code> wordt <em>cursief</em>, bijvoorbeeld voor een
        tip.
      </li>
      <li>
        Een backslash (<code>\</code>) aan het eind van een regel wordt
        weggelaten.
      </li>
    </ul>
  );
}

/** Kop boven een groep velden. */
export function GroepKop({ children }: { children: ReactNode }) {
  return (
    <h2 className="mt-2 border-b border-black/10 pb-1 text-sm font-semibold uppercase tracking-widest text-accent dark:border-white/15">
      {children}
    </h2>
  );
}
