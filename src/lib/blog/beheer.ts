// Pure hulpfuncties voor het blogbeheer: de werkbalk van de editor, invulplekken,
// unieke slugs, het overzicht en een nieuwsbrief maken van een bericht.
// Geen database of netwerk: bruikbaar in de browser, op de server en in tests.

import type { Blok as MailBlok } from "../nieuwsbrief/blokken";
import { maakSlug, zichtbaarheid, type BlogBericht, type Zichtbaarheid } from "./regels";

export const BLOG_BUCKET = "blog";
export const BLOG_AFBEELDING_MAX_BYTES = 5 * 1024 * 1024;
export const BLOG_AFBEELDING_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
};
export type UploadMap = "omslag" | "afbeeldingen";

/** Aanbevolen maximale lengtes voor Google. */
export const SEO_TITEL_MAX = 60;
export const SEO_OMSCHRIJVING_MAX = 155;

/** Hoeveel AI-aanroepen (schrijven, bewerken en voorstellen samen) per uur mogen. */
export const AI_LIMIET_PER_UUR = 20;

// Invulplekken ------------------------------------------------------------------------

/** Zelfde soort invulplekken als publicatieProblemen() in regels.ts herkent. */
const PLAATSHOUDER = /\[(?:aan te vullen|invullen|bron nodig|foto)[^\]\n]*\]/gi;
const FOTO_REGEL = /^\s*\[foto:?\s*([^\]\n]*)\]\s*$/i;

export interface Plaatshouder {
  tekst: string;
  start: number;
  eind: number;
  /** Bij een fotoplek: de beschrijving van de gewenste foto. */
  foto: string | null;
}

/** Alle [foto: …]-, [aan te vullen …]-achtige invulplekken in de tekst, met hun positie. */
export function vindPlaatshouders(inhoud: string): Plaatshouder[] {
  const uit: Plaatshouder[] = [];
  for (const m of inhoud.matchAll(PLAATSHOUDER)) {
    const tekst = m[0];
    const foto = /^\[foto/i.test(tekst) ? tekst.replace(/^\[foto:?\s*/i, "").replace(/\]$/, "").trim() : null;
    uit.push({ tekst, start: m.index, eind: m.index + tekst.length, foto });
  }
  return uit;
}

export type VoorbeeldDeel = { soort: "tekst"; tekst: string } | { soort: "foto"; beschrijving: string };

/**
 * Splitst de tekst voor het voorbeeld in het beheer: regels die alleen uit
 * "[foto: …]" bestaan worden een apart deel, zodat het voorbeeld er een
 * opvallend vak "Foto nog toevoegen" van kan maken.
 */
export function splitsVoorVoorbeeld(inhoud: string): VoorbeeldDeel[] {
  const delen: VoorbeeldDeel[] = [];
  let buffer: string[] = [];
  const spoel = () => {
    const tekst = buffer.join("\n");
    if (tekst.trim()) delen.push({ soort: "tekst", tekst });
    buffer = [];
  };
  for (const regel of inhoud.replace(/\r\n?/g, "\n").split("\n")) {
    const m = FOTO_REGEL.exec(regel);
    if (m) {
      spoel();
      delen.push({ soort: "foto", beschrijving: m[1].trim() });
    } else {
      buffer.push(regel);
    }
  }
  spoel();
  return delen;
}

// Werkbalk ----------------------------------------------------------------------------

export interface Bewerkt {
  tekst: string;
  /** Nieuwe selectie in het tekstvak. */
  start: number;
  eind: number;
}

export type Opmaakknop = "kop" | "subkop" | "vet" | "lijst" | "link";

function regelGrenzen(tekst: string, start: number, eind: number): { van: number; tot: number } {
  const van = start === 0 ? 0 : tekst.lastIndexOf("\n", start - 1) + 1;
  // Een selectie die precies na een regeleinde eindigt, telt die volgende regel niet mee.
  const eindPunt = eind > start && tekst[eind - 1] === "\n" ? eind - 1 : eind;
  const n = tekst.indexOf("\n", eindPunt);
  return { van, tot: n === -1 ? tekst.length : n };
}

/** Past een werkbalkknop toe op de selectie (start–eind) van de tekst. */
export function pasOpmaakToe(tekst: string, start: number, eind: number, knop: Opmaakknop): Bewerkt {
  const a = Math.max(0, Math.min(start, eind, tekst.length));
  const b = Math.min(tekst.length, Math.max(start, eind));
  const selectie = tekst.slice(a, b);

  if (knop === "vet" || knop === "link") {
    const leeg = !selectie.trim();
    const binnen = leeg ? (knop === "vet" ? "vette tekst" : "linktekst") : selectie;
    if (knop === "vet") {
      const nieuw = `**${binnen}**`;
      return { tekst: tekst.slice(0, a) + nieuw + tekst.slice(b), start: a + 2, eind: a + 2 + binnen.length };
    }
    const url = "https://";
    const nieuw = `[${binnen}](${url})`;
    const urlStart = a + binnen.length + 3;
    return { tekst: tekst.slice(0, a) + nieuw + tekst.slice(b), start: urlStart, eind: urlStart + url.length };
  }

  // Regelknoppen: werken op hele regels.
  const { van, tot } = regelGrenzen(tekst, a, b);
  const regels = tekst.slice(van, tot).split("\n");
  let nieuweRegels: string[];
  if (knop === "lijst") {
    const alLijst = regels.filter((r) => r.trim()).every((r) => /^\s*[-*]\s+/.test(r));
    nieuweRegels = regels.map((r) =>
      !r.trim() ? r : alLijst ? r.replace(/^\s*[-*]\s+/, "") : `- ${r.replace(/^#{2,3}\s+/, "")}`,
    );
  } else {
    const prefix = knop === "kop" ? "## " : "### ";
    const al = regels.filter((r) => r.trim()).every((r) => r.startsWith(prefix));
    nieuweRegels = regels.map((r) => {
      if (!r.trim()) return r;
      const kaal = r.replace(/^#{2,3}\s+/, "").replace(/^\s*[-*]\s+/, "");
      return al ? kaal : prefix + kaal;
    });
  }
  const blok = nieuweRegels.join("\n");
  const leeg = !blok.trim();
  const ingevoegd = leeg ? (knop === "lijst" ? "- " : knop === "kop" ? "## " : "### ") : blok;
  const nieuw = tekst.slice(0, van) + ingevoegd + tekst.slice(tot);
  return leeg
    ? { tekst: nieuw, start: van + ingevoegd.length, eind: van + ingevoegd.length }
    : { tekst: nieuw, start: van, eind: van + ingevoegd.length };
}

/**
 * Voegt een afbeelding in als eigen regel (met lege regels eromheen). Staat de
 * cursor op een "[foto: …]"-regel, dan vervangt de afbeelding die regel.
 */
export function voegAfbeeldingIn(tekst: string, start: number, eind: number, url: string, alt: string): Bewerkt {
  const veiligAlt = alt.replace(/[[\]\n]/g, " ").replace(/\s+/g, " ").trim();
  const regel = `![${veiligAlt}](${url})`;
  const a = Math.max(0, Math.min(start, tekst.length));
  const b = Math.max(a, Math.min(eind, tekst.length));
  const { van, tot } = regelGrenzen(tekst, a, b);
  if (FOTO_REGEL.test(tekst.slice(van, tot))) {
    return { tekst: tekst.slice(0, van) + regel + tekst.slice(tot), start: van, eind: van + regel.length };
  }
  const voor = tekst.slice(0, a);
  const na = tekst.slice(b);
  const ervoor = !voor ? "" : voor.endsWith("\n\n") ? "" : voor.endsWith("\n") ? "\n" : "\n\n";
  const erna = !na ? "\n" : na.startsWith("\n\n") ? "" : na.startsWith("\n") ? "\n" : "\n\n";
  const begin = voor.length + ervoor.length;
  return { tekst: voor + ervoor + regel + erna + na, start: begin, eind: begin + regel.length };
}

/** Beschrijving van de fotoplek op de regel waar de cursor staat (als die er is). */
export function fotoplekBijCursor(tekst: string, start: number, eind: number): string | null {
  const { van, tot } = regelGrenzen(tekst, start, eind);
  const m = FOTO_REGEL.exec(tekst.slice(van, tot));
  return m ? m[1].trim() : null;
}

// Slugs -------------------------------------------------------------------------------

/** Een slug die nog niet bestaat: basis, basis-2, basis-3, … (max. 100 tekens). */
export function uniekeSlug(basis: string, bestaand: Iterable<string>): string {
  const bezet = new Set(bestaand);
  const schoon = maakSlug(basis) || "bericht";
  if (!bezet.has(schoon)) return schoon;
  for (let n = 2; n < 10_000; n++) {
    const achter = `-${n}`;
    const kandidaat = `${schoon.slice(0, 100 - achter.length).replace(/-+$/, "")}${achter}`;
    if (!bezet.has(kandidaat)) return kandidaat;
  }
  return `${schoon.slice(0, 80)}-${Date.now().toString(36)}`;
}

// Overzicht ---------------------------------------------------------------------------

export interface OverzichtFilter {
  zoek?: string;
  status?: string;
  categorie?: string;
  tag?: string;
}

type Filterbaar = Pick<BlogBericht, "titel" | "status" | "gepubliceerd_op" | "categorie" | "tags">;

export function filterBerichten<T extends Filterbaar>(berichten: T[], f: OverzichtFilter, nu = new Date()): T[] {
  const zoek = f.zoek?.trim().toLowerCase() ?? "";
  const categorie = f.categorie?.trim().toLowerCase() ?? "";
  const tag = f.tag?.trim().toLowerCase() ?? "";
  const status = (["concept", "ingepland", "online"] as const).find((s) => s === f.status);
  return berichten.filter(
    (b) =>
      (!zoek || b.titel.toLowerCase().includes(zoek)) &&
      (!status || zichtbaarheid(b, nu) === status) &&
      (!categorie || (b.categorie ?? "").toLowerCase() === categorie) &&
      (!tag || b.tags.some((t) => t.toLowerCase() === tag)),
  );
}

export const ZICHTBAARHEID_LABEL: Record<Zichtbaarheid, string> = {
  concept: "Concept",
  ingepland: "Ingepland",
  online: "Online",
};

/** Unieke, gesorteerde waarden (bijv. alle categorieën of tags) voor suggesties. */
export function uniekGesorteerd(waarden: Iterable<string | null | undefined>): string[] {
  const kaart = new Map<string, string>();
  for (const w of waarden) {
    const t = w?.trim();
    if (t && !kaart.has(t.toLowerCase())) kaart.set(t.toLowerCase(), t);
  }
  return [...kaart.values()].sort((a, b) => a.localeCompare(b, "nl"));
}

/** Kosten in dollarcent als leesbaar bedrag, bijv. "$1,23". */
export function toonDollar(dollarcent: number): string {
  return `$${(dollarcent / 100).toLocaleString("nl-NL", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

// Nieuwsbrief -------------------------------------------------------------------------

/** De eerste `aantal` gewone alinea's van de tekst (geen koppen, lijsten, foto's of invulplekken). */
export function eersteAlineas(inhoud: string, aantal = 2): string[] {
  return inhoud
    .replace(/\r\n?/g, "\n")
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(
      (s) =>
        s &&
        !/^#{2,3}\s/.test(s) &&
        !/^\s*[-*]\s+/.test(s) &&
        !/^!\[/.test(s) &&
        !/^\{[a-z_]+\}$/.test(s) &&
        !vindPlaatshouders(s).length,
    )
    .slice(0, aantal);
}

/** Maakt interne links (/pad) absoluut, want in een e-mail werkt "/bestellen" niet. */
export function maakLinksAbsoluut(tekst: string, site: string): string {
  const basis = site.replace(/\/$/, "");
  return tekst.replace(/\]\((\/(?!\/)[^)\s]*)\)/g, (_h, pad: string) => `](${basis}${pad})`);
}

/** De blokken voor een nieuwsbriefcampagne die naar een blogbericht verwijst. */
export function campagneBlokkenUitBericht(
  b: Pick<BlogBericht, "titel" | "slug" | "samenvatting" | "inhoud" | "omslag_url" | "omslag_alt">,
  site: string,
): MailBlok[] {
  const url = `${site.replace(/\/$/, "")}/blog/${b.slug}`;
  const blokken: MailBlok[] = [];
  if (b.omslag_url && /^https:\/\//i.test(b.omslag_url)) {
    blokken.push({ id: "omslag", soort: "afbeelding", url: b.omslag_url, alt: b.omslag_alt.trim() || b.titel, link: url });
  }
  blokken.push({ id: "kop", soort: "kop", tekst: b.titel.slice(0, 200) });
  const tekst = [b.samenvatting.trim(), ...eersteAlineas(b.inhoud, 2).map((a) => maakLinksAbsoluut(a, site))]
    .filter(Boolean)
    .join("\n\n");
  if (tekst) blokken.push({ id: "tekst", soort: "tekst", tekst: tekst.slice(0, 20_000) });
  blokken.push({ id: "knop", soort: "knop", tekst: "Lees verder", url });
  return blokken;
}
