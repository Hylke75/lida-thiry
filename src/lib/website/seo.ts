// SEO van de vaste pagina's (Beheer → Website → SEO): titel, omschrijving,
// "niet indexeren" en "in de sitemap" per pagina, plus de beslissingen voor
// robots.txt en de sitemap. Puur (geen database), zodat het te testen is.
//
// Opslag: één instelling `seo_paginas` met JSON { "<sleutel>": { titel?, omschrijving?,
// nietIndexeren?, sitemap? } }. Alleen afwijkingen van de standaard worden
// bewaard; lege velden betekenen "standaard uit de code" (de teksten die hier
// vóór deze instelling vast in de pagina's stonden).

import type { Metadata, MetadataRoute } from "next";

export interface VastePagina {
  sleutel: string;
  /** Pad op de site (canonical en sitemap). */
  pad: string;
  /** Naam in het beheer. */
  naam: string;
  /** Standaardtitel; null = afgeleid van de pagina zelf (blog: "Blog: <titel uit Teksten>"). */
  titel: string | null;
  omschrijving: string | null;
  /** Standaard in de sitemap. */
  sitemap: boolean;
  /** Altijd "niet indexeren" (persoonlijke pagina's); niet te wijzigen. */
  altijdNietIndexeren?: boolean;
  /** Toelichting in het beheer. */
  uitleg?: string;
  prioriteit: number;
  frequentie: "weekly" | "monthly" | "yearly";
}

export const VASTE_PAGINAS = [
  {
    sleutel: "bestellen",
    pad: "/bestellen",
    naam: "Bestellen",
    titel: "Bestellen",
    omschrijving: "Bestel de online kledingadviestest van Lida Thiry en ontvang direct je persoonlijke kledingadvies als PDF.",
    sitemap: true,
    prioriteit: 0.8,
    frequentie: "monthly",
  },
  {
    sleutel: "afspraak",
    pad: "/afspraak",
    naam: "Afspraak maken",
    titel: "Afspraak maken",
    omschrijving: "Maak online een afspraak voor persoonlijk imago- en kledingadvies.",
    sitemap: true,
    prioriteit: 0.7,
    frequentie: "monthly",
  },
  {
    sleutel: "cadeaubon",
    pad: "/cadeaubon",
    naam: "Cadeaubon",
    titel: "Cadeaubon",
    omschrijving:
      "Geef de online kledingadviestest van Lida Thiry cadeau. Kies een bedrag en laat de cadeaubon direct of op een datum naar keuze mailen.",
    sitemap: true,
    prioriteit: 0.6,
    frequentie: "monthly",
  },
  {
    sleutel: "blog",
    pad: "/blog",
    naam: "Blog (overzicht)",
    titel: null,
    omschrijving: null,
    sitemap: true,
    uitleg:
      "Leeg: ‘Blog: ’ plus de titel van het blogoverzicht, en de introductie als omschrijving (Teksten → Blog). Bij een categorie, tag of pagina komt die achter de titel.",
    prioriteit: 0.7,
    frequentie: "weekly",
  },
  {
    sleutel: "mijn-advies",
    pad: "/mijn-advies",
    naam: "Mijn advies",
    titel: "Mijn advies opnieuw ontvangen",
    omschrijving: "Vraag de link naar je persoonlijke kledingadvies of je test opnieuw aan per e-mail.",
    sitemap: false,
    prioriteit: 0.3,
    frequentie: "yearly",
  },
  {
    sleutel: "privacy",
    pad: "/privacy",
    naam: "Privacyverklaring",
    titel: "Privacyverklaring",
    omschrijving:
      "Hoe Lida Thiry Imago & Kledingadvies omgaat met je persoonsgegevens en lichaamsmaten bij de online kledingadviestest.",
    sitemap: true,
    prioriteit: 0.3,
    frequentie: "yearly",
  },
  {
    sleutel: "voorwaarden",
    pad: "/voorwaarden",
    naam: "Algemene voorwaarden",
    titel: "Algemene voorwaarden",
    omschrijving: "De algemene voorwaarden voor de online kledingadviestest van Lida Thiry Imago & Kledingadvies.",
    sitemap: true,
    prioriteit: 0.3,
    frequentie: "yearly",
  },
  {
    sleutel: "review",
    pad: "/review",
    naam: "Review schrijven (persoonlijke link)",
    titel: "Deel je ervaring",
    omschrijving: null,
    sitemap: false,
    altijdNietIndexeren: true,
    uitleg: "Alleen bereikbaar via de persoonlijke link uit de uitnodiging; staat nooit in zoekmachines of de sitemap.",
    prioriteit: 0,
    frequentie: "yearly",
  },
] as const satisfies readonly VastePagina[];

export type VastePaginaSleutel = (typeof VASTE_PAGINAS)[number]["sleutel"];

export interface PaginaSeoInvoer {
  titel?: string | null;
  omschrijving?: string | null;
  nietIndexeren?: boolean;
  sitemap?: boolean;
}

/** Opgeslagen afwijkingen per pagina (alleen ingevulde velden). */
export type SeoPaginas = Partial<Record<VastePaginaSleutel, PaginaSeoInvoer>>;

/** Wat een pagina gebruikt, met de standaarden ingevuld. */
export interface PaginaSeo {
  titel: string | null;
  omschrijving: string | null;
  nietIndexeren: boolean;
  inSitemap: boolean;
}

export const MAX_SEO_TITEL = 70;
export const MAX_SEO_OMSCHRIJVING = 300;

function definitie(sleutel: VastePaginaSleutel): VastePagina {
  return VASTE_PAGINAS.find((p) => p.sleutel === sleutel)!;
}

function schoon(w: unknown, max: number): string | null {
  if (typeof w !== "string") return null;
  const t = w.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
}

/** Leest de opgeslagen JSON; ongeldig of leeg → geen afwijkingen. */
export function leesSeoPaginas(json: string | null | undefined): SeoPaginas {
  if (!json) return {};
  let ruw: unknown;
  try {
    ruw = JSON.parse(json);
  } catch {
    return {};
  }
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) return {};
  const uit: SeoPaginas = {};
  for (const p of VASTE_PAGINAS) {
    const r = (ruw as Record<string, unknown>)[p.sleutel];
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const item: PaginaSeoInvoer = {};
    const titel = schoon(o.titel, MAX_SEO_TITEL);
    const oms = schoon(o.omschrijving, MAX_SEO_OMSCHRIJVING);
    if (titel) item.titel = titel;
    if (oms) item.omschrijving = oms;
    if (typeof o.nietIndexeren === "boolean") item.nietIndexeren = o.nietIndexeren;
    if (typeof o.sitemap === "boolean") item.sitemap = o.sitemap;
    if (Object.keys(item).length) uit[p.sleutel] = item;
  }
  return uit;
}

/** De SEO van één vaste pagina, met de standaarden en de schakelaar voor de hele site. */
export function paginaSeo(sleutel: VastePaginaSleutel, opgeslagen: SeoPaginas, siteNietIndexeren = false): PaginaSeo {
  const d = definitie(sleutel);
  const o = opgeslagen[sleutel] ?? {};
  const nietIndexeren = !!d.altijdNietIndexeren || o.nietIndexeren === true;
  return {
    titel: o.titel ?? d.titel,
    omschrijving: o.omschrijving ?? d.omschrijving,
    nietIndexeren: nietIndexeren || siteNietIndexeren,
    // Een pagina die niet geïndexeerd mag worden, hoort ook niet in de sitemap.
    inSitemap: !nietIndexeren && !siteNietIndexeren && (o.sitemap ?? d.sitemap),
  };
}

/**
 * Metadata voor een vaste pagina. `robots` alleen als de pagina zelf niet
 * geïndexeerd mag worden; anders erft de pagina die van de layout (waar de
 * schakelaar voor de hele site staat), zodat een pagina die schakelaar nooit opheft.
 */
export function vastePaginaMetadata(seo: PaginaSeo, pad: string | null): Metadata {
  return {
    ...(seo.titel ? { title: seo.titel } : {}),
    ...(seo.omschrijving ? { description: seo.omschrijving } : {}),
    ...(pad ? { alternates: { canonical: pad } } : {}),
    ...(seo.nietIndexeren ? { robots: { index: false, follow: true } } : {}),
  };
}

type Uitkomst = { ok: true; json: string | null; waarde: SeoPaginas } | { ok: false; fouten: string[] };

/**
 * Controleert de invoer van het beheerscherm. Velden gelijk aan de standaard
 * worden niet bewaard; zonder afwijkingen is het resultaat null (= standaard).
 */
export function valideerSeoPaginas(invoer: unknown): Uitkomst {
  if (!invoer || typeof invoer !== "object" || Array.isArray(invoer)) return { ok: false, fouten: ["Ongeldige invoer."] };
  const fouten: string[] = [];
  const uit: SeoPaginas = {};
  for (const p of VASTE_PAGINAS as readonly VastePagina[]) {
    const r = (invoer as Record<string, unknown>)[p.sleutel];
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const titel = typeof o.titel === "string" ? o.titel.replace(/\s+/g, " ").trim() : "";
    const oms = typeof o.omschrijving === "string" ? o.omschrijving.replace(/\s+/g, " ").trim() : "";
    if (titel.length > MAX_SEO_TITEL) fouten.push(`${p.naam}: titel maximaal ${MAX_SEO_TITEL} tekens.`);
    if (oms.length > MAX_SEO_OMSCHRIJVING) fouten.push(`${p.naam}: omschrijving maximaal ${MAX_SEO_OMSCHRIJVING} tekens.`);
    const item: PaginaSeoInvoer = {};
    if (titel && titel !== p.titel) item.titel = titel;
    if (oms && oms !== p.omschrijving) item.omschrijving = oms;
    if (!p.altijdNietIndexeren) {
      if (o.nietIndexeren === true) item.nietIndexeren = true;
      if (typeof o.sitemap === "boolean" && o.sitemap !== p.sitemap) item.sitemap = o.sitemap;
    }
    if (Object.keys(item).length) uit[p.sleutel as VastePaginaSleutel] = item;
  }
  if (fouten.length) return { ok: false, fouten };
  return { ok: true, json: Object.keys(uit).length ? JSON.stringify(uit) : null, waarde: uit };
}

// robots.txt en sitemap ------------------------------------------------------------------

/** Paden die nooit gecrawld hoeven te worden. */
export const ROBOTS_UITGESLOTEN = ["/admin", "/test", "/api", "/auth", "/status"] as const;

/** robots.txt: normaal alles behalve het beheer e.d.; met "niet indexeren" niets. */
export function robotsRegels(nietIndexeren: boolean, basisUrl: string): MetadataRoute.Robots {
  return {
    rules: nietIndexeren
      ? { userAgent: "*", disallow: "/" }
      : { userAgent: "*", allow: "/", disallow: [...ROBOTS_UITGESLOTEN] },
    sitemap: `${basisUrl.replace(/\/+$/, "")}/sitemap.xml`,
  };
}

/** De vaste pagina's die in de sitemap horen (in de volgorde van VASTE_PAGINAS). */
export function vastePaginasInSitemap(
  opgeslagen: SeoPaginas,
  basisUrl: string,
  opties: { blogBijgewerkt?: string } = {},
): MetadataRoute.Sitemap {
  const basis = basisUrl.replace(/\/+$/, "");
  return (VASTE_PAGINAS as readonly VastePagina[])
    .filter((p) => paginaSeo(p.sleutel as VastePaginaSleutel, opgeslagen).inSitemap)
    .map((p) => ({
      url: `${basis}${p.pad}`,
      changeFrequency: p.frequentie,
      priority: p.prioriteit,
      ...(p.sleutel === "blog" && opties.blogBijgewerkt ? { lastModified: opties.blogBijgewerkt } : {}),
    }));
}

// Blogoverzicht ----------------------------------------------------------------------------

/**
 * Titels en omschrijving van het blogoverzicht. Standaard: "Blog: <titel uit
 * Teksten>" in het tabblad en "<titel>" bij delen; met een eigen SEO-titel die
 * titel voor beide. `extra` (categorie, tag, pagina) komt er steeds achter.
 */
export function blogOverzichtSeo(
  seo: PaginaSeo,
  tekst: { titel: string; intro: string },
  extra: string,
): { titel: string; deelTitel: string; omschrijving: string } {
  const met = (t: string) => (extra ? `${t} · ${extra}` : t);
  const deelTitel = met(seo.titel ?? tekst.titel);
  return {
    titel: seo.titel ? deelTitel : `Blog: ${deelTitel}`,
    deelTitel,
    omschrijving: seo.omschrijving ?? tekst.intro,
  };
}

/** Titel van de RSS-feed (en de feedlink in de kop): "<titel blog> · <sitenaam>". */
export function rssTitel(blogTitel: string, siteNaam: string): string {
  return `${blogTitel.trim() || "Blog"} · ${siteNaam}`;
}
