// Pure regels voor de pagina-editor: de formuliervelden (zonder React).

import { slugSuggestie, type Pagina } from "@/lib/paginas/beheer";

/** De velden zoals ze in de editor staan (lege tekst in plaats van null, volgorde als tekst). */
export interface Velden {
  titel: string;
  slug: string;
  intro: string;
  inhoud: string;
  omslag_url: string;
  omslag_alt: string;
  in_menu: boolean;
  in_footer: boolean;
  menu_label: string;
  volgorde: string;
  seo_titel: string;
  seo_omschrijving: string;
  niet_indexeren: boolean;
}

export function alsVelden(p: Pagina): Velden {
  return {
    titel: p.titel,
    slug: p.slug,
    intro: p.intro,
    inhoud: p.inhoud,
    omslag_url: p.omslag_url ?? "",
    omslag_alt: p.omslag_alt,
    in_menu: p.in_menu,
    in_footer: p.in_footer,
    menu_label: p.menu_label,
    volgorde: String(p.volgorde),
    seo_titel: p.seo_titel,
    seo_omschrijving: p.seo_omschrijving,
    niet_indexeren: p.niet_indexeren,
  };
}

/** De velden zoals de server ze verwacht: lege omslag wordt null, de volgorde een getal (ongeldig = 0). */
export const alsInvoer = (v: Velden) => ({ ...v, omslag_url: v.omslag_url.trim() || null, volgorde: Number(v.volgorde) || 0 });

/**
 * Of het webadres de titel automatisch volgt: alleen bij een concept waarvan de slug nog
 * uit de titel komt, of nog de standaardslug van een nieuwe pagina is.
 */
export function slugVolgtTitel(pagina: Pick<Pagina, "slug" | "titel" | "status">): boolean {
  return pagina.status === "concept" && (pagina.slug === slugSuggestie(pagina.titel) || /^nieuwe-pagina(-\d+)?$/.test(pagina.slug));
}

/** Een slug tijdens het typen: kleine letters, spaties worden streepjes. */
export const slugTijdensTypen = (s: string) => s.toLowerCase().replace(/\s+/g, "-");

/** Een slug na het verlaten van het veld: alleen a-z, 0-9 en enkele streepjes, niet aan begin of eind. */
export const schoonSlug = (s: string) => s.replace(/[^a-z0-9-]+/g, "-").replace(/-{2,}/g, "-").replace(/^-+|-+$/g, "");
