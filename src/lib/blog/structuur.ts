// Gestructureerde gegevens (schema.org JSON-LD) voor blogberichten.

export interface BlogPostingInvoer {
  titel: string;
  omschrijving: string;
  /** Absolute URL van het bericht. */
  url: string;
  /** Absolute URL van de afbeelding, als die er is. */
  afbeelding?: string | null;
  gepubliceerdOp: string;
  bijgewerktOp: string;
  auteur: string;
  tags?: readonly string[];
  categorie?: string | null;
  /** Absolute basis-URL van de site (voor de uitgever). */
  siteUrl: string;
}

export const UITGEVER_NAAM = "Lida Thiry Imago & Kledingadvies";

export function blogPostingJsonLd(b: BlogPostingInvoer): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: b.titel.slice(0, 110),
    description: b.omschrijving,
    ...(b.afbeelding ? { image: [b.afbeelding] } : {}),
    datePublished: b.gepubliceerdOp,
    dateModified: b.bijgewerktOp > b.gepubliceerdOp ? b.bijgewerktOp : b.gepubliceerdOp,
    author: { "@type": "Person", name: b.auteur || "Lida Thiry", url: b.siteUrl },
    publisher: {
      "@type": "Organization",
      name: UITGEVER_NAAM,
      url: b.siteUrl,
      logo: { "@type": "ImageObject", url: `${b.siteUrl}/icon.svg` },
    },
    mainEntityOfPage: { "@type": "WebPage", "@id": b.url },
    url: b.url,
    inLanguage: "nl-NL",
    ...(b.categorie ? { articleSection: b.categorie } : {}),
    ...(b.tags?.length ? { keywords: b.tags.join(", ") } : {}),
  };
}

/**
 * JSON voor in een <script type="application/ld+json">. elk `<` wordt een JSON-escape (backslash-u003c), zodat
 * tekst als "</script>" in een titel de pagina niet kan openbreken.
 */
export function veiligeJson(waarde: unknown): string {
  return JSON.stringify(waarde).replace(/</g, "\\u003c");
}
