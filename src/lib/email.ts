// E-mailadressen controleren: één patroon voor de hele site. Puur, dus ook bruikbaar
// in de browser en in tests.

/** Eenvoudige controle: iets@iets.iets, zonder spaties. */
export const EMAIL_PATROON = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Langste e-mailadres dat we accepteren (RFC 5321). */
export const MAX_EMAIL_LENGTE = 254;

/** Ziet de tekst eruit als een e-mailadres? (Alleen het patroon; geen lengtecontrole.) */
export function geldigEmail(s: string): boolean {
  return EMAIL_PATROON.test(s);
}

/** Genormaliseerd e-mailadres (kleine letters, zonder spaties eromheen), of null als het ongeldig is. */
export function normaliseerEmail(invoer: unknown): string | null {
  if (typeof invoer !== "string") return null;
  const e = invoer.trim().toLowerCase();
  return e.length <= MAX_EMAIL_LENGTE && EMAIL_PATROON.test(e) ? e : null;
}
