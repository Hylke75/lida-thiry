// Pure hulpjes voor de publieke blog: paginering, filter-URL's, datums en
// "Lees ook". Geen database of Next.js hier, zodat alles los te testen is.

import type { BlogBericht } from "./regels";
import { datumLang } from "../datum";

/** Aantal berichten per pagina in het overzicht. */
export const PER_PAGINA = 9;

/** Leest ?pagina= (tekst of lijst) als geheel getal ≥ 1; alles wat raar is wordt 1. */
export function leesPagina(ruw: string | string[] | undefined): number {
  const waarde = Array.isArray(ruw) ? ruw[0] : ruw;
  if (!waarde || !/^\d{1,6}$/.test(waarde)) return 1;
  return Math.max(1, Number(waarde));
}

/** Leest een tekstparameter (eerste waarde, ingekort en getrimd); leeg wordt undefined. */
export function leesFilter(ruw: string | string[] | undefined, max = 60): string | undefined {
  const waarde = (Array.isArray(ruw) ? ruw[0] : ruw)?.trim().slice(0, max);
  return waarde ? waarde : undefined;
}

export interface Paginering {
  /** Huidige pagina, begrensd tot het bestaande aantal pagina's. */
  pagina: number;
  /** Aantal pagina's (minimaal 1). */
  paginas: number;
  /** Eerste en laatste index (inclusief) voor een range-query. */
  van: number;
  tot: number;
  vorige: number | null;
  volgende: number | null;
}

export function paginering(totaal: number, pagina: number, perPagina = PER_PAGINA): Paginering {
  const per = Math.max(1, Math.floor(perPagina));
  const paginas = Math.max(1, Math.ceil(Math.max(0, totaal) / per));
  const p = Math.min(Math.max(1, Math.floor(pagina) || 1), paginas);
  const van = (p - 1) * per;
  return {
    pagina: p,
    paginas,
    van,
    tot: van + per - 1,
    vorige: p > 1 ? p - 1 : null,
    volgende: p < paginas ? p + 1 : null,
  };
}

/**
 * Paginanummers voor de navigatie, met "…" voor weggelaten stukken:
 * 1 … 4 5 6 … 12. Eerste, laatste en de buren van de huidige pagina blijven staan.
 */
export function paginaNummers(huidig: number, paginas: number): (number | "…")[] {
  if (paginas <= 7) return Array.from({ length: paginas }, (_, i) => i + 1);
  const zichtbaar = new Set([1, paginas, huidig - 1, huidig, huidig + 1]);
  const uit: (number | "…")[] = [];
  let vorige = 0;
  for (let i = 1; i <= paginas; i++) {
    if (!zichtbaar.has(i)) continue;
    if (i - vorige === 2) uit.push(i - 1);
    else if (i - vorige > 2) uit.push("…");
    uit.push(i);
    vorige = i;
  }
  return uit;
}

/** Het adres van het blogoverzicht met filters; pagina 1 en lege filters worden weggelaten. */
export function blogHref(f: { categorie?: string | null; tag?: string | null; pagina?: number } = {}): string {
  const q = new URLSearchParams();
  if (f.categorie) q.set("categorie", f.categorie);
  if (f.tag) q.set("tag", f.tag);
  if (f.pagina && f.pagina > 1) q.set("pagina", String(f.pagina));
  const s = q.toString();
  return s ? `/blog?${s}` : "/blog";
}

/** Datum als "4 oktober 2026" (Nederlandse tijd, zodat een bericht om 00:30 niet op de vorige dag valt). */
export function formatteerDatum(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return datumLang(d);
}

type Vergelijkbaar = Pick<BlogBericht, "id" | "tags" | "categorie" | "gepubliceerd_op">;

/**
 * Kiest "Lees ook"-berichten: eerst berichten met dezelfde tags (elke gedeelde
 * tag telt zwaar) of dezelfde categorie, daarna aangevuld met de nieuwste.
 * Bij gelijke score wint het nieuwste bericht.
 */
export function kiesGerelateerd<T extends Vergelijkbaar>(bericht: Vergelijkbaar, kandidaten: readonly T[], n: number): T[] {
  const tags = new Set(bericht.tags.map((t) => t.toLowerCase()));
  const categorie = bericht.categorie?.trim().toLowerCase() || null;
  const tijd = (b: Vergelijkbaar) => (b.gepubliceerd_op ? new Date(b.gepubliceerd_op).getTime() : 0);
  return kandidaten
    .filter((k) => k.id !== bericht.id)
    .map((k) => ({
      k,
      score:
        k.tags.filter((t) => tags.has(t.toLowerCase())).length * 2 +
        (categorie && k.categorie?.trim().toLowerCase() === categorie ? 1 : 0),
    }))
    .sort((a, b) => b.score - a.score || tijd(b.k) - tijd(a.k))
    .slice(0, Math.max(0, n))
    .map((s) => s.k);
}

/** Telt hoe vaak elke waarde voorkomt, gesorteerd op aantal (dan alfabetisch). */
export function telWaarden(waarden: readonly (string | null | undefined)[]): { naam: string; aantal: number }[] {
  const tellingen = new Map<string, number>();
  for (const w of waarden) {
    const naam = w?.trim();
    if (naam) tellingen.set(naam, (tellingen.get(naam) ?? 0) + 1);
  }
  return [...tellingen]
    .map(([naam, aantal]) => ({ naam, aantal }))
    .sort((a, b) => b.aantal - a.aantal || a.naam.localeCompare(b.naam, "nl"));
}
