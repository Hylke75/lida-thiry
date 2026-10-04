// Pure zoek-, filter- en sorteerregels voor het adresboek. Het adresboek is klein
// genoeg (enkele duizenden relaties) om in het geheugen te filteren; zo kunnen we
// ook op koppelingen (klant, nieuwsbrief, bericht) en zonder accenten zoeken.

import { RELATIE_BRONNEN, volledigeNaam, type Relatie, type RelatieBron } from "./regels";

export const PER_PAGINA = 50;

export const SORTERINGEN = ["naam", "nieuwste", "plaats"] as const;
export type Sortering = (typeof SORTERINGEN)[number];
export const SORTERING_LABEL: Record<Sortering, string> = {
  naam: "Naam (A–Z)",
  nieuwste: "Nieuwste eerst",
  plaats: "Plaats",
};

export type JaNee = "ja" | "nee";

export interface RelatieFilter {
  q?: string;
  tag?: string;
  bron?: RelatieBron;
  klant?: JaNee;
  nieuwsbrief?: JaNee;
  bericht?: JaNee;
  sort?: Sortering;
}

/** Waar een relatie aan gekoppeld is (via het e-mailadres of, bij berichten, de relatie-id). */
export interface Koppelingen {
  /** E-mailadressen (kleine letters) met minstens één betaalde bestelling. */
  klant: ReadonlySet<string>;
  /** E-mailadressen met een nieuwsbriefcontact met status ‘aangemeld’. */
  nieuwsbrief: ReadonlySet<string>;
  /** E-mailadressen die een contactbericht stuurden. */
  berichtEmails: ReadonlySet<string>;
  /** Relatie-id's waar een contactbericht aan gekoppeld is. */
  berichtRelaties: ReadonlySet<string>;
}

export interface Kenmerken {
  klant: boolean;
  nieuwsbrief: boolean;
  bericht: boolean;
}

export const GEEN_KOPPELINGEN: Koppelingen = {
  klant: new Set(),
  nieuwsbrief: new Set(),
  berichtEmails: new Set(),
  berichtRelaties: new Set(),
};

export function kenmerken(r: Pick<Relatie, "id" | "email">, k: Koppelingen): Kenmerken {
  const e = r.email?.toLowerCase() ?? "";
  return {
    klant: Boolean(e) && k.klant.has(e),
    nieuwsbrief: Boolean(e) && k.nieuwsbrief.has(e),
    bericht: (Boolean(e) && k.berichtEmails.has(e)) || k.berichtRelaties.has(r.id),
  };
}

/** Kleine letters, zonder accenten en met enkele spaties: "  José  Müller" → "jose muller". */
export function normaliseerZoektekst(t: string | null | undefined): string {
  return (t ?? "")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Alleen de cijfers van een telefoonnummer, met een Nederlands landnummer als 0:
 * "+31 (0)6-1234 5678" → "0612345678", "0031 6 12345678" → "0612345678".
 */
export function telefoonCijfers(t: string | null | undefined): string {
  let s = (t ?? "").replace(/\(0\)/g, "").trim();
  if (s.startsWith("+")) s = `00${s.slice(1)}`;
  let cijfers = s.replace(/\D/g, "");
  if (cijfers.startsWith("0031")) cijfers = `0${cijfers.slice(4)}`;
  return cijfers;
}

const TUSSENVOEGSELS = new Set(["van", "de", "der", "den", "het", "'t", "ter", "ten", "te", "in", "op", "'s", "la", "le", "du", "da", "di", "von", "el", "al"]);

/** Achternaam zonder tussenvoegsels vooraan, zoals in een Nederlands adresboek: "van der Berg" → "berg". */
export function achternaamSleutel(achternaam: string | null | undefined): string {
  const delen = normaliseerZoektekst(achternaam).split(" ").filter(Boolean);
  let i = 0;
  while (i < delen.length - 1 && TUSSENVOEGSELS.has(delen[i])) i++;
  return delen.slice(i).join(" ");
}

/** Alle tekst waarop gezocht kan worden, genormaliseerd. */
function zoekTekst(r: Relatie): string {
  return normaliseerZoektekst(
    [volledigeNaam(r), r.email, r.telefoon, r.plaats, r.bedrijf, r.postcode, r.postcode?.replace(/\s/g, ""), r.straat].filter(Boolean).join(" | "),
  );
}

/**
 * Of een relatie bij de zoekterm past. Elk woord moet ergens voorkomen; een
 * zoekterm die op een telefoonnummer lijkt, wordt op cijfers vergeleken.
 */
export function pastBijZoekterm(r: Relatie, q: string): boolean {
  const term = normaliseerZoektekst(q);
  if (!term) return true;
  if (/^[\d\s+()\-.]+$/.test(term)) {
    const cijfers = telefoonCijfers(term);
    if (cijfers.length >= 3 && telefoonCijfers(r.telefoon).includes(cijfers)) return true;
  }
  const tekst = zoekTekst(r);
  return term.split(" ").every((w) => tekst.includes(w));
}

const een = (p: Readonly<Record<string, string | string[] | undefined>>, k: string) => {
  const v = p[k];
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
};
const jaNee = (v: string): JaNee | undefined => (v === "ja" || v === "nee" ? v : undefined);

/** Leest de filters uit de URL; onbekende waarden vallen weg. */
export function leesRelatieFilter(p: Readonly<Record<string, string | string[] | undefined>>): RelatieFilter & { pagina: number } {
  const f: RelatieFilter & { pagina: number } = { pagina: 1 };
  const q = een(p, "q").slice(0, 100);
  if (q) f.q = q;
  const tag = een(p, "tag").toLowerCase().replace(/\s+/g, " ").slice(0, 40);
  if (tag) f.tag = tag;
  const bron = een(p, "bron");
  if ((RELATIE_BRONNEN as readonly string[]).includes(bron)) f.bron = bron as RelatieBron;
  for (const k of ["klant", "nieuwsbrief", "bericht"] as const) {
    const w = jaNee(een(p, k));
    if (w) f[k] = w;
  }
  const sort = een(p, "sort");
  if ((SORTERINGEN as readonly string[]).includes(sort) && sort !== "naam") f.sort = sort as Sortering;
  const pagina = Number(een(p, "pagina"));
  if (Number.isInteger(pagina) && pagina > 1 && pagina < 100_000) f.pagina = pagina;
  return f;
}

/** Querystring van een filter zonder lege waarden (voor links en de export). */
export function relatieFilterQuery(f: RelatieFilter & { pagina?: number }): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.tag) p.set("tag", f.tag);
  if (f.bron) p.set("bron", f.bron);
  if (f.klant) p.set("klant", f.klant);
  if (f.nieuwsbrief) p.set("nieuwsbrief", f.nieuwsbrief);
  if (f.bericht) p.set("bericht", f.bericht);
  if (f.sort && f.sort !== "naam") p.set("sort", f.sort);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  return p.toString();
}

export function heeftFilter(f: RelatieFilter): boolean {
  return Boolean(f.q || f.tag || f.bron || f.klant || f.nieuwsbrief || f.bericht);
}

const klopt = (w: JaNee | undefined, waarde: boolean) => !w || (w === "ja") === waarde;

/** Relaties binnen het filter (zonder sortering). */
export function filterRelaties(relaties: readonly Relatie[], f: RelatieFilter, k: Koppelingen): Relatie[] {
  return relaties.filter((r) => {
    if (f.bron && r.bron !== f.bron) return false;
    if (f.tag && !r.tags.includes(f.tag)) return false;
    if (f.klant || f.nieuwsbrief || f.bericht) {
      const m = kenmerken(r, k);
      if (!klopt(f.klant, m.klant) || !klopt(f.nieuwsbrief, m.nieuwsbrief) || !klopt(f.bericht, m.bericht)) return false;
    }
    return !f.q || pastBijZoekterm(r, f.q);
  });
}

const vergelijk = (a: string, b: string) => {
  // Lege waarden achteraan.
  if (!a !== !b) return a ? -1 : 1;
  return a.localeCompare(b, "nl");
};

function naamVergelijking(a: Relatie, b: Relatie): number {
  return (
    vergelijk(achternaamSleutel(a.achternaam) || normaliseerZoektekst(a.voornaam), achternaamSleutel(b.achternaam) || normaliseerZoektekst(b.voornaam)) ||
    vergelijk(normaliseerZoektekst(a.voornaam), normaliseerZoektekst(b.voornaam)) ||
    vergelijk(a.email ?? "", b.email ?? "") ||
    a.id.localeCompare(b.id)
  );
}

/** Gesorteerde kopie. */
export function sorteerRelaties(relaties: readonly Relatie[], sort: Sortering = "naam"): Relatie[] {
  const kopie = [...relaties];
  if (sort === "nieuwste") {
    return kopie.sort((a, b) => Date.parse(b.aangemaakt_op) - Date.parse(a.aangemaakt_op) || a.id.localeCompare(b.id));
  }
  if (sort === "plaats") {
    return kopie.sort((a, b) => vergelijk(normaliseerZoektekst(a.plaats), normaliseerZoektekst(b.plaats)) || naamVergelijking(a, b));
  }
  return kopie.sort(naamVergelijking);
}

export interface Tellingen {
  totaal: number;
  klant: number;
  nieuwsbrief: number;
  bericht: number;
}

export function telRelaties(relaties: readonly Relatie[], k: Koppelingen): Tellingen {
  const t: Tellingen = { totaal: relaties.length, klant: 0, nieuwsbrief: 0, bericht: 0 };
  for (const r of relaties) {
    const m = kenmerken(r, k);
    if (m.klant) t.klant++;
    if (m.nieuwsbrief) t.nieuwsbrief++;
    if (m.bericht) t.bericht++;
  }
  return t;
}

/** Alle tags in gebruik, alfabetisch. */
export function tagsInGebruik(relaties: readonly Pick<Relatie, "tags">[]): string[] {
  return [...new Set(relaties.flatMap((r) => r.tags))].sort((a, b) => a.localeCompare(b, "nl"));
}

/** Naam om te tonen: volledige naam, anders het e-mailadres, anders een vaste tekst. */
export function weergaveNaam(r: Pick<Relatie, "voornaam" | "achternaam" | "email" | "bedrijf">): string {
  return volledigeNaam(r) || r.bedrijf || r.email || "(zonder naam)";
}
