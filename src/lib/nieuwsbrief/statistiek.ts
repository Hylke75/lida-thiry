// Cijfers voor het nieuwsbriefoverzicht in het beheer. Puur, zodat het te testen is.

import { TIJDZONE } from "../datum";

export interface ContactMoment {
  status: string;
  bevestigd_op: string | null;
  afgemeld_op: string | null;
  bijgewerkt_op: string | null;
}

export interface GroeiDag {
  /** yyyy-mm-dd (Nederlandse tijd). */
  datum: string;
  /** Aantal aangemelde contacten aan het eind van die dag. */
  totaal: number;
  /** Nieuwe aanmeldingen (bevestigd) op die dag. */
  nieuw: number;
  /** Vertrokken: afgemeld, gebounced of klacht. */
  weg: number;
}

const DAG_MS = 86_400_000;
const NL = new Intl.DateTimeFormat("sv-SE", {
  timeZone: TIJDZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** De kalenderdag (yyyy-mm-dd) in Nederland. */
export function nlDag(moment: Date | string): string {
  return NL.format(typeof moment === "string" ? new Date(moment) : moment);
}

/** Wanneer een contact van de lijst verdween (null = staat er nog op). */
function vertrokkenOp(c: ContactMoment): string | null {
  if (c.status === "afgemeld" || c.status === "klacht" || c.status === "gebounced") return c.afgemeld_op ?? c.bijgewerkt_op;
  return null;
}

/**
 * Aantal aangemelde contacten per dag over de laatste `dagen` dagen, terug
 * gerekend vanaf het huidige aantal. Een benadering: verwijderde contacten tellen
 * niet mee.
 */
export function groeiReeks(
  huidig: number,
  contacten: readonly ContactMoment[],
  dagen: number,
  nu: Date = new Date(),
): GroeiDag[] {
  const vandaag = Date.parse(`${nlDag(nu)}T00:00:00Z`);
  const datums = Array.from({ length: dagen }, (_, i) =>
    new Date(vandaag - (dagen - 1 - i) * DAG_MS).toISOString().slice(0, 10),
  );
  const index = new Map(datums.map((d, i) => [d, i]));
  const nieuw = new Array<number>(dagen).fill(0);
  const weg = new Array<number>(dagen).fill(0);

  for (const c of contacten) {
    // Alleen wie ooit (bevestigd) aangemeld was; onbevestigde aanmeldingen tellen niet.
    if (!c.bevestigd_op) continue;
    const vertrokken = vertrokkenOp(c);
    if (c.status !== "aangemeld" && !vertrokken) continue;
    const i = index.get(nlDag(c.bevestigd_op));
    if (i !== undefined) nieuw[i]++;
    if (vertrokken) {
      const i = index.get(nlDag(vertrokken));
      if (i !== undefined) weg[i]++;
    }
  }

  const uit: GroeiDag[] = new Array(dagen);
  let totaal = huidig;
  for (let i = dagen - 1; i >= 0; i--) {
    uit[i] = { datum: datums[i], totaal: Math.max(0, totaal), nieuw: nieuw[i], weg: weg[i] };
    totaal = totaal - nieuw[i] + weg[i];
  }
  return uit;
}

/** Som van nieuw en weg over de laatste `dagen` dagen van een reeks. */
export function somLaatste(reeks: readonly GroeiDag[], dagen: number): { nieuw: number; weg: number } {
  return reeks.slice(-dagen).reduce((s, d) => ({ nieuw: s.nieuw + d.nieuw, weg: s.weg + d.weg }), { nieuw: 0, weg: 0 });
}

export interface CampagneCijfers {
  verzonden: number;
  geopend: number;
  geklikt: number;
}

/** Percentage (afgerond op 1 decimaal), of null als er niets is verzonden. */
export function percentage(deel: number, geheel: number): number | null {
  return geheel > 0 ? Math.round((deel / geheel) * 1000) / 10 : null;
}

/** Gemiddeld open- en klikpercentage over campagnes (elke campagne telt even zwaar). */
export function gemiddeldePercentages(campagnes: readonly CampagneCijfers[]): {
  open: number | null;
  klik: number | null;
} {
  const met = campagnes.filter((c) => c.verzonden > 0);
  if (!met.length) return { open: null, klik: null };
  const gem = (f: (c: CampagneCijfers) => number) =>
    Math.round((met.reduce((s, c) => s + f(c) / c.verzonden, 0) / met.length) * 1000) / 10;
  return { open: gem((c) => c.geopend), klik: gem((c) => c.geklikt) };
}
