// A/B-test van de onderwerpregel van een campagne. Puur: geen database.
//
// Werking: bij het starten gaat een testgroep (bijv. 20%: 10% krijgt onderwerp A,
// 10% onderwerp B, willekeurig verdeeld) in de wachtrij, met `variant` op de
// verzending. Is de testgroep verstuurd en de wachttijd voorbij (of drukt de
// beheerder op "Kies winnaar nu"), dan wint het onderwerp met het hoogste unieke
// openpercentage (bij gelijkspel: klikpercentage; dan A). Pas daarna gaat de rest
// van de doelgroep in de wachtrij, met het winnende onderwerp.
//
// Omdat er (nog) geen kolom voor de wachttijd is, bewaren we die in de
// doelgroep-JSON onder AB_WACHT_SLEUTEL; normaliseerDoelgroep negeert die sleutel.

export type Variant = "a" | "b";

export const AB_PERCENTAGE = { min: 10, max: 50, standaard: 20 } as const;
export const AB_WACHTUREN = { min: 1, max: 72, standaard: 4 } as const;
export const AB_WACHT_SLEUTEL = "abWachtUren";

export interface AbInstelling {
  onderwerpB: string;
  /** Deel van de doelgroep in de test (A en B samen), 10–50. */
  percentage: number;
  /** Uren wachten na het versturen van de testgroep. */
  wachtUren: number;
}

function geheel(v: unknown, min: number, max: number, standaard: number): number {
  const n = typeof v === "number" ? v : typeof v === "string" && v.trim() ? Number(v) : NaN;
  if (!Number.isFinite(n)) return standaard;
  return Math.min(max, Math.max(min, Math.round(n)));
}

/** Veilige A/B-instelling uit onbetrouwbare invoer; geen (geldig) onderwerp B → null (geen test). */
export function normaliseerAb(ruw: unknown, maxOnderwerp = 150): AbInstelling | null {
  if (!ruw || typeof ruw !== "object") return null;
  const o = ruw as Record<string, unknown>;
  const onderwerpB = typeof o.onderwerpB === "string" ? o.onderwerpB.replace(/\s+/g, " ").trim().slice(0, maxOnderwerp) : "";
  if (!onderwerpB) return null;
  return {
    onderwerpB,
    percentage: geheel(o.percentage, AB_PERCENTAGE.min, AB_PERCENTAGE.max, AB_PERCENTAGE.standaard),
    wachtUren: geheel(o.wachtUren, AB_WACHTUREN.min, AB_WACHTUREN.max, AB_WACHTUREN.standaard),
  };
}

export interface AbVelden {
  onderwerp_b?: string | null;
  ab_percentage?: number | null;
  ab_winnaar?: Variant | null;
  doelgroep?: unknown;
}

/** Of deze campagne een A/B-test van het onderwerp heeft. */
export function abActief(c: AbVelden): boolean {
  return !!c.onderwerp_b?.trim() && typeof c.ab_percentage === "number" && c.ab_percentage >= AB_PERCENTAGE.min && c.ab_percentage <= AB_PERCENTAGE.max;
}

/** De wachttijd (uren) uit de opgeslagen doelgroep-JSON. */
export function abWachtUren(doelgroep: unknown): number {
  const o = doelgroep && typeof doelgroep === "object" ? (doelgroep as Record<string, unknown>) : {};
  return geheel(o[AB_WACHT_SLEUTEL], AB_WACHTUREN.min, AB_WACHTUREN.max, AB_WACHTUREN.standaard);
}

/** De A/B-instelling van een opgeslagen campagne (null zonder test). */
export function abUitCampagne(c: AbVelden): AbInstelling | null {
  if (!abActief(c)) return null;
  return { onderwerpB: c.onderwerp_b!.trim(), percentage: c.ab_percentage!, wachtUren: abWachtUren(c.doelgroep) };
}

/** Doelgroep-JSON om op te slaan: de (genormaliseerde) doelgroep plus eventueel de wachttijd. */
export function doelgroepMetWachttijd<T extends object>(doelgroep: T, ab: AbInstelling | null): T & { [AB_WACHT_SLEUTEL]?: number } {
  return ab ? { ...doelgroep, [AB_WACHT_SLEUTEL]: ab.wachtUren } : { ...doelgroep };
}

/** Het onderwerp voor een verzending: per variant, of (zonder variant) het winnende onderwerp. */
export function onderwerpVoor(
  c: { onderwerp: string; onderwerp_b?: string | null; ab_winnaar?: Variant | null },
  variant: Variant | null | undefined,
): string {
  const b = c.onderwerp_b?.trim();
  if (!b) return c.onderwerp;
  const kies = variant ?? c.ab_winnaar ?? "a";
  return kies === "b" ? b : c.onderwerp;
}

/** Hoeveel ontvangers per variant in de testgroep, bij `aantal` ontvangers. */
export function testgroepGrootte(aantal: number, percentage: number): number {
  return Math.floor((aantal * percentage) / 200);
}

/**
 * Verdeelt de ontvangers willekeurig (Fisher-Yates) in testgroep A, testgroep B
 * en de rest. Te weinig ontvangers voor een test (minder dan één per variant) → null.
 */
export function splitsTestgroep<T>(
  ontvangers: readonly T[],
  percentage: number,
  willekeurig: () => number = Math.random,
): { a: T[]; b: T[]; rest: T[] } | null {
  const n = testgroepGrootte(ontvangers.length, percentage);
  if (n < 1) return null;
  const lijst = [...ontvangers];
  for (let i = lijst.length - 1; i > 0; i--) {
    const j = Math.floor(willekeurig() * (i + 1));
    [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
  }
  return { a: lijst.slice(0, n), b: lijst.slice(n, 2 * n), rest: lijst.slice(2 * n) };
}

export interface VariantCijfers {
  verzonden: number;
  /** Unieke openers. */
  geopend: number;
  /** Unieke klikkers. */
  geklikt: number;
  /** Nog in de wachtrij of bezig. */
  wachtrij: number;
  /** Laatste verzendmoment in deze variant. */
  laatsteVerzonden: string | null;
}

export const LEGE_VARIANT: VariantCijfers = { verzonden: 0, geopend: 0, geklikt: 0, wachtrij: 0, laatsteVerzonden: null };

const ratio = (deel: number, totaal: number) => (totaal > 0 ? deel / totaal : 0);

/** De winnaar: hoogste unieke openratio, bij gelijkspel de klikratio, anders A. */
export function bepaalWinnaar(a: VariantCijfers, b: VariantCijfers): { winnaar: Variant; reden: "open" | "klik" | "gelijk" } {
  const openA = ratio(a.geopend, a.verzonden);
  const openB = ratio(b.geopend, b.verzonden);
  if (openA !== openB) return { winnaar: openB > openA ? "b" : "a", reden: "open" };
  const klikA = ratio(a.geklikt, a.verzonden);
  const klikB = ratio(b.geklikt, b.verzonden);
  if (klikA !== klikB) return { winnaar: klikB > klikA ? "b" : "a", reden: "klik" };
  return { winnaar: "a", reden: "gelijk" };
}

/**
 * Wanneer de winnaar automatisch gekozen mag worden: de testgroep is helemaal
 * verwerkt én sinds de laatste testmail is de wachttijd voorbij. Werd er niets
 * verzonden (alles mislukt of overgeslagen), dan meteen, zodat de campagne niet
 * blijft hangen. Geeft het moment terug (null = nog niet te zeggen).
 */
export function beslismoment(a: VariantCijfers, b: VariantCijfers, wachtUren: number): Date | null {
  if (a.wachtrij + b.wachtrij > 0) return null;
  const laatste = [a.laatsteVerzonden, b.laatsteVerzonden]
    .filter((x): x is string => !!x)
    .map((x) => Date.parse(x))
    .filter(Number.isFinite);
  if (!laatste.length) return new Date(0);
  return new Date(Math.max(...laatste) + wachtUren * 3_600_000);
}

export function magBeslissen(a: VariantCijfers, b: VariantCijfers, wachtUren: number, nu: Date = new Date()): boolean {
  const m = beslismoment(a, b, wachtUren);
  return !!m && nu.getTime() >= m.getTime();
}
