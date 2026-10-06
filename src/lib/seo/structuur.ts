// Gestructureerde gegevens (schema.org JSON-LD) voor de homepage en de
// beheerbare pagina's. Puur: krijgt gewone gegevens binnen en geeft objecten
// terug; de pagina zet ze met veiligeJson() in een <script type="application/ld+json">.
// (Voor blogberichten: zie lib/blog/structuur.ts.)

/**
 * JSON voor in een <script type="application/ld+json">. elk `<` wordt een JSON-escape (backslash-u003c), zodat
 * tekst als "</script>" in een titel de pagina niet kan openbreken.
 */
export function veiligeJson(waarde: unknown): string {
  return JSON.stringify(waarde).replace(/</g, "\\u003c");
}

const CONTEXT = "https://schema.org";

/** Basis-URL zonder slash aan het eind. */
function zonderSlash(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Maakt een (mogelijk relatief) adres absoluut t.o.v. de site; ongeldig → null. */
export function absoluteUrl(url: string | null | undefined, basis: string): string | null {
  if (!url || !url.trim()) return null;
  try {
    return new URL(url.trim(), `${zonderSlash(basis)}/`).toString();
  } catch {
    return null;
  }
}

function organisatieId(basis: string): string {
  return `${zonderSlash(basis)}/#organisatie`;
}

// Adres --------------------------------------------------------------------------------

export interface PostalAddress {
  "@type": "PostalAddress";
  streetAddress?: string;
  postalCode?: string;
  addressLocality?: string;
  addressCountry: string;
}

/**
 * Het adres uit de instellingen ("Straat 1\n1234 AB Plaats", of op één regel
 * met komma's) als PostalAddress. Een Nederlandse postcode wordt herkend; lukt
 * dat niet, dan komt alles in streetAddress. Leeg → null.
 */
export function adresUitTekst(tekst: string | null | undefined): PostalAddress | null {
  const delen = (tekst ?? "")
    .split(/[\n,]+/)
    .map((d) => d.trim())
    .filter(Boolean);
  if (!delen.length) return null;
  const postcodeRe = /^(\d{4}\s?[A-Za-z]{2})\s+(.+)$/;
  const i = delen.findIndex((d) => postcodeRe.test(d));
  if (i === -1) return { "@type": "PostalAddress", streetAddress: delen.join(", "), addressCountry: "NL" };
  const [, postcode, plaats] = delen[i].match(postcodeRe)!;
  const voor = delen.slice(0, i);
  const straat = (voor.length ? voor : delen.slice(i + 1)).join(", ");
  return {
    "@type": "PostalAddress",
    ...(straat ? { streetAddress: straat } : {}),
    postalCode: postcode.replace(/\s/g, "").replace(/^(\d{4})/, "$1 ").toUpperCase(),
    addressLocality: plaats,
    addressCountry: "NL",
  };
}

// Organisatie --------------------------------------------------------------------------

export interface OrganisatieInvoer {
  naam: string;
  /** Absolute basis-URL van de site. */
  url: string;
  omschrijving?: string | null;
  /** Logo uit de website-instellingen (mag relatief zijn); zonder logo het site-icoon. */
  logo?: string | null;
  email?: string | null;
  adres?: string | null;
  /** Links naar social media. */
  sameAs?: readonly string[];
  /** Telefoonnummer zoals ingesteld. */
  telefoon?: string | null;
  /** Werkgebied: plaatsen of regio's, gescheiden door komma's; leeg = Nederland. */
  werkgebied?: string | null;
  /** schema.org-type (Website → Instellingen); standaard ProfessionalService. */
  type?: string | null;
}

/** Het werkgebied als areaServed: leeg → Nederland; één plaats → tekst; meer → lijst. */
export function werkgebiedJsonLd(werkgebied: string | null | undefined): unknown {
  const delen = (werkgebied ?? "")
    .split(/[,;\n]+/)
    .map((d) => d.trim())
    .filter(Boolean);
  if (!delen.length) return { "@type": "Country", name: "Nederland" };
  return delen.length === 1 ? delen[0] : delen;
}

export function organisatieJsonLd(o: OrganisatieInvoer): Record<string, unknown> {
  const basis = zonderSlash(o.url);
  const adres = adresUitTekst(o.adres);
  const email = o.email?.trim();
  const telefoon = o.telefoon?.trim();
  return {
    "@context": CONTEXT,
    "@type": o.type?.trim() || "ProfessionalService",
    "@id": organisatieId(basis),
    name: o.naam,
    url: `${basis}/`,
    logo: absoluteUrl(o.logo, basis) ?? `${basis}/icon.svg`,
    image: absoluteUrl(o.logo, basis) ?? `${basis}/opengraph-image`,
    ...(o.omschrijving?.trim() ? { description: o.omschrijving.trim() } : {}),
    ...(email ? { email } : {}),
    ...(telefoon ? { telephone: telefoon } : {}),
    ...(adres ? { address: adres } : {}),
    ...(o.sameAs?.length ? { sameAs: [...o.sameAs] } : {}),
    areaServed: werkgebiedJsonLd(o.werkgebied),
  };
}

// De test als product ------------------------------------------------------------------

/**
 * Samenvatting van de gepubliceerde reviews. Komt (later) uit
 * lib/reviews/publiek.ts → haalReviewSamenvatting(); zolang die er niet is, null.
 */
export interface ReviewSamenvatting {
  /** Gemiddelde score (1–5). */
  gemiddelde: number;
  aantal: number;
}

export interface TestProductInvoer {
  naam: string;
  omschrijving: string;
  /** Absolute basis-URL van de site. */
  url: string;
  /** Pad van de productpagina (standaard /bestellen); het aanbod linkt altijd naar /bestellen. */
  pad?: string;
  /** Prijs in centen; null = (nog) geen prijs → een Service zonder aanbod. */
  prijsCent: number | null;
  valuta?: string;
  afbeelding?: string | null;
  /** Of er nu besteld kan worden (standaard ja). */
  beschikbaar?: boolean;
  beoordeling?: ReviewSamenvatting | null;
}

/** Bedrag in centen als schema.org-prijs ("49.00"). */
export function prijsTekst(cent: number): string {
  return (Math.round(cent) / 100).toFixed(2);
}

export function testProductJsonLd(p: TestProductInvoer): Record<string, unknown> {
  const basis = zonderSlash(p.url);
  const afbeelding = absoluteUrl(p.afbeelding, basis);
  const bestelUrl = `${basis}/bestellen`;
  const metPrijs = typeof p.prijsCent === "number" && p.prijsCent > 0;
  const b = p.beoordeling;
  const metBeoordeling = !!b && b.aantal > 0 && b.gemiddelde >= 1 && b.gemiddelde <= 5;
  return {
    "@context": CONTEXT,
    "@type": metPrijs ? "Product" : "Service",
    name: p.naam,
    description: p.omschrijving,
    url: p.pad ? `${basis}${p.pad}` : bestelUrl,
    ...(afbeelding ? { image: afbeelding } : {}),
    ...(metPrijs ? { brand: { "@id": organisatieId(basis) } } : { provider: { "@id": organisatieId(basis) } }),
    ...(metPrijs
      ? {
          offers: {
            "@type": "Offer",
            price: prijsTekst(p.prijsCent!),
            priceCurrency: (p.valuta || "EUR").toUpperCase(),
            availability: p.beschikbaar === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
            url: bestelUrl,
            seller: { "@id": organisatieId(basis) },
          },
        }
      : {}),
    ...(metBeoordeling
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: Math.round(b!.gemiddelde * 10) / 10,
            reviewCount: b!.aantal,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

// Veelgestelde vragen ------------------------------------------------------------------

/** FAQPage uit vraag/antwoord-paren; lege paren vallen weg, geen vragen → null. */
export function faqJsonLd(vragen: readonly { vraag: string; antwoord: string }[]): Record<string, unknown> | null {
  const geldig = vragen
    .map((v) => ({ vraag: v.vraag.trim(), antwoord: v.antwoord.trim() }))
    .filter((v) => v.vraag && v.antwoord);
  if (!geldig.length) return null;
  return {
    "@context": CONTEXT,
    "@type": "FAQPage",
    mainEntity: geldig.map((v) => ({
      "@type": "Question",
      name: v.vraag,
      acceptedAnswer: { "@type": "Answer", text: v.antwoord },
    })),
  };
}

// Kruimelpad ---------------------------------------------------------------------------

/** BreadcrumbList; `pad` is relatief aan de site ("/" voor de homepage). */
export function kruimelpadJsonLd(basis: string, items: readonly { naam: string; pad: string }[]): Record<string, unknown> {
  const b = zonderSlash(basis);
  return {
    "@context": CONTEXT,
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: it.naam,
      item: `${b}${it.pad.startsWith("/") ? it.pad : `/${it.pad}`}`,
    })),
  };
}
