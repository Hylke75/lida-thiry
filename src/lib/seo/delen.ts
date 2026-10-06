// Open Graph- en Twitter-metadata voor losse pagina's (blog, beheerbare pagina's).
//
// Geeft een pagina zelf `openGraph` op, dan vervangt Next.js daarmee die van de
// layout helemaal: ook de standaard-deelafbeelding (uit de website-instellingen
// of app/opengraph-image.tsx) en de sitenaam verdwijnen dan. Daarom vult deze
// functie die altijd zelf in. Puur, zodat het te testen is.

import type { Metadata } from "next";
import type { WebsiteInstellingen } from "../website/instellingen";

/** Het adres van app/opengraph-image.tsx (de standaard-deelafbeelding). */
export const STANDAARD_DEELBEELD = "/opengraph-image";

export interface Deelbeeld {
  url: string;
  alt: string;
  width?: number;
  height?: number;
}

type Site = Pick<WebsiteInstellingen, "volledigeNaam" | "deelAfbeeldingUrl">;

/** De deelafbeelding uit de website-instellingen, anders de gegenereerde standaard. */
export function standaardDeelbeeld(site: Site): Deelbeeld {
  return site.deelAfbeeldingUrl
    ? { url: site.deelAfbeeldingUrl, alt: site.volledigeNaam }
    : { url: STANDAARD_DEELBEELD, alt: site.volledigeNaam, width: 1200, height: 630 };
}

export interface DeelInvoer {
  titel: string;
  omschrijving?: string;
  /** Pad van de pagina (relatief; metadataBase maakt het absoluut). */
  url: string;
  /** Eigen afbeelding (omslag); zonder: de standaard-deelafbeelding. */
  beeld?: Deelbeeld | null;
  /** Voor een artikel (blogbericht): og:type article met deze velden. */
  artikel?: {
    publishedTime?: string;
    modifiedTime?: string;
    authors?: string[];
    section?: string;
    tags?: string[];
  };
}

export function deelMetadata(site: Site, o: DeelInvoer): Pick<Metadata, "openGraph" | "twitter"> {
  const beeld = o.beeld ?? standaardDeelbeeld(site);
  const basis = {
    locale: "nl_NL",
    siteName: site.volledigeNaam,
    url: o.url,
    title: o.titel,
    description: o.omschrijving,
    images: [beeld],
  };
  return {
    openGraph: o.artikel ? { ...basis, type: "article", ...o.artikel } : { ...basis, type: "website" },
    twitter: { card: "summary_large_image", title: o.titel, description: o.omschrijving, images: [beeld] },
  };
}

/**
 * De kop op de standaard-deelafbeelding (app/opengraph-image.tsx): de titel bij
 * delen (Website → Instellingen), met het laatste woord als cursief accent zoals
 * in de huisstijl, en een lettergrootte die bij de lengte past.
 */
export function deelbeeldKop(titel: string): { voor: string; accent: string; grootte: number } {
  const t = titel.replace(/\s+/g, " ").trim();
  const i = t.lastIndexOf(" ");
  const grootte = t.length <= 24 ? 104 : t.length <= 40 ? 80 : 62;
  return i === -1 ? { voor: "", accent: t, grootte } : { voor: t.slice(0, i), accent: t.slice(i + 1), grootte };
}
