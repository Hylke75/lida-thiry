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
