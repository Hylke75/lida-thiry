// Conversietrechter en verkoopcijfers voor Beheer → Statistieken. Puur: krijgt
// bestellingen (uit onze eigen database) en een periode binnen en rekent. Alle
// dagen zijn kalenderdagen in Nederland (yyyy-mm-dd).

import { nlDag } from "../nieuwsbrief/statistiek";
import { isTestbestelling } from "../reviews/regels";

const DAG_MS = 86_400_000;
/** Langste eigen periode die we tonen. */
export const MAX_DAGEN = 366;

export const VASTE_PERIODES = [7, 30, 90] as const;

export interface Periode {
  /** Eerste dag (inclusief). */
  van: string;
  /** Laatste dag (inclusief). */
  tot: string;
  dagen: number;
  /** "7", "30", "90" of "eigen". */
  sleutel: string;
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function geldigeDatum(s: string | undefined): s is string {
  return !!s && DATUM.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) && new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);
}

function plusDagen(datum: string, n: number): string {
  return new Date(Date.parse(`${datum}T00:00:00Z`) + n * DAG_MS).toISOString().slice(0, 10);
}

function verschilDagen(van: string, tot: string): number {
  return Math.round((Date.parse(`${tot}T00:00:00Z`) - Date.parse(`${van}T00:00:00Z`)) / DAG_MS);
}

/**
 * De periode uit de zoekparameters: ?periode=7|30|90, of ?van=…&tot=… (eigen
 * periode). Ongeldig → laatste 30 dagen. Een eigen periode in de toekomst wordt
 * afgekapt op vandaag, omgedraaide datums worden gewisseld en de lengte is
 * hooguit MAX_DAGEN.
 */
export function bepaalPeriode(
  zoek: { periode?: string; van?: string; tot?: string },
  nu: Date = new Date(),
): Periode {
  const vandaag = nlDag(nu);
  if (geldigeDatum(zoek.van) && geldigeDatum(zoek.tot)) {
    let [van, tot] = zoek.van <= zoek.tot ? [zoek.van, zoek.tot] : [zoek.tot, zoek.van];
    if (tot > vandaag) tot = vandaag;
    if (van > tot) van = tot;
    if (verschilDagen(van, tot) + 1 > MAX_DAGEN) van = plusDagen(tot, -(MAX_DAGEN - 1));
    return { van, tot, dagen: verschilDagen(van, tot) + 1, sleutel: "eigen" };
  }
  const n = VASTE_PERIODES.find((p) => String(p) === zoek.periode) ?? 30;
  return { van: plusDagen(vandaag, -(n - 1)), tot: vandaag, dagen: n, sleutel: String(n) };
}

/** Alle dagen van de periode, op volgorde. */
export function dagenVan(p: Periode): string[] {
  return Array.from({ length: p.dagen }, (_, i) => plusDagen(p.van, i));
}

/** Of een moment binnen de periode valt (Nederlandse kalenderdagen). */
export function binnen(moment: string | null | undefined, p: Periode): boolean {
  if (!moment) return false;
  const d = nlDag(moment);
  return d >= p.van && d <= p.tot;
}

/**
 * Ruim begin- en eindmoment voor de databasequery (een dag marge voor de
 * tijdzone); precies filteren gebeurt daarna met binnen().
 */
export function queryGrenzen(p: Periode): { vanaf: string; totEnMet: string } {
  return {
    vanaf: `${plusDagen(p.van, -1)}T00:00:00Z`,
    totEnMet: `${plusDagen(p.tot, 2)}T00:00:00Z`,
  };
}

// Bestellingen --------------------------------------------------------------------------

export interface TrechterOrder {
  status: string;
  aangemaakt_op: string;
  betaald_op: string | null;
  bedrag_cent: number | null;
  korting_cent: number | null;
  kortingscode: string | null;
  mollie_payment_id: string | null;
  toegekend_type: string | null;
  /** Voor het herkennen van testbestellingen (voorbeeldadressen). */
  email?: string | null;
}

/**
 * Statussen waarbij er betaald is. Ook "handmatige_beoordeling" (oud) is betaald,
 * dus telt die overal hier mee: in de trechter, de omzet en de betalingen per dag.
 */
export const BETAALD = ["betaald", "test_afgerond", "advies_verzonden", "handmatige_beoordeling"];
/** Statussen waarbij de test is ingevuld. */
export const AFGEROND = ["test_afgerond", "advies_verzonden", "handmatige_beoordeling"];
/** Statussen die meetellen voor de omzet: dezelfde als BETAALD. */
export const OMZET = BETAALD;

type StapSleutel = "aangemaakt" | "betaald" | "afgerond" | "advies";

export interface TrechterStap {
  sleutel: StapSleutel;
  label: string;
  aantal: number;
  /** % van de vorige stap (null bij de eerste stap of als de vorige 0 is). */
  vanVorige: number | null;
  /** % van de eerste stap. */
  vanStart: number | null;
}

const LABELS: Record<StapSleutel, string> = {
  aangemaakt: "Bestelling aangemaakt",
  betaald: "Betaald",
  afgerond: "Test afgerond",
  advies: "Advies verzonden",
};

function pct(deel: number, geheel: number): number | null {
  return geheel > 0 ? Math.round((deel / geheel) * 1000) / 10 : null;
}

const isBetaald = (o: TrechterOrder) => BETAALD.includes(o.status);
const isAfgerond = (o: TrechterOrder) => AFGEROND.includes(o.status);

/**
 * De trechter over de bestellingen die in de periode zijn aangemaakt (een cohort):
 * elke stap telt hoeveel van die bestellingen die stap (al) hebben gehaald.
 * Testbestellingen tellen niet mee.
 */
export function berekenTrechter(orders: readonly TrechterOrder[], p: Periode): TrechterStap[] {
  const cohort = orders.filter((o) => !isTestbestelling(o) && binnen(o.aangemaakt_op, p));
  const betaald = cohort.filter(isBetaald);
  const aantallen: [StapSleutel, number][] = [
    ["aangemaakt", cohort.length],
    ["betaald", betaald.length],
    ["afgerond", betaald.filter(isAfgerond).length],
    ["advies", betaald.filter((o) => o.status === "advies_verzonden").length],
  ];
  return aantallen.map(([sleutel, aantal], i) => ({
    sleutel,
    label: LABELS[sleutel],
    aantal,
    vanVorige: i === 0 ? null : pct(aantal, aantallen[i - 1][1]),
    vanStart: i === 0 ? null : pct(aantal, aantallen[0][1]),
  }));
}

export interface Verkoop {
  /** Betaalde bestellingen in de periode (op betaaldatum). */
  betaald: number;
  /** Som van bedrag_cent (na korting). */
  omzetCent: number;
  /** Gemiddeld bedrag per betaalde bestelling (na korting); null zonder bestellingen. */
  gemiddeldCent: number | null;
  /** Betaalde bestellingen met een kortingscode of cadeaubon. */
  metKorting: number;
  /** Aandeel bestellingen met korting, in %. */
  kortingPct: number | null;
  /** Totaal weggegeven korting. */
  kortingCent: number;
}

/** Omzet en korting over de bestellingen die in de periode zijn betaald (zonder testbestellingen). */
export function berekenVerkoop(orders: readonly TrechterOrder[], p: Periode): Verkoop {
  const betaald = orders.filter(
    (o) => !isTestbestelling(o) && OMZET.includes(o.status) && binnen(o.betaald_op ?? o.aangemaakt_op, p),
  );
  const omzetCent = betaald.reduce((s, o) => s + Math.max(0, o.bedrag_cent ?? 0), 0);
  const metKorting = betaald.filter((o) => !!o.kortingscode);
  return {
    betaald: betaald.length,
    omzetCent,
    gemiddeldCent: betaald.length ? Math.round(omzetCent / betaald.length) : null,
    metKorting: metKorting.length,
    kortingPct: pct(metKorting.length, betaald.length),
    kortingCent: metKorting.reduce((s, o) => s + Math.max(0, o.korting_cent ?? 0), 0),
  };
}

/**
 * De meest toegekende figuurtypes (letter/code uit de typesleutel, bijv. "8X" → "X")
 * bij bestellingen die in de periode de test afrondden. Hoogste eerst.
 */
export function topFiguurtypes(
  orders: readonly (TrechterOrder & { afgerond_op?: string | null })[],
  p: Periode,
  max = 5,
): { code: string; aantal: number }[] {
  const tel = new Map<string, number>();
  for (const o of orders) {
    if (isTestbestelling(o) || !o.toegekend_type) continue;
    if (!binnen(o.afgerond_op ?? o.aangemaakt_op, p)) continue;
    const m = o.toegekend_type.match(/^(?:1[0-2]|[1-9])([A-Z]{1,3}|8)$/);
    if (!m) continue;
    tel.set(m[1], (tel.get(m[1]) ?? 0) + 1);
  }
  return [...tel.entries()]
    .map(([code, aantal]) => ({ code, aantal }))
    .sort((a, b) => b.aantal - a.aantal || a.code.localeCompare(b.code))
    .slice(0, max);
}

/** Aantal momenten per dag van de periode (dagen zonder momenten: 0). */
export function telPerDag(momenten: readonly (string | null | undefined)[], p: Periode): { datum: string; aantal: number }[] {
  const tel = new Map(dagenVan(p).map((d) => [d, 0]));
  for (const m of momenten) {
    if (!m) continue;
    const d = nlDag(m);
    if (tel.has(d)) tel.set(d, tel.get(d)! + 1);
  }
  return [...tel.entries()].map(([datum, aantal]) => ({ datum, aantal }));
}

/** Bestellingen per dag: aangemaakt en betaald (zonder testbestellingen). */
export function bestellingenPerDag(
  orders: readonly TrechterOrder[],
  p: Periode,
): { datum: string; aangemaakt: number; betaald: number }[] {
  const echt = orders.filter((o) => !isTestbestelling(o));
  const aangemaakt = telPerDag(
    echt.map((o) => o.aangemaakt_op),
    p,
  );
  const betaald = telPerDag(
    echt.filter((o) => OMZET.includes(o.status)).map((o) => o.betaald_op),
    p,
  );
  return aangemaakt.map((d, i) => ({ datum: d.datum, aangemaakt: d.aantal, betaald: betaald[i].aantal }));
}
