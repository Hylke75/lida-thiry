// Pure prijslogica: kortingen, btw-splitsing, factuurnummers en cadeauboncodes.
// Geen server-only imports, zodat dit los te testen is.

export type KortingSoort = "percentage" | "bedrag";

export interface Kortingscode {
  code: string;
  soort: KortingSoort;
  /** percentage: hele procenten (1-100); bedrag: centen. */
  waarde: number;
  geldig_tot: string | null;
  max_gebruik: number | null;
  aantal_gebruikt: number;
  actief: boolean;
}

/** Normaliseert een ingevoerde code: hoofdletters, zonder spaties. */
export function normaliseerCode(invoer: string): string {
  return invoer.replace(/\s+/g, "").toUpperCase();
}

/**
 * Controleert of een code (nog) bruikbaar is. Geeft een Nederlandstalige
 * foutmelding terug, of null als de code geldig is.
 */
export function controleerKortingscode(code: Kortingscode | null, nu: Date = new Date()): string | null {
  if (!code || !code.actief) return "Deze kortingscode is niet geldig.";
  if (code.geldig_tot && new Date(code.geldig_tot) <= nu) return "Deze kortingscode is verlopen.";
  if (code.max_gebruik !== null && code.aantal_gebruikt >= code.max_gebruik) {
    return "Deze kortingscode is al gebruikt.";
  }
  return null;
}

/** Berekent korting en eindbedrag (in centen). Korting is nooit hoger dan de prijs. */
export function berekenKorting(
  prijsCent: number,
  code: Pick<Kortingscode, "soort" | "waarde"> | null,
): { kortingCent: number; eindbedragCent: number } {
  const prijs = Math.max(0, Math.round(prijsCent));
  if (!code || code.waarde <= 0) return { kortingCent: 0, eindbedragCent: prijs };
  let korting =
    code.soort === "percentage"
      ? Math.round((prijs * Math.min(code.waarde, 100)) / 100)
      : Math.round(code.waarde);
  korting = Math.min(Math.max(korting, 0), prijs);
  return { kortingCent: korting, eindbedragCent: prijs - korting };
}

/** Splitst een bedrag inclusief btw in een bedrag exclusief btw en het btw-deel. */
export function btwSplitsing(
  inclCent: number,
  tariefProcent = 21,
): { exclCent: number; btwCent: number; inclCent: number } {
  const incl = Math.round(inclCent);
  const excl = Math.round((incl * 100) / (100 + tariefProcent));
  return { exclCent: excl, btwCent: incl - excl, inclCent: incl };
}

/** Factuurnummer in het formaat LT-2026-0001. */
export function formatteerFactuurnummer(jaar: number, volgnummer: number): string {
  return `LT-${jaar}-${String(volgnummer).padStart(4, "0")}`;
}

/** Kalenderjaar van een moment in Nederlandse tijd. */
export function jaarInNederland(moment: Date): number {
  return Number(
    new Intl.DateTimeFormat("nl-NL", { year: "numeric", timeZone: "Europe/Amsterdam" }).format(moment),
  );
}

/** Formatteert centen als bedrag, bijv. "€ 24,95". */
export function formatteerBedrag(cent: number, valuta = "EUR"): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(cent / 100);
}

// Zonder verwarrende tekens (0/O, 1/I/L).
const CODE_ALFABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

/** Maakt een cadeauboncode als CADEAU-XXXX-XXXX uit (minstens 8) willekeurige bytes. */
export function cadeauboncode(bytes: Uint8Array): string {
  if (bytes.length < 8) throw new Error("Minstens 8 bytes nodig.");
  const tekens = Array.from(bytes.slice(0, 8), (b) => CODE_ALFABET[b % CODE_ALFABET.length]);
  return `CADEAU-${tekens.slice(0, 4).join("")}-${tekens.slice(4).join("")}`;
}
