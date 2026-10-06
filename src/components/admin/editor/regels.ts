// Pure hulpfuncties voor de blog- en pagina-editor (zonder React), zodat ze te testen zijn.

import { tekstZacht } from "../stijl";

/** Kleur van een tekenteller: rood boven het maximum, oranje vanaf 90%, anders zacht. */
export function tellerKlasse(n: number, max: number): string {
  return n > max ? "font-medium text-red-700 dark:text-red-300" : n > max * 0.9 ? "text-amber-700 dark:text-amber-300" : tekstZacht;
}

/** Kort een tekst af op een woordgrens met " …" erachter (zoals Google dat doet). */
export function kortAf(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max - 1).replace(/\s+\S*$/, "")} …` : s;
}

/** Een webadres zoals Google het boven een zoekresultaat toont: zonder protocol, met › tussen de delen. */
export function googleAdres(url: string): string {
  return url.replace(/^https?:\/\//, "").replace(/\//g, " › ");
}

/** Of een omslagadres als voorbeeldfoto getoond kan worden (alleen https). */
export const toonbareOmslag = (url: string) => /^https:\/\//.test(url);

/**
 * De nieuwe velden na het kiezen van een omslagfoto uit de mediabibliotheek: de omschrijving
 * uit de bibliotheek wordt alleen overgenomen als er nog geen eigen omschrijving is.
 */
export function omslagUitBibliotheek(huidigeAlt: string, m: { url: string; alt: string }): { omslag_url: string; omslag_alt?: string } {
  return { omslag_url: m.url, ...(huidigeAlt.trim() || !m.alt ? {} : { omslag_alt: m.alt }) };
}

/** Of een toetsaanslag Ctrl+S of ⌘S is (opslaan). */
export const isOpslaanToets = (e: { ctrlKey: boolean; metaKey: boolean; key: string }) => (e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s";
