// Datums en tijden in Nederlandse tijd (Europe/Amsterdam) zonder externe bibliotheek.
// De database bewaart UTC; beschikbaarheid voor afspraken staat er als wandkloktijd
// ("09:00" op maandag). Deze helpers vertalen tussen beide, inclusief de overgang
// naar zomer- en wintertijd, en maken datums leesbaar. Puur: bruikbaar in de
// browser, op de server en in tests.

/** De tijdzone van de site: alle datums en tijden zijn Nederlandse tijd. */
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
  return Math.round(afwijkingMs(t.getTime()) / MINUUT);
}

/** Verschil (in ms) tussen Nederlandse kloktijd en UTC op een bepaald moment. */
function afwijkingMs(utcMs: number): number {
  const d = lokaleDelen(new Date(utcMs));
  const alsUtc = Date.UTC(d.jaar, d.maand - 1, d.dag, d.uur, d.minuut, d.seconde);
  return alsUtc - Math.floor(utcMs / 1000) * 1000;
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

// Leesbare datums (Nederlandse tijd) -------------------------------------------------

/** Een kalenderdatum ("2026-10-12") geldt als die dag om 12:00 UTC; anders gewoon het tijdstip. */
function alsMoment(waarde: string | Date): Date {
  return typeof waarde === "string" && DATUM_PATROON.test(waarde) ? new Date(`${waarde}T12:00:00Z`) : new Date(waarde);
}

/** "12 oktober 2026". Accepteert yyyy-mm-dd, een ISO-tijdstip of een Date. */
export function datumLang(waarde: string | Date): string {
  return alsMoment(waarde).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIJDZONE,
  });
}

/** "12 okt 2026". Accepteert yyyy-mm-dd, een ISO-tijdstip of een Date. */
export function datum(waarde: string | Date): string {
  return alsMoment(waarde).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: TIJDZONE,
  });
}

/** "4 okt 2026, 14:03". */
export function datumTijd(waarde: string | Date): string {
  return new Date(waarde).toLocaleString("nl-NL", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIJDZONE,
  });
}

/** Als datumTijd, maar "—" bij geen of een ongeldig tijdstip. */
export function toonDatumTijd(moment: string | Date | null | undefined): string {
  if (!moment) return "—";
  const d = new Date(moment);
  if (!Number.isFinite(d.getTime())) return "—";
  return datumTijd(d);
}

// Inplannen (datetime-local-velden) ----------------------------------------------------

const INVOER = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/**
 * Zet de waarde van een `<input type="datetime-local">` (Nederlandse tijd, bijv.
 * "2026-10-25T09:30") om naar een Date (UTC). Geeft null bij ongeldige invoer.
 * Een tijd die door de overgang naar zomertijd niet bestaat (02:30 in maart)
 * schuift een uur op.
 */
export function amsterdamNaarUtc(invoer: string): Date | null {
  const m = INVOER.exec(invoer.trim());
  if (!m) return null;
  const [j, mnd, d, u, min] = m.slice(1).map(Number);
  if (mnd < 1 || mnd > 12 || d < 1 || d > 31 || u > 23 || min > 59) return null;
  const naief = Date.UTC(j, mnd - 1, d, u, min);
  // Controleer dat de datum echt bestaat (geen 31 februari).
  const check = new Date(naief);
  if (check.getUTCMonth() !== mnd - 1 || check.getUTCDate() !== d) return null;
  let utc = naief - afwijkingMs(naief);
  const tweede = afwijkingMs(utc);
  if (naief - tweede !== utc) utc = naief - tweede;
  return new Date(utc);
}

/** Zet een UTC-tijdstip om naar de waarde voor een datetime-local-veld (Nederlandse tijd). */
export function utcNaarAmsterdamInvoer(moment: string | Date): string {
  const ms = new Date(moment).getTime();
  if (!Number.isFinite(ms)) return "";
  const klok = new Date(ms + afwijkingMs(ms));
  const p = tweeCijfers;
  return `${klok.getUTCFullYear()}-${p(klok.getUTCMonth() + 1)}-${p(klok.getUTCDate())}T${p(klok.getUTCHours())}:${p(klok.getUTCMinutes())}`;
}

/** Grenzen voor het inplannen: minstens 5 minuten vooruit en hooguit een jaar. */
export function controleerInplanmoment(moment: Date | null, nu = new Date()): string | null {
  if (!moment) return "Kies een geldige datum en tijd.";
  if (moment.getTime() < nu.getTime() + 5 * 60_000) return "Kies een moment dat minstens 5 minuten in de toekomst ligt.";
  if (moment.getTime() > nu.getTime() + 365 * 86_400_000) return "Je kunt hooguit een jaar vooruit inplannen.";
  return null;
}

/** Voorstel voor het inplannen: morgen om 9:00 Nederlandse tijd (datetime-local-waarde). */
export function standaardInplanmoment(nu: Date = new Date()): string {
  return `${utcNaarAmsterdamInvoer(new Date(nu.getTime() + 86_400_000)).slice(0, 10)}T09:00`;
}

/**
 * Begin (00:00 Nederlandse tijd) van de kalenderdag waarin `nu` valt, als UTC.
 * Voor de daglimiet: die telt per Nederlandse kalenderdag, zodat een dagelijkse
 * ronde die een paar minuten verschuift niet om de dag wordt overgeslagen.
 */
export function beginVanDag(nu: Date = new Date()): Date {
  const dag = utcNaarAmsterdamInvoer(nu).slice(0, 10);
  return amsterdamNaarUtc(`${dag}T00:00`) ?? new Date(nu.getTime() - (nu.getTime() % 86_400_000));
}
