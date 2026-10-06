// Pure regels voor de blogeditor: de formuliervelden en de AI-voorstellen (zonder React).

import type { Bewerking } from "@/lib/blog/ai-prompt";
import type { BlogBericht, Zichtbaarheid } from "@/lib/blog/regels";
import { slugify } from "@/lib/slug";

/** De velden zoals ze in de editor staan (lege tekst in plaats van null). */
export interface Velden {
  titel: string;
  slug: string;
  samenvatting: string;
  inhoud: string;
  omslag_url: string;
  omslag_alt: string;
  categorie: string;
  tags: string[];
  seo_titel: string;
  seo_omschrijving: string;
  auteur: string;
  uitgelicht: boolean;
}

export function alsVelden(b: BlogBericht): Velden {
  return {
    titel: b.titel,
    slug: b.slug,
    samenvatting: b.samenvatting,
    inhoud: b.inhoud,
    omslag_url: b.omslag_url ?? "",
    omslag_alt: b.omslag_alt,
    categorie: b.categorie ?? "",
    tags: b.tags,
    seo_titel: b.seo_titel,
    seo_omschrijving: b.seo_omschrijving,
    auteur: b.auteur,
    uitgelicht: b.uitgelicht,
  };
}

/** De velden zoals de server ze verwacht: lege omslag en categorie worden null. */
export const alsInvoer = (v: Velden) => ({ ...v, omslag_url: v.omslag_url.trim() || null, categorie: v.categorie.trim() || null });

/**
 * Of het webadres de titel automatisch volgt: alleen bij een concept waarvan de slug nog
 * uit de titel komt, of nog de standaardslug van een nieuw bericht is.
 */
export function slugVolgtTitel(bericht: Pick<BlogBericht, "slug" | "titel">, zichtbaar: Zichtbaarheid): boolean {
  return zichtbaar === "concept" && (bericht.slug === slugify(bericht.titel) || /^nieuw-bericht(-\d+)?$/.test(bericht.slug));
}

/** Een slug tijdens het typen: kleine letters, spaties worden streepjes. */
export const slugTijdensTypen = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

export const BEWERKING_LABEL: Record<Bewerking, string> = {
  verbeter: "Verbeteren",
  korter: "Korter",
  langer: "Langer",
  eenvoudiger: "Eenvoudiger",
  persoonlijker: "Persoonlijker",
};

/** Een voorstel van de AI voor (een stuk van) de tekst. */
export interface AiVoorstelTekst {
  bewerking: Bewerking;
  start: number;
  eind: number;
  voor: string;
  na: string;
  geheel: boolean;
}

/**
 * Welk stuk tekst de AI bewerkt: de selectie, of de hele tekst als er niets
 * (of alleen witruimte) geselecteerd is.
 */
export function aiBereik(inhoud: string, start: number, eind: number): { van: number; tot: number; voor: string; geheel: boolean } {
  const geheel = start === eind || !inhoud.slice(start, eind).trim();
  const van = geheel ? 0 : start;
  const tot = geheel ? inhoud.length : eind;
  return { van, tot, voor: inhoud.slice(van, tot), geheel };
}

/**
 * Neemt een AI-voorstel over in de (intussen misschien gewijzigde) tekst. Staat het oorspronkelijke
 * stuk niet meer op dezelfde plek, dan wordt het opgezocht; alleen als het precies één keer voorkomt.
 * Geeft null als het voorstel niet meer automatisch past.
 */
export function pasAiVoorstelToe(inhoud: string, voorstel: Pick<AiVoorstelTekst, "start" | "eind" | "voor" | "na">): { tekst: string; start: number } | null {
  let start = voorstel.start;
  if (inhoud.slice(start, voorstel.eind) !== voorstel.voor) {
    start = inhoud.indexOf(voorstel.voor);
    if (start === -1 || inhoud.indexOf(voorstel.voor, start + 1) !== -1) return null;
  }
  const eind = start + voorstel.voor.length;
  return { tekst: inhoud.slice(0, start) + voorstel.na + inhoud.slice(eind), start };
}
