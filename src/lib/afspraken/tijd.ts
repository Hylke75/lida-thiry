// Rekenen met Nederlandse tijd (Europe/Amsterdam) zonder externe bibliotheek.
// Beschikbaarheid staat in de database als wandkloktijd ("09:00" op maandag);
// afspraken en blokkades als UTC-tijdstip. Deze helpers vertalen tussen beide,
// inclusief de overgang naar zomer- en wintertijd. Puur en te testen.

export const TIJDZONE = "Europe/Amsterdam";
const MINUUT = 60_000;
const DAG = 24 * 60 * MINUUT;

const DATUM_PATROON = /^(\d{4})-(\d{2})-(\d{2})$/;
const TIJD_PATROON = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

let formatter: Intl.DateTimeFormat | null = null;
function delenFormatter(): Intl.DateTimeFormat {
  formatter ??= new Intl.DateTimeFormat("en-US", {
    timeZone: TIJDZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return formatter;
}

interface Delen {
  jaar: number;
  maand: number;
  dag: number;
  uur: number;
  minuut: number;
  seconde: number;
}

function lokaleDelen(t: Date): Delen {
  const d: Record<string, number> = {};
  for (const p of delenFormatter().formatToParts(t)) {
    if (p.type !== "literal") d[p.type] = Number(p.value);
  }
  return { jaar: d.year, maand: d.month, dag: d.day, uur: d.hour === 24 ? 0 : d.hour, minuut: d.minute, seconde: d.second };
}

/** Verschil tussen Nederlandse tijd en UTC op dit tijdstip, in minuten (+60 of +120). */
export function afwijkingMinuten(t: Date): number {
  const d = lokaleDelen(t);
  const alsUtc = Date.UTC(d.jaar, d.maand - 1, d.dag, d.uur, d.minuut, d.seconde);
  return Math.round((alsUtc - Math.floor(t.getTime() / 1000) * 1000) / MINUUT);
}

const tweeCijfers = (n: number) => String(n).padStart(2, "0");

/** "2026-03-29" → { jaar, maand, dag }, of null bij een ongeldige datum. */
export function leesDatum(datum: string): { jaar: number; maand: number; dag: number } | null {
  const m = DATUM_PATROON.exec(datum);
  if (!m) return null;
  const [jaar, maand, dag] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const controle = new Date(Date.UTC(jaar, maand - 1, dag));
  if (controle.getUTCFullYear() !== jaar || controle.getUTCMonth() !== maand - 1 || controle.getUTCDate() !== dag) return null;
  return { jaar, maand, dag };
}

/** "09:30" of "09:30:00" → minuten na middernacht (0 … 1440), of null. "24:00" mag. */
export function tijdNaarMinuten(tijd: string): number | null {
  const m = TIJD_PATROON.exec(tijd.trim());
  if (!m) return null;
  const uur = Number(m[1]);
  const minuut = Number(m[2]);
  if (minuut > 59 || uur > 24 || (uur === 24 && minuut > 0)) return null;
  return uur * 60 + minuut;
}

/**
 * Eindtijd van een beschikbaarheidsblok → minuten (0 … 1440). Middernacht aan
 * het eind van de dag mag als "24:00", "00:00" of "23:59" (een tijdveld in de
 * browser kent geen 24:00): dat is allemaal 1440, zodat het laatste slot van de
 * dag niet wegvalt.
 */
export function eindtijdNaarMinuten(tijd: string): number | null {
  const m = tijdNaarMinuten(tijd);
  return m === 0 || m === 1439 ? 1440 : m;
}

/** Minuten na middernacht → "09:30". */
export function minutenNaarTijd(minuten: number): string {
  return `${tweeCijfers(Math.floor(minuten / 60))}:${tweeCijfers(minuten % 60)}`;
}

/** Kalenderdatum + aantal dagen ("2026-03-31" + 1 → "2026-04-01"). */
export function datumPlusDagen(datum: string, dagen: number): string {
  const d = leesDatum(datum);
  if (!d) throw new Error(`Ongeldige datum: ${datum}`);
  const t = new Date(Date.UTC(d.jaar, d.maand - 1, d.dag) + dagen * DAG);
  return `${t.getUTCFullYear()}-${tweeCijfers(t.getUTCMonth() + 1)}-${tweeCijfers(t.getUTCDate())}`;
}

/** Aantal kalenderdagen van `van` tot `tot` (kan negatief zijn). */
export function dagenTussen(van: string, tot: string): number {
  const a = leesDatum(van);
  const b = leesDatum(tot);
  if (!a || !b) throw new Error("Ongeldige datum");
  return Math.round((Date.UTC(b.jaar, b.maand - 1, b.dag) - Date.UTC(a.jaar, a.maand - 1, a.dag)) / DAG);
}

/** Weekdag van een kalenderdatum: 1 = maandag … 7 = zondag. */
export function weekdagVan(datum: string): number {
  const d = leesDatum(datum);
  if (!d) throw new Error(`Ongeldige datum: ${datum}`);
  const w = new Date(Date.UTC(d.jaar, d.maand - 1, d.dag)).getUTCDay(); // 0 = zondag
  return w === 0 ? 7 : w;
}

/** De maandag van de week waarin `datum` valt. */
export function maandagVan(datum: string): string {
  return datumPlusDagen(datum, 1 - weekdagVan(datum));
}

/** Nederlandse kalenderdatum en kloktijd van een tijdstip. */
export function naarAmsterdam(t: Date): { datum: string; tijd: string; minuten: number; weekdag: number } {
  const d = lokaleDelen(t);
  const datum = `${d.jaar}-${tweeCijfers(d.maand)}-${tweeCijfers(d.dag)}`;
  return { datum, tijd: `${tweeCijfers(d.uur)}:${tweeCijfers(d.minuut)}`, minuten: d.uur * 60 + d.minuut, weekdag: weekdagVan(datum) };
}

/**
 * Nederlandse wandkloktijd → UTC-tijdstip. `minuten` mag 1440 zijn (middernacht
 * aan het eind van de dag). Bij de overgang naar wintertijd bestaat 02:30 twee
 * keer: dan geldt de eerste (zomertijd). Bij de overgang naar zomertijd bestaat
 * 02:30 niet: dan schuift de tijd een uur op (03:30), zoals agenda's doen.
 */
export function vanAmsterdam(datum: string, minuten: number): Date {
  const d = leesDatum(datum);
  if (!d) throw new Error(`Ongeldige datum: ${datum}`);
  const alsUtc = Date.UTC(d.jaar, d.maand - 1, d.dag) + minuten * MINUUT;
  const afwijkingen = [...new Set([afwijkingMinuten(new Date(alsUtc - DAG)), afwijkingMinuten(new Date(alsUtc + DAG))])];
  const verwacht = { datum: datumPlusDagen(datum, Math.floor(minuten / 1440)), minuten: minuten % 1440 };
  const kandidaten = afwijkingen
    .map((a) => new Date(alsUtc - a * MINUUT))
    .filter((t) => {
      const l = naarAmsterdam(t);
      return l.datum === verwacht.datum && l.minuten === verwacht.minuten;
    })
    .sort((a, b) => a.getTime() - b.getTime());
  if (kandidaten.length) return kandidaten[0];
  // Bestaat niet (zomertijdgat): de afwijking van vóór de overgang gebruiken.
  return new Date(alsUtc - afwijkingMinuten(new Date(alsUtc - DAG)) * MINUUT);
}

/** Vandaag in Nederland ("2026-10-04"). */
export function vandaagAmsterdam(nu: Date): string {
  return naarAmsterdam(nu).datum;
}

/**
 * Het venster voor afspraakherinneringen: vanaf nu tot het einde van morgen
 * (Nederlandse datum). Afspraken die na de vorige run zijn geboekt of bevestigd,
 * vallen er zo ook nog in.
 */
export function herinneringVenster(nu: Date): { van: Date; tot: Date } {
  return { van: nu, tot: vanAmsterdam(datumPlusDagen(vandaagAmsterdam(nu), 2), 0) };
}

const DATUM_LANG = new Intl.DateTimeFormat("nl-NL", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  timeZone: TIJDZONE,
});
const DATUM_KORT = new Intl.DateTimeFormat("nl-NL", { weekday: "short", day: "numeric", month: "short", timeZone: TIJDZONE });

/** "maandag 5 oktober 2026" */
export function datumLabel(t: Date | string): string {
  return DATUM_LANG.format(typeof t === "string" ? new Date(t) : t);
}

/** "ma 5 okt" */
export function datumKortLabel(t: Date | string): string {
  return DATUM_KORT.format(typeof t === "string" ? new Date(t) : t);
}

/** "14:30" in Nederlandse tijd. */
export function tijdLabel(t: Date | string): string {
  return naarAmsterdam(typeof t === "string" ? new Date(t) : t).tijd;
}

/** Een kalenderdatum ("2026-10-05") als "maandag 5 oktober 2026" (zonder tijdzonegedoe). */
export function kalenderdatumLabel(datum: string): string {
  return datumLabel(vanAmsterdam(datum, 12 * 60));
}
