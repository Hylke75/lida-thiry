// De rekenkern van de afsprakenplanner: welke begintijden zijn er vrij? Puur
// (geen database, geen klok): alles gaat erin, de vrije tijden komen eruit. De
// server gebruikt dezelfde functies om vlak voor het opslaan opnieuw te
// controleren of een gekozen tijd nog vrij is.
//
// Regels:
// - Beschikbaarheid is per weekdag (1 = ma … 7 = zo) in Nederlandse tijd; een dag
//   kan meerdere blokken hebben. De afspraak zelf moet binnen één blok passen.
// - Begintijden liggen op een raster van 15 minuten (Nederlandse tijd).
// - Een bestaande afspraak bezet [start, eind + buffer van zijn soort]; de nieuwe
//   afspraak bezet [start, eind + eigen buffer]. Overlap = niet vrij.
// - Geannuleerde afspraken tellen niet mee; 'wacht_op_betaling' alleen zolang de
//   betaling loopt (standaard 30 minuten na aanmaken).
// - Blokkades (vrije dagen) mogen de afspraak zelf niet overlappen.
// - Minimaal X uur vooraf, maximaal Y dagen vooruit (vanaf vandaag in Nederland).

import { datumPlusDagen, eindtijdNaarMinuten, naarAmsterdam, tijdNaarMinuten, vandaagAmsterdam, vanAmsterdam, weekdagVan } from "./tijd";

export const RASTER_MINUTEN = 15;
export const BETAALTERMIJN_MINUTEN = 30;
const MINUUT = 60_000;

export interface BeschikbaarheidBlok {
  weekdag: number;
  /** "09:00" of "09:00:00" (Nederlandse tijd). */
  van: string;
  tot: string;
}

export interface Periode {
  van: string | Date;
  tot: string | Date;
}

export interface BezetteAfspraak {
  id?: string;
  start_op: string | Date;
  eind_op: string | Date;
  status: string;
  aangemaakt_op: string | Date;
  /** Buffer van de soort van deze afspraak; ontbreekt hij, dan geldt de buffer van de nieuwe afspraak. */
  buffer_minuten?: number | null;
}

export interface SlotInvoer {
  beschikbaarheid: readonly BeschikbaarheidBlok[];
  blokkades: readonly Periode[];
  afspraken: readonly BezetteAfspraak[];
  duurMinuten: number;
  bufferMinuten: number;
  minVoorafUren: number;
  maxVooruitDagen: number;
  nu: Date;
  /** Hoe lang een onbetaalde afspraak het tijdslot vasthoudt. */
  betaaltermijnMinuten?: number;
  /** Afspraak die genegeerd wordt (bij verzetten van een bestaande afspraak). */
  negeerId?: string;
}

export interface Tijdslot {
  /** ISO-tijdstip (UTC). */
  start: string;
  eind: string;
  /** "14:30" (Nederlandse tijd). */
  label: string;
}

export interface Dag {
  /** "2026-10-05" (Nederlandse kalenderdatum). */
  datum: string;
  tijden: Tijdslot[];
}

const ms = (t: string | Date) => (typeof t === "string" ? new Date(t).getTime() : t.getTime());

/** Of een afspraak (nog) een tijdslot bezet. */
export function telt(a: BezetteAfspraak, nu: Date, betaaltermijnMinuten = BETAALTERMIJN_MINUTEN): boolean {
  if (a.status === "geannuleerd") return false;
  if (a.status === "wacht_op_betaling") return ms(a.aangemaakt_op) > nu.getTime() - betaaltermijnMinuten * MINUUT;
  return true;
}

interface Interval {
  van: number;
  tot: number;
}

/** De bezette intervallen (ms), al rekening houdend met buffers en de statusregels. */
function bezetting(invoer: SlotInvoer): { afspraken: Interval[]; blokkades: Interval[] } {
  const termijn = invoer.betaaltermijnMinuten ?? BETAALTERMIJN_MINUTEN;
  const afspraken = invoer.afspraken
    .filter((a) => a.id === undefined || a.id !== invoer.negeerId)
    .filter((a) => telt(a, invoer.nu, termijn))
    .map((a) => ({
      van: ms(a.start_op),
      tot: ms(a.eind_op) + (a.buffer_minuten ?? invoer.bufferMinuten) * MINUUT,
    }));
  const blokkades = invoer.blokkades.map((b) => ({ van: ms(b.van), tot: ms(b.tot) }));
  return { afspraken, blokkades };
}

function botst(start: number, eind: number, buffer: number, bezet: { afspraken: Interval[]; blokkades: Interval[] }): boolean {
  const eindMetBuffer = eind + buffer * MINUUT;
  if (bezet.afspraken.some((b) => start < b.tot && b.van < eindMetBuffer)) return true;
  return bezet.blokkades.some((b) => start < b.tot && b.van < eind);
}

/** De tijdvensters (ms) van de beschikbaarheid op een Nederlandse kalenderdatum. */
export function vensters(beschikbaarheid: readonly BeschikbaarheidBlok[], datum: string): Interval[] {
  const weekdag = weekdagVan(datum);
  const uit: Interval[] = [];
  for (const b of beschikbaarheid) {
    if (b.weekdag !== weekdag) continue;
    const van = tijdNaarMinuten(b.van);
    const tot = eindtijdNaarMinuten(b.tot);
    if (van === null || tot === null || tot <= van) continue;
    uit.push({ van: vanAmsterdam(datum, van).getTime(), tot: vanAmsterdam(datum, tot).getTime() });
  }
  return uit.sort((a, b) => a.van - b.van);
}

/** Eerste rastertijd (op een kwartier) op of na `t`. */
function opRaster(t: number): number {
  const stap = RASTER_MINUTEN * MINUUT;
  return Math.ceil(t / stap) * stap;
}

/** Laatste Nederlandse kalenderdatum die nog geboekt mag worden. */
export function laatsteDatum(nu: Date, maxVooruitDagen: number): string {
  return datumPlusDagen(vandaagAmsterdam(nu), Math.max(0, Math.floor(maxVooruitDagen)));
}

/** De vrije begintijden op één Nederlandse kalenderdatum. */
export function tijdenOpDag(invoer: SlotInvoer, datum: string, bezet = bezetting(invoer)): Tijdslot[] {
  const vroegst = invoer.nu.getTime() + invoer.minVoorafUren * 60 * MINUUT;
  if (datum < vandaagAmsterdam(invoer.nu) || datum > laatsteDatum(invoer.nu, invoer.maxVooruitDagen)) return [];
  const duur = invoer.duurMinuten * MINUUT;
  const gezien = new Set<number>();
  const uit: Tijdslot[] = [];
  for (const v of vensters(invoer.beschikbaarheid, datum)) {
    for (let start = opRaster(v.van); start + duur <= v.tot; start += RASTER_MINUTEN * MINUUT) {
      if (start < vroegst || gezien.has(start)) continue;
      if (botst(start, start + duur, invoer.bufferMinuten, bezet)) continue;
      gezien.add(start);
      uit.push({
        start: new Date(start).toISOString(),
        eind: new Date(start + duur).toISOString(),
        label: naarAmsterdam(new Date(start)).tijd,
      });
    }
  }
  return uit.sort((a, b) => a.start.localeCompare(b.start));
}

/** Alle dagen (van vandaag tot max vooruit) met minstens één vrije begintijd. */
export function beschikbareDagen(invoer: SlotInvoer): Dag[] {
  if (invoer.duurMinuten <= 0) return [];
  const bezet = bezetting(invoer);
  const eerste = vandaagAmsterdam(invoer.nu);
  const laatste = laatsteDatum(invoer.nu, invoer.maxVooruitDagen);
  const uit: Dag[] = [];
  for (let datum = eerste; datum <= laatste; datum = datumPlusDagen(datum, 1)) {
    const tijden = tijdenOpDag(invoer, datum, bezet);
    if (tijden.length) uit.push({ datum, tijden });
  }
  return uit;
}

/** Of precies deze begintijd vrij is (dezelfde regels als de lijst met tijden). */
export function isVrij(invoer: SlotInvoer, start: Date | string): boolean {
  const t = ms(start);
  if (!Number.isFinite(t)) return false;
  const datum = naarAmsterdam(new Date(t)).datum;
  return tijdenOpDag(invoer, datum).some((s) => ms(s.start) === t);
}

/**
 * Afspraken en blokkades die een gegeven periode overlappen (voor een
 * waarschuwing bij handmatig inplannen in het beheer; los van de beschikbaarheid).
 */
export function conflicten(
  invoer: Pick<SlotInvoer, "afspraken" | "blokkades" | "bufferMinuten" | "nu" | "betaaltermijnMinuten" | "negeerId">,
  start: Date,
  eind: Date,
): { afspraken: BezetteAfspraak[]; blokkades: Periode[] } {
  const termijn = invoer.betaaltermijnMinuten ?? BETAALTERMIJN_MINUTEN;
  const s = start.getTime();
  const e = eind.getTime() + invoer.bufferMinuten * MINUUT;
  return {
    afspraken: invoer.afspraken.filter(
      (a) =>
        (a.id === undefined || a.id !== invoer.negeerId) &&
        telt(a, invoer.nu, termijn) &&
        s < ms(a.eind_op) + (a.buffer_minuten ?? invoer.bufferMinuten) * MINUUT &&
        ms(a.start_op) < e,
    ),
    blokkades: invoer.blokkades.filter((b) => s < ms(b.tot) && ms(b.van) < eind.getTime()),
  };
}
