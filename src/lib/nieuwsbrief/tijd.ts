// Tijden voor het inplannen van nieuwsbrieven. De beheerder denkt in Nederlandse
// tijd (Europe/Amsterdam, met zomer- en wintertijd); de database bewaart UTC.
// Puur: bruikbaar in de browser, op de server en in tests.

export const TIJDZONE = "Europe/Amsterdam";

const INVOER = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/;

/** Verschil (in ms) tussen Amsterdamse kloktijd en UTC op een bepaald moment. */
function verschil(utcMs: number): number {
  const delen = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIJDZONE,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).formatToParts(new Date(utcMs));
  const n = (t: string) => Number(delen.find((d) => d.type === t)?.value);
  const klok = Date.UTC(n("year"), n("month") - 1, n("day"), n("hour"), n("minute"), n("second"));
  return klok - Math.floor(utcMs / 1000) * 1000;
}

/**
 * Zet de waarde van een `<input type="datetime-local">` (Amsterdamse tijd, bijv.
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
  let utc = naief - verschil(naief);
  const tweede = verschil(utc);
  if (naief - tweede !== utc) utc = naief - tweede;
  return new Date(utc);
}

/** Zet een UTC-tijdstip om naar de waarde voor een datetime-local-veld (Amsterdamse tijd). */
export function utcNaarAmsterdamInvoer(moment: string | Date): string {
  const ms = new Date(moment).getTime();
  if (!Number.isFinite(ms)) return "";
  const klok = new Date(ms + verschil(ms));
  const p = (n: number) => String(n).padStart(2, "0");
  return `${klok.getUTCFullYear()}-${p(klok.getUTCMonth() + 1)}-${p(klok.getUTCDate())}T${p(klok.getUTCHours())}:${p(klok.getUTCMinutes())}`;
}

/** Leesbare datum en tijd in Nederlandse tijd, bijv. "4 okt. 2026, 14:30". */
export function toonDatumTijd(moment: string | Date | null | undefined): string {
  if (!moment) return "—";
  const d = new Date(moment);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString("nl-NL", {
    timeZone: TIJDZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
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
