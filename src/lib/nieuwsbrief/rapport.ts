// Cijfers voor campagnes en automatische mails: tellen, percentages, filters voor
// de ontvangerslijst en CSV-export. Puur: geen database.

export interface Totalen {
  /** Alle verzendingen (ontvangers) van de campagne. */
  totaal: number;
  /** Nog te versturen (wachtrij of bezig met verwerken). */
  wachtrij: number;
  verzonden: number;
  mislukt: number;
  overgeslagen: number;
  /** Unieke ontvangers die de mail openden. */
  geopend: number;
  /** Unieke ontvangers die op een link klikten. */
  geklikt: number;
  afgemeld: number;
  gebounced: number;
}

export const LEGE_TOTALEN: Totalen = {
  totaal: 0,
  wachtrij: 0,
  verzonden: 0,
  mislukt: 0,
  overgeslagen: 0,
  geopend: 0,
  geklikt: 0,
  afgemeld: 0,
  gebounced: 0,
};

/** Zet een rij uit de databasefunctie nb_campagne_statistiek om (getallen kunnen als tekst komen). */
export function totalenUitRij(r: Record<string, unknown>): Totalen {
  const n = (k: keyof Totalen) => {
    const v = Number(r[k]);
    return Number.isFinite(v) && v > 0 ? Math.floor(v) : 0;
  };
  return {
    totaal: n("totaal"),
    wachtrij: n("wachtrij"),
    verzonden: n("verzonden"),
    mislukt: n("mislukt"),
    overgeslagen: n("overgeslagen"),
    geopend: n("geopend"),
    geklikt: n("geklikt"),
    afgemeld: n("afgemeld"),
    gebounced: n("gebounced"),
  };
}

/** Percentage (0-100, op één decimaal) van deel ten opzichte van geheel; null als geheel 0 is. */
export function percentage(deel: number, geheel: number): number | null {
  if (!(geheel > 0)) return null;
  const p = (Math.max(0, deel) / geheel) * 100;
  return Math.round(Math.min(p, 100) * 10) / 10;
}

/** Percentage als tekst, bijv. "42,5%", of "—" als er nog niets verzonden is. */
export function toonPercentage(deel: number, geheel: number): string {
  const p = percentage(deel, geheel);
  return p === null ? "—" : `${p.toLocaleString("nl-NL", { maximumFractionDigits: 1 })}%`;
}

export interface LinkTelling {
  url: string;
  /** Unieke ontvangers die erop klikten. */
  uniek: number;
  /** Totaal aantal kliks. */
  totaal: number;
}

// Filters voor de ontvangerslijst in het rapport ------------------------------------

export const ONTVANGER_FILTERS = {
  alle: "Iedereen",
  geopend: "Geopend",
  geklikt: "Geklikt",
  niet_geopend: "Niet geopend",
  mislukt: "Mislukt",
  afgemeld: "Afgemeld",
  wachtrij: "Nog te versturen",
} as const;

export type OntvangerFilter = keyof typeof ONTVANGER_FILTERS;

export function leesFilter(v: unknown): OntvangerFilter {
  return typeof v === "string" && v in ONTVANGER_FILTERS ? (v as OntvangerFilter) : "alle";
}

export const VERZEND_STATUS_LABEL: Record<string, string> = {
  wachtrij: "In de wachtrij",
  verwerken: "Wordt verstuurd",
  verzonden: "Verzonden",
  mislukt: "Mislukt",
  overgeslagen: "Overgeslagen",
};

// CSV -----------------------------------------------------------------------------

/**
 * Eén CSV-veld. Puntkomma als scheidingsteken (Nederlandse Excel). Velden die met
 * =, +, - of @ beginnen krijgen een apostrof, zodat Excel ze niet als formule uitvoert.
 */
export function csvVeld(waarde: string | number | null | undefined): string {
  let s = waarde === null || waarde === undefined ? "" : String(waarde);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function naarCsv(kop: readonly string[], rijen: readonly (readonly (string | number | null | undefined)[])[]): string {
  // BOM zodat Excel de tekens (é, ë) goed toont.
  return "﻿" + [kop, ...rijen].map((r) => r.map(csvVeld).join(";")).join("\r\n") + "\r\n";
}
