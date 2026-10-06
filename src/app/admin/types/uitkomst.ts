/** Resultaat van een beheeractie op de adviestypes. */
export interface Uitkomst {
  ok: boolean;
  melding: string;
  /** Element-id waar de pagina daarna naartoe scrolt (bijv. een nieuwe sectie). */
  anker?: string;
  /** Uniek per uitvoering, zodat dezelfde melding opnieuw getoond wordt. */
  tijd: number;
}

/** Een beeld uit de beeldbank als zoekresultaat in de kiezer. */
export interface GevondenBeeld {
  id: string;
  code: string;
  naam: string | null;
  omschrijving: string | null;
  onderdeel: string | null;
  bijschrift: string | null;
  url: string | null;
}
