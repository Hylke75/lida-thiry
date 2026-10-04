// Pure regels voor het contactformulier en het berichtenbeheer: invoer
// controleren, spam herkennen, filters voor de lijst. Zonder database of
// Resend, zodat alles te testen is.

export const BERICHT_STATUSSEN = ["nieuw", "gelezen", "beantwoord", "gearchiveerd", "spam"] as const;
export type BerichtStatus = (typeof BERICHT_STATUSSEN)[number];

export const BERICHT_STATUS_LABEL: Record<BerichtStatus, string> = {
  nieuw: "Nieuw",
  gelezen: "Gelezen",
  beantwoord: "Beantwoord",
  gearchiveerd: "Gearchiveerd",
  spam: "Spam",
};

export function isBerichtStatus(s: unknown): s is BerichtStatus {
  return typeof s === "string" && (BERICHT_STATUSSEN as readonly string[]).includes(s);
}

export const MAX = { naam: 120, email: 254, telefoon: 30, onderwerp: 120, bericht: 5_000, antwoord: 20_000 } as const;
export const MIN_BERICHT = 10;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const TELEFOON = /^[0-9+()\-.\s/]{6,30}$/;

export type ContactVeld = "naam" | "email" | "telefoon" | "onderwerp" | "bericht";

export interface ContactInvoer {
  naam: string;
  email: string;
  telefoon: string | null;
  onderwerp: string;
  bericht: string;
}

export type ContactValidatie =
  | { ok: true; waarde: ContactInvoer }
  | { ok: false; fouten: Partial<Record<ContactVeld, string>> };

const tekst = (v: unknown): string => (typeof v === "string" ? v : "");
/** Regeleinden gelijktrekken en onzichtbare stuurtekens weghalen (tab en regeleinde blijven). */
const schoon = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
const eenRegel = (s: string) => schoon(s).replace(/\s+/g, " ").trim();

/**
 * Controleert de invoer van het contactformulier. `onderwerpen` zijn de keuzes
 * uit de teksten; is die lijst leeg, dan is het onderwerp vrij (en optioneel).
 */
export function valideerContact(ruw: Readonly<Record<string, unknown>>, onderwerpen: readonly string[]): ContactValidatie {
  const fouten: Partial<Record<ContactVeld, string>> = {};

  const naam = eenRegel(tekst(ruw.naam));
  if (!naam) fouten.naam = "Vul je naam in.";
  else if (naam.length > MAX.naam) fouten.naam = `Je naam mag maximaal ${MAX.naam} tekens zijn.`;

  const email = eenRegel(tekst(ruw.email)).toLowerCase();
  if (!email) fouten.email = "Vul je e-mailadres in.";
  else if (email.length > MAX.email || !EMAIL.test(email)) fouten.email = "Dit lijkt geen geldig e-mailadres.";

  const telefoonRuw = eenRegel(tekst(ruw.telefoon));
  if (telefoonRuw && !TELEFOON.test(telefoonRuw)) fouten.telefoon = "Dit lijkt geen geldig telefoonnummer.";

  const keuzes = onderwerpen.map((o) => o.trim()).filter(Boolean);
  const onderwerp = eenRegel(tekst(ruw.onderwerp)).slice(0, MAX.onderwerp);
  if (keuzes.length) {
    if (!onderwerp) fouten.onderwerp = "Kies een onderwerp.";
    else if (!keuzes.includes(onderwerp)) fouten.onderwerp = "Kies een onderwerp uit de lijst.";
  }

  const bericht = schoon(tekst(ruw.bericht)).trim();
  if (!bericht) fouten.bericht = "Schrijf je bericht.";
  else if (bericht.length < MIN_BERICHT) fouten.bericht = "Je bericht is wel erg kort. Vertel iets meer.";
  else if (bericht.length > MAX.bericht) fouten.bericht = `Je bericht mag maximaal ${MAX.bericht.toLocaleString("nl-NL")} tekens zijn.`;

  if (Object.keys(fouten).length) return { ok: false, fouten };
  return { ok: true, waarde: { naam, email, telefoon: telefoonRuw || null, onderwerp, bericht } };
}

// Spam --------------------------------------------------------------------------------

/** Woorden die in een contactbericht voor deze site vrijwel altijd op spam wijzen. */
export const SPAMWOORDEN = [
  "viagra",
  "cialis",
  "casino",
  "porn",
  "crypto",
  "bitcoin",
  "forex",
  "backlink",
  "backlinks",
  "seo services",
  "seo service",
  "guest post",
  "rank your website",
  "first page of google",
  "payday loan",
  "escort",
] as const;

const LINK = /\bhttps?:\/\/|\bwww\.|\[url=|<a\s/gi;

export function aantalLinks(s: string): number {
  return s.match(LINK)?.length ?? 0;
}

/**
 * Eenvoudige spamcontrole: 3 of meer links, een link in naam of onderwerp, of
 * een woord uit SPAMWOORDEN. Geeft de redenen terug (leeg = geen spam).
 */
export function spamRedenen(b: Pick<ContactInvoer, "naam" | "onderwerp" | "bericht">): string[] {
  const redenen: string[] = [];
  const links = aantalLinks(b.bericht);
  if (links >= 3) redenen.push(`${links} links in het bericht`);
  if (aantalLinks(b.naam) || aantalLinks(b.onderwerp)) redenen.push("link in naam of onderwerp");
  const alles = `${b.naam}\n${b.onderwerp}\n${b.bericht}`.toLowerCase();
  for (const w of SPAMWOORDEN) {
    const patroon = new RegExp(`(^|[^\\p{L}\\p{N}])${w.replace(/\s+/g, "\\s+")}($|[^\\p{L}\\p{N}])`, "u");
    if (patroon.test(alles)) redenen.push(`verdacht woord ‘${w}’`);
  }
  return redenen;
}

export function isSpam(b: Pick<ContactInvoer, "naam" | "onderwerp" | "bericht">): boolean {
  return spamRedenen(b).length > 0;
}

// Herkomst ----------------------------------------------------------------------------

/**
 * Het pad van de pagina waarop het formulier is ingevuld, uit de Referer, maar
 * alleen als die van deze site komt (een van `hosts`). Anders null.
 */
export function paginaUitReferer(referer: string | null | undefined, hosts: readonly string[]): string | null {
  if (!referer) return null;
  try {
    const url = new URL(referer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    if (!hosts.map((h) => h.toLowerCase()).includes(url.host.toLowerCase())) return null;
    return url.pathname.slice(0, 200) || "/";
  } catch {
    return null;
  }
}

// Beheer: lijst ------------------------------------------------------------------------

/** "inbox" = alles behalve gearchiveerd en spam. */
export type BerichtWeergave = "inbox" | BerichtStatus;

export interface BerichtFilter {
  weergave: BerichtWeergave;
  q?: string;
  pagina: number;
}

export const BERICHTEN_PER_PAGINA = 25;

export function leesBerichtFilter(p: Readonly<Record<string, string | string[] | undefined>>): BerichtFilter {
  const een = (k: string) => {
    const v = p[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  const status = een("status");
  const f: BerichtFilter = { weergave: isBerichtStatus(status) ? status : "inbox", pagina: 1 };
  const q = een("q").slice(0, 100);
  if (q) f.q = q;
  const pagina = Number(een("pagina"));
  if (Number.isInteger(pagina) && pagina > 1 && pagina < 100_000) f.pagina = pagina;
  return f;
}

export function berichtFilterQuery(f: Partial<BerichtFilter>): string {
  const p = new URLSearchParams();
  if (f.weergave && f.weergave !== "inbox") p.set("status", f.weergave);
  if (f.q) p.set("q", f.q);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  return p.toString();
}

/** Zoekterm die veilig in een PostgREST or()-filter met ilike past. */
export function veiligeZoekterm(q: string): string {
  return q
    .replace(/[,()*%_\\"':]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
}

/** Korte voorvertoning van een bericht voor de lijst. */
export function voorproef(bericht: string, max = 140): string {
  const plat = bericht.replace(/\s+/g, " ").trim();
  return plat.length > max ? `${plat.slice(0, max - 1).trimEnd()}…` : plat;
}

/** Controle van een antwoord uit het beheer. */
export function valideerAntwoord(ruw: unknown): { ok: true; tekst: string } | { ok: false; fout: string } {
  const t = schoon(tekst(ruw)).trim();
  if (!t) return { ok: false, fout: "Schrijf eerst een antwoord." };
  if (t.length > MAX.antwoord) return { ok: false, fout: `Het antwoord mag maximaal ${MAX.antwoord.toLocaleString("nl-NL")} tekens zijn.` };
  return { ok: true, tekst: t };
}

/** Eerste woord van een naam, voor de aanhef ("Beste Anna,"). */
export function voornaamVan(naam: string): string {
  return naam.trim().split(/\s+/)[0] ?? "";
}
