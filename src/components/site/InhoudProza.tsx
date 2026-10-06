import type { ReactNode } from "react";
import stijl from "./InhoudProza.module.css";

/**
 * Leesbare, redactionele opmaak voor beheerbare tekst (<Opmaak>): seriefkoppen,
 * 16/1,65 lopende tekst, berry links met onderstreping (offset 5 px), lijsten
 * met koraalkleurige vinkjes en afbeeldingen met afgeronde hoeken. De breedte
 * (max. ~720 px) bepaalt de ouder.
 *
 * - `intro`: de eerste alinea als intro (18–19 px), voor blogberichten.
 * - `juridisch`: rustige opsommingstekens en kleinere koppen (privacy, voorwaarden).
 */
export function InhoudProza({
  children,
  intro = false,
  juridisch = false,
  className = "",
}: {
  children: ReactNode;
  intro?: boolean;
  juridisch?: boolean;
  className?: string;
}) {
  const klassen = [stijl.proza, intro && stijl.intro, juridisch && stijl.juridisch, className].filter(Boolean).join(" ");
  return <div className={klassen}>{children}</div>;
}

/** Omslag van een blok binnen de tekst ({contactformulier}, …): ruimte erboven en eronder, geen tekstopmaak. */
export function InhoudBlok({ children }: { children: ReactNode }) {
  return <div className={`${stijl.blok} min-w-0`}>{children}</div>;
}
