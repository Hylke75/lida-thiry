// Pure hulpfuncties voor beheerbare pagina's: validatie, slugs, het menu,
// de volgorde en blokken invoegen. Geen database of netwerk: bruikbaar in de
// browser, op de server en in tests.

import { opmaakNaarTekst } from "../inhoud/opmaak";
import { maakSlug } from "../blog/regels";
import { blokkenInTekst, formulierSlugUitBlok, GERESERVEERDE_SLUGS, geldigePaginaSlug, PAGINA_BLOKKEN } from "./regels";

export interface Pagina {
  id: string;
  slug: string;
  titel: string;
  intro: string;
  inhoud: string;
  omslag_url: string | null;
  omslag_alt: string;
  status: "concept" | "gepubliceerd";
  in_menu: boolean;
  in_footer: boolean;
  menu_label: string;
  volgorde: number;
  seo_titel: string;
  seo_omschrijving: string;
  niet_indexeren: boolean;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export const PAGINA_VELDEN =
  "id, slug, titel, intro, inhoud, omslag_url, omslag_alt, status, in_menu, in_footer, menu_label, volgorde, seo_titel, seo_omschrijving, niet_indexeren, aangemaakt_op, bijgewerkt_op";

export const SLUG_MAX = 80;
export const INTRO_MAX = 1000;
export const MENU_LABEL_MAX = 40;

// Slugs -------------------------------------------------------------------------------

/** Een slug uit een titel, nooit gereserveerd ("Blog" → "blog-pagina"). */
export function slugSuggestie(titel: string): string {
  const s = maakSlug(titel).slice(0, SLUG_MAX - 7).replace(/-+$/, "") || "pagina";
  return GERESERVEERDE_SLUGS.has(s) ? `${s}-pagina` : s;
}

/** Een geldige slug die nog niet bestaat: basis, basis-2, basis-3, … */
export function uniekePaginaSlug(basis: string, bestaand: Iterable<string>): string {
  const bezet = new Set(bestaand);
  const schoon = slugSuggestie(basis);
  if (!bezet.has(schoon)) return schoon;
  for (let n = 2; n < 10_000; n++) {
    const achter = `-${n}`;
    const kandidaat = `${schoon.slice(0, SLUG_MAX - achter.length).replace(/-+$/, "")}${achter}`;
    if (!bezet.has(kandidaat) && geldigePaginaSlug(kandidaat)) return kandidaat;
  }
  return `${schoon.slice(0, 60)}-${Date.now().toString(36)}`;
}

/** Foutmelding bij een ongeldige slug, of null. */
export function slugFout(slug: string): string | null {
  if (!slug) return "Vul een webadres in.";
  if (GERESERVEERDE_SLUGS.has(slug)) {
    return `Het webadres "/${slug}" is al in gebruik door een vaste pagina van de site. Kies een ander webadres.`;
  }
  if (slug.length > SLUG_MAX) return `Het webadres mag maximaal ${SLUG_MAX} tekens lang zijn.`;
  if (!geldigePaginaSlug(slug)) return "Het webadres mag alleen kleine letters, cijfers en losse streepjes bevatten.";
  return null;
}

// Validatie ---------------------------------------------------------------------------

export interface PaginaInvoer {
  titel: string;
  slug: string;
  intro: string;
  inhoud: string;
  omslag_url: string | null;
  omslag_alt: string;
  in_menu: boolean;
  in_footer: boolean;
  menu_label: string;
  volgorde: number;
  seo_titel: string;
  seo_omschrijving: string;
  niet_indexeren: boolean;
}

const tekst = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "");

/** Controleert invoer uit het beheer; geeft schone waarden of foutmeldingen. */
export function valideerPagina(ruw: unknown): { ok: true; waarde: PaginaInvoer } | { ok: false; fouten: string[] } {
  const o = ruw && typeof ruw === "object" ? (ruw as Record<string, unknown>) : {};
  const fouten: string[] = [];
  const titel = tekst(o.titel, 200);
  if (!titel) fouten.push("Geef de pagina een titel.");
  const slug = tekst(o.slug, 200) || slugSuggestie(titel);
  const sf = slugFout(slug);
  if (sf) fouten.push(sf);
  const omslag = tekst(o.omslag_url, 2000) || null;
  if (omslag && !/^https:\/\//.test(omslag)) fouten.push("De omslagfoto moet een https-adres hebben.");
  const omslagAlt = tekst(o.omslag_alt, 300);
  if (omslag && !omslagAlt) fouten.push("Geef de omslagfoto een korte omschrijving (voor slechtzienden en Google).");
  const volgordeRuw = typeof o.volgorde === "number" ? o.volgorde : Number(o.volgorde);
  const volgorde = Number.isFinite(volgordeRuw) ? Math.max(-9999, Math.min(9999, Math.round(volgordeRuw))) : 0;
  const waarde: PaginaInvoer = {
    titel,
    slug,
    intro: tekst(o.intro, INTRO_MAX),
    inhoud: tekst(o.inhoud, 100_000),
    omslag_url: omslag,
    omslag_alt: omslagAlt,
    in_menu: o.in_menu === true,
    in_footer: o.in_footer === true,
    menu_label: tekst(o.menu_label, MENU_LABEL_MAX).replace(/\s+/g, " "),
    volgorde,
    seo_titel: tekst(o.seo_titel, 70),
    seo_omschrijving: tekst(o.seo_omschrijving, 170),
    niet_indexeren: o.niet_indexeren === true,
  };
  return fouten.length ? { ok: false, fouten } : { ok: true, waarde };
}

const PLAATSHOUDER = /\[(aan te vullen|invullen|bron nodig|foto)[^\]]*\]/i;

/** Wat er nog ontbreekt om te publiceren. */
export function publicatieProblemen(p: Pick<PaginaInvoer, "titel" | "intro" | "inhoud">): string[] {
  const uit: string[] = [];
  if (!p.titel.trim()) uit.push("Titel ontbreekt.");
  if (!p.intro.trim() && !p.inhoud.trim()) uit.push("De pagina heeft nog geen tekst.");
  if (PLAATSHOUDER.test(p.intro) || PLAATSHOUDER.test(p.inhoud)) uit.push("Er staan nog [invulplekken] in de tekst.");
  return uit;
}

/** Meta-omschrijving: de SEO-omschrijving, anders de intro, anders het begin van de tekst. */
export function paginaOmschrijving(p: Pick<Pagina, "seo_omschrijving" | "intro" | "inhoud">): string {
  const bron = (p.seo_omschrijving.trim() || p.intro.replace(/\s+/g, " ").trim() || opmaakNaarTekst(p.inhoud)).trim();
  return bron.length > 160 ? `${bron.slice(0, 157).replace(/\s+\S*$/, "")}…` : bron;
}

// Menu --------------------------------------------------------------------------------

export type MenuRij = Pick<Pagina, "slug" | "titel" | "menu_label" | "volgorde" | "in_menu" | "in_footer" | "status">;

export interface MenuItem {
  href: string;
  label: string;
}

export function menuLabel(p: Pick<Pagina, "menu_label" | "titel">): string {
  return p.menu_label.trim() || p.titel.trim();
}

const opVolgorde = (a: MenuRij, b: MenuRij) => a.volgorde - b.volgorde || menuLabel(a).localeCompare(menuLabel(b), "nl");

/** Menu- en footerlinks: alleen gepubliceerde pagina's met een geldige slug, op volgorde. */
export function bouwMenu(rijen: readonly MenuRij[]): { menu: MenuItem[]; footer: MenuItem[] } {
  const zichtbaar = rijen.filter((r) => r.status === "gepubliceerd" && geldigePaginaSlug(r.slug) && menuLabel(r)).sort(opVolgorde);
  const item = (r: MenuRij): MenuItem => ({ href: `/${r.slug}`, label: menuLabel(r) });
  return { menu: zichtbaar.filter((r) => r.in_menu).map(item), footer: zichtbaar.filter((r) => r.in_footer).map(item) };
}

/** Is `href` de huidige pagina (of een pagina daaronder)? */
export function isActief(href: string, pad: string | null | undefined): boolean {
  if (!pad) return false;
  if (href === "/") return pad === "/";
  return pad === href || pad.startsWith(`${href}/`);
}

/** Delen van de site zonder publieke kop: het beheer, inloggen en de test zelf. */
const ZONDER_KOP = ["/admin", "/auth", "/test"];

export function toonSiteKop(pad: string | null | undefined): boolean {
  if (!pad) return true;
  return !ZONDER_KOP.some((p) => pad === p || pad.startsWith(`${p}/`));
}

// Volgorde ----------------------------------------------------------------------------

/** Zet pagina `id` één plek omhoog of omlaag; geeft de nieuwe volgorde van de ids. */
export function verschuif(ids: readonly string[], id: string, richting: "omhoog" | "omlaag"): string[] {
  const lijst = [...ids];
  const i = lijst.indexOf(id);
  const j = richting === "omhoog" ? i - 1 : i + 1;
  if (i === -1 || j < 0 || j >= lijst.length) return lijst;
  [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
  return lijst;
}

/** Nieuwe volgordenummers (10, 20, 30, …) voor alleen de pagina's die veranderen. */
export function volgordeWijzigingen(
  huidig: readonly { id: string; volgorde: number }[],
  nieuweVolgorde: readonly string[],
): { id: string; volgorde: number }[] {
  const oud = new Map(huidig.map((r) => [r.id, r.volgorde]));
  return nieuweVolgorde
    .map((id, i) => ({ id, volgorde: (i + 1) * 10 }))
    .filter((r) => oud.has(r.id) && oud.get(r.id) !== r.volgorde);
}

/** Sorteert pagina's zoals in het menu (volgorde, dan titel). */
export function sorteerPaginas<T extends Pick<Pagina, "volgorde" | "titel" | "menu_label">>(rijen: readonly T[]): T[] {
  return [...rijen].sort((a, b) => a.volgorde - b.volgorde || menuLabel(a).localeCompare(menuLabel(b), "nl"));
}

// Blokken in de editor ----------------------------------------------------------------

export interface FormulierKeuze {
  slug: string;
  naam: string;
}

/** Leesbaar label voor een blok in het voorbeeld van de editor. */
export function blokLabel(naam: string, formulieren: readonly FormulierKeuze[]): { label: string; bekend: boolean } {
  const vast: Record<string, string> = {
    contactformulier: "Contactformulier",
    nieuwsbrief: "Aanmeldblok nieuwsbrief",
    test: "Uitnodiging voor de test (knop naar /bestellen)",
    laatste_blogs: "De drie nieuwste blogberichten",
    bedrijfsgegevens: "Bedrijfsgegevens (uit de instellingen)",
  };
  if (naam in vast) return { label: vast[naam], bekend: true };
  if (naam in PAGINA_BLOKKEN) return { label: PAGINA_BLOKKEN[naam], bekend: true };
  const f = formulierSlugUitBlok(naam);
  const formulier = f ? formulieren.find((x) => x.slug === f) : undefined;
  if (formulier) return { label: `Nieuwsbriefformulier: ${formulier.naam}`, bekend: true };
  return { label: `Onbekend blok {${naam}} — wordt niet getoond`, bekend: false };
}

/** Alle blokken die in een tekst voorkomen (uniek). */
export function gebruikteBlokken(...teksten: string[]): string[] {
  return [...new Set(teksten.flatMap(blokkenInTekst))];
}

/** Voegt `{blok}` in als eigen regel op de plek van de cursor (met lege regels eromheen). */
export function voegBlokIn(tekst: string, start: number, eind: number, blok: string): { tekst: string; start: number; eind: number } {
  const regel = `{${blok}}`;
  const a = Math.max(0, Math.min(start, eind, tekst.length));
  // Aan het begin van een regel: daar invoegen; midden in een regel: na het einde van die regel.
  let p = a;
  if (a > 0 && tekst[a - 1] !== "\n") {
    const n = tekst.indexOf("\n", a);
    p = n === -1 ? tekst.length : n;
  }
  const voor = tekst.slice(0, p);
  const na = tekst.slice(p);
  const ervoor = !voor ? "" : voor.endsWith("\n\n") ? "" : voor.endsWith("\n") ? "\n" : "\n\n";
  const erna = !na ? "\n" : na.startsWith("\n\n") ? "" : na.startsWith("\n") ? "\n" : "\n\n";
  const begin = voor.length + ervoor.length;
  return { tekst: voor + ervoor + regel + erna + na, start: begin, eind: begin + regel.length };
}
