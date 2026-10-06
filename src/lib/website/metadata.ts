// De standaard-metadata van de hele site (root-layout), opgebouwd uit de
// website-instellingen. Puur, zodat het te testen is.
//
// Hoe Next.js dit samenvoegt (zie node_modules/next/dist/lib/metadata/resolve-metadata.js):
// - `icons`: zodra de layout `icons` meegeeft, wordt app/icon.svg niet meer gebruikt.
//   Zonder favicon laten we `icons` daarom weg, zodat icon.svg de standaard blijft.
// - `openGraph.images`: app/opengraph-image.tsx wordt alleen gebruikt als de layout
//   zelf geen `openGraph.images` opgeeft. Zonder deelafbeelding laten we het weg.
// - Pagina's die zelf `openGraph` (met `images`) opgeven, vervangen dit geheel.

import type { Metadata } from "next";
import type { WebsiteInstellingen } from "./instellingen";

/** Het MIME-type van een pictogram, afgeleid van de extensie (of undefined). */
export function pictogramType(url: string): string | undefined {
  const pad = url.split(/[?#]/)[0].toLowerCase();
  if (pad.endsWith(".svg")) return "image/svg+xml";
  if (pad.endsWith(".png")) return "image/png";
  if (pad.endsWith(".ico")) return "image/x-icon";
  if (pad.endsWith(".webp")) return "image/webp";
  if (pad.endsWith(".jpg") || pad.endsWith(".jpeg")) return "image/jpeg";
  if (pad.endsWith(".gif")) return "image/gif";
  return undefined;
}

export function bouwSiteMetadata(site: WebsiteInstellingen, basisUrl: string): Metadata {
  const deelTitel = `${site.deelTitel} · ${site.korteNaam}`;
  const type = site.faviconUrl ? pictogramType(site.faviconUrl) : undefined;

  return {
    metadataBase: new URL(basisUrl),
    title: {
      default: `${site.homeTitel} · ${site.korteNaam}`,
      template: `%s · ${site.korteNaam}`,
    },
    description: site.omschrijving,
    applicationName: site.volledigeNaam,
    authors: [{ name: site.standaardAuteur }],
    // Vóór de livegang: de hele site uit zoekmachines (pagina's zonder eigen robots erven dit).
    ...(site.nietIndexeren ? { robots: { index: false, follow: false } } : {}),
    ...(site.faviconUrl
      ? {
          icons: {
            icon: [{ url: site.faviconUrl, ...(type ? { type } : {}) }],
            shortcut: [site.faviconUrl],
            apple: [site.faviconUrl],
          },
        }
      : {}),
    openGraph: {
      type: "website",
      locale: "nl_NL",
      siteName: site.volledigeNaam,
      title: deelTitel,
      description: site.omschrijving,
      url: "/",
      ...(site.deelAfbeeldingUrl ? { images: [{ url: site.deelAfbeeldingUrl, alt: site.volledigeNaam }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: deelTitel,
      description: site.omschrijving,
      ...(site.deelAfbeeldingUrl ? { images: [{ url: site.deelAfbeeldingUrl, alt: site.volledigeNaam }] } : {}),
    },
  };
}
