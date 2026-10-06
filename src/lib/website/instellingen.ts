// Website-instellingen (Beheer → Website → Instellingen): naam, omschrijving, logo,
// favicon, deelafbeelding en social media. Puur: geen database. Lege waarden
// betekenen "standaard uit de code", zodat de site er zonder instellingen precies
// zo uitziet als vóór deze instellingen bestonden.

/** Standaardwaarden (gelijk aan wat de site al gebruikte). */
import { BEDRIJFSNAAM_STANDAARD } from "../site";

export const STANDAARD_SITE = {
  /** Korte naam: kop bovenaan en achter paginatitels ("Blog · Lida Thiry"). */
  korteNaam: "Lida Thiry",
  /** Volledige naam: bij delen (og:site_name), footer en applicatienaam. */
  volledigeNaam: BEDRIJFSNAAM_STANDAARD,
  omschrijving:
    "Ontdek je figuurtype met de online kledingadviestest van Lida Thiry, imago- en kledingadviseur. Meet jezelf op, beantwoord een paar vragen en ontvang direct je persoonlijke advies als PDF.",
  /** Titel van de homepage (zonder eigen sitenaam). */
  homeTitel: "Online kledingadviestest",
  /** Titel bij delen van de homepage. */
  deelTitel: "Ontdek je figuurtype",
  /** Naam van de eigenaar (voorwaarden, privacy) en standaardauteur van blogberichten. */
  eigenaarNaam: "Lida Thiry",
} as const;

/** Soorten bedrijf voor de gestructureerde gegevens (schema.org @type). De eerste is de standaard. */
export const BEDRIJF_TYPES = [
  { waarde: "ProfessionalService", label: "Zakelijke dienstverlening (standaard)" },
  { waarde: "LocalBusiness", label: "Lokaal bedrijf met een vestiging" },
  { waarde: "HealthAndBeautyBusiness", label: "Schoonheid en verzorging" },
  { waarde: "Organization", label: "Organisatie (zonder vestiging)" },
] as const;
export type BedrijfType = (typeof BEDRIJF_TYPES)[number]["waarde"];

export function isBedrijfType(w: unknown): w is BedrijfType {
  return BEDRIJF_TYPES.some((t) => t.waarde === w);
}

export type SocialNetwerk = "instagram" | "facebook" | "linkedin" | "pinterest" | "youtube" | "tiktok";

export interface SocialDefinitie {
  netwerk: SocialNetwerk;
  sleutel: `social_${SocialNetwerk}`;
  label: string;
  /** Toegestane domeinen (ook subdomeinen, zoals www. of nl.). */
  domeinen: readonly string[];
  voorbeeld: string;
}

export const SOCIAL_NETWERKEN: readonly SocialDefinitie[] = [
  { netwerk: "instagram", sleutel: "social_instagram", label: "Instagram", domeinen: ["instagram.com"], voorbeeld: "https://www.instagram.com/jouwnaam" },
  { netwerk: "facebook", sleutel: "social_facebook", label: "Facebook", domeinen: ["facebook.com", "fb.com"], voorbeeld: "https://www.facebook.com/jouwpagina" },
  { netwerk: "linkedin", sleutel: "social_linkedin", label: "LinkedIn", domeinen: ["linkedin.com"], voorbeeld: "https://www.linkedin.com/in/jouwnaam" },
  { netwerk: "pinterest", sleutel: "social_pinterest", label: "Pinterest", domeinen: ["pinterest.com", "pinterest.nl", "pin.it"], voorbeeld: "https://nl.pinterest.com/jouwnaam" },
  { netwerk: "youtube", sleutel: "social_youtube", label: "YouTube", domeinen: ["youtube.com", "youtu.be"], voorbeeld: "https://www.youtube.com/@jouwnaam" },
  { netwerk: "tiktok", sleutel: "social_tiktok", label: "TikTok", domeinen: ["tiktok.com"], voorbeeld: "https://www.tiktok.com/@jouwnaam" },
];

export interface SocialLink {
  netwerk: SocialNetwerk;
  label: string;
  url: string;
}

/** De website-instellingen zoals de site ze gebruikt (met standaarden ingevuld). */
export interface WebsiteInstellingen {
  /** Ingestelde naam, of null (dan gelden de standaardnamen). */
  eigenNaam: string | null;
  korteNaam: string;
  volledigeNaam: string;
  omschrijving: string;
  logoUrl: string | null;
  faviconUrl: string | null;
  deelAfbeeldingUrl: string | null;
  /** Alleen geldige links, in vaste volgorde. */
  social: SocialLink[];
  /** Ruwe opgeslagen indeling van de homepage (zie website/homepage.ts). */
  homepageIndeling: string | null;
  /** Titel van de homepage (zonder sitenaam) en de titel bij delen. */
  homeTitel: string;
  deelTitel: string;
  /** Hele site uit zoekmachines houden (vóór de livegang). */
  nietIndexeren: boolean;
  /** Bedrijfsgegevens voor zoekmachines (JSON-LD) en de voettekst. */
  telefoon: string | null;
  werkgebied: string | null;
  bedrijfType: BedrijfType;
  /** Eigenaar (voorwaarden, privacy). */
  eigenaarNaam: string;
  /** Auteur van blogberichten zonder eigen auteur (en in de RSS-feed). */
  standaardAuteur: string;
  /** Of de discrete link "Beheer" in de voettekst staat. */
  beheerlinkInFooter: boolean;
  /** Ruwe opgeslagen SEO van de vaste pagina's (zie website/seo.ts). */
  seoPaginas: string | null;
}

/** Sleutels die het beheerscherm opslaat (de homepage-indeling heeft een eigen scherm). */
export const WEBSITE_SLEUTELS = [
  "site_naam",
  "site_omschrijving",
  "logo_url",
  "favicon_url",
  "deel_afbeelding_url",
  ...SOCIAL_NETWERKEN.map((s) => s.sleutel),
  "home_titel",
  "deel_titel",
  "niet_indexeren",
  "bedrijf_type",
  "telefoon",
  "werkgebied",
  "eigenaar_naam",
  "standaard_auteur",
  "afzender_naam",
  "footer_beheerlink",
] as const;
export type WebsiteSleutel = (typeof WEBSITE_SLEUTELS)[number];

export const MAX_NAAM = 80;
export const MAX_OMSCHRIJVING = 300;
/** Titels: zoekmachines tonen er ongeveer 60 tekens van. */
export const MAX_TITEL = 70;
export const MAX_WERKGEBIED = 200;
/** Zoekmachines tonen ongeveer zoveel tekens van de omschrijving. */
export const ADVIES_OMSCHRIJVING = { min: 50, max: 160 } as const;

function schoon(w: string | null | undefined): string | null {
  if (typeof w !== "string") return null;
  const t = w.trim();
  return t === "" ? null : t;
}

type Uitkomst = { ok: true; waarde: string | null } | { ok: false; fout: string };

function alsUrl(invoer: string): URL | null {
  try {
    return new URL(invoer);
  } catch {
    return null;
  }
}

/**
 * Een afbeeldingsadres: https-URL (bijv. uit de mediabibliotheek) of een pad op
 * de eigen site ("/logo.png"). Leeg = geen afbeelding.
 */
export function valideerAfbeeldingUrl(invoer: string | null | undefined, label = "Afbeelding"): Uitkomst {
  const v = schoon(invoer);
  if (!v) return { ok: true, waarde: null };
  if (v.length > 1000) return { ok: false, fout: `${label}: het adres is te lang.` };
  if (/^\/(?!\/)\S*$/.test(v)) return { ok: true, waarde: v };
  const url = alsUrl(v);
  if (!url || url.protocol !== "https:" || !url.hostname.includes(".")) {
    return { ok: false, fout: `${label}: vul een volledig adres in dat met https:// begint.` };
  }
  return { ok: true, waarde: url.toString() };
}

function hoortBij(host: string, domeinen: readonly string[]): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return domeinen.some((d) => h === d || h.endsWith(`.${d}`));
}

/**
 * Een social-media-link: https en op het juiste domein (bijv. instagram.com).
 * Zonder http(s):// ervoor wordt https:// aangevuld ("instagram.com/lida").
 */
export function valideerSocialUrl(netwerk: SocialNetwerk, invoer: string | null | undefined): Uitkomst {
  const def = SOCIAL_NETWERKEN.find((s) => s.netwerk === netwerk);
  if (!def) return { ok: false, fout: "Onbekend netwerk." };
  const v = schoon(invoer);
  if (!v) return { ok: true, waarde: null };
  const metSchema = /^[a-z][a-z0-9+.-]*:/i.test(v) ? v : `https://${v.replace(/^\/+/, "")}`;
  const url = alsUrl(metSchema);
  if (!url) return { ok: false, fout: `${def.label}: dit is geen geldig adres (bijv. ${def.voorbeeld}).` };
  if (url.protocol !== "https:") {
    return { ok: false, fout: `${def.label}: het adres moet met https:// beginnen.` };
  }
  if (url.username || url.password || !hoortBij(url.hostname, def.domeinen)) {
    return {
      ok: false,
      fout: `${def.label}: het adres moet op ${def.domeinen.join(" of ")} staan (bijv. ${def.voorbeeld}).`,
    };
  }
  if (url.pathname === "/" && !url.search) {
    return { ok: false, fout: `${def.label}: vul het adres van je eigen profiel of pagina in, niet alleen de homepage.` };
  }
  return { ok: true, waarde: url.toString() };
}

/** Controleert de invoer van het beheerscherm; geeft de op te slaan waarden of foutmeldingen. */
export function valideerWebsiteInvoer(
  invoer: Readonly<Partial<Record<WebsiteSleutel, string | null | undefined>>>,
): { ok: true; waarden: Record<WebsiteSleutel, string | null> } | { ok: false; fouten: string[] } {
  const fouten: string[] = [];
  const waarden = {} as Record<WebsiteSleutel, string | null>;

  const naam = schoon(invoer.site_naam);
  if (naam && naam.length > MAX_NAAM) fouten.push(`Naam van de website: maximaal ${MAX_NAAM} tekens.`);
  waarden.site_naam = naam;

  const oms = schoon(invoer.site_omschrijving)?.replace(/\s+/g, " ") ?? null;
  if (oms && oms.length > MAX_OMSCHRIJVING) fouten.push(`Omschrijving: maximaal ${MAX_OMSCHRIJVING} tekens.`);
  waarden.site_omschrijving = oms;

  const beelden: [WebsiteSleutel, string][] = [
    ["logo_url", "Logo"],
    ["favicon_url", "Favicon"],
    ["deel_afbeelding_url", "Deelafbeelding"],
  ];
  for (const [sleutel, label] of beelden) {
    const u = valideerAfbeeldingUrl(invoer[sleutel], label);
    if (u.ok) waarden[sleutel] = u.waarde;
    else fouten.push(u.fout);
  }

  for (const s of SOCIAL_NETWERKEN) {
    const u = valideerSocialUrl(s.netwerk, invoer[s.sleutel]);
    if (u.ok) waarden[s.sleutel] = u.waarde;
    else fouten.push(u.fout);
  }

  const kort = (sleutel: WebsiteSleutel, label: string, max: number) => {
    const w = schoon(invoer[sleutel])?.replace(/\s+/g, " ") ?? null;
    if (w && w.length > max) fouten.push(`${label}: maximaal ${max} tekens.`);
    waarden[sleutel] = w;
  };
  kort("home_titel", "Titel van de homepage", MAX_TITEL);
  kort("deel_titel", "Titel bij delen", MAX_TITEL);
  kort("werkgebied", "Werkgebied", MAX_WERKGEBIED);
  kort("eigenaar_naam", "Naam van de eigenaar", MAX_NAAM);
  kort("standaard_auteur", "Standaardauteur", MAX_NAAM);
  kort("afzender_naam", "Naam van de afzender", MAX_NAAM);
  if (waarden.afzender_naam && /[<>"@\\]/.test(waarden.afzender_naam)) {
    fouten.push('Naam van de afzender: alleen een naam, zonder e-mailadres of tekens als < > " @.');
  }

  const tel = valideerTelefoon(invoer.telefoon);
  if (tel.ok) waarden.telefoon = tel.waarde;
  else fouten.push(tel.fout);

  const type = schoon(invoer.bedrijf_type);
  if (type && !isBedrijfType(type)) fouten.push("Soort bedrijf: kies een van de opties.");
  // De standaard bewaren we als leeg.
  waarden.bedrijf_type = type && isBedrijfType(type) && type !== BEDRIJF_TYPES[0].waarde ? type : null;

  waarden.niet_indexeren = schoon(invoer.niet_indexeren) === "ja" ? "ja" : null;
  // Standaard verborgen (herziening oktober 2026): alleen "tonen" zet de link aan.
  waarden.footer_beheerlink = schoon(invoer.footer_beheerlink) === "tonen" ? "tonen" : null;

  return fouten.length ? { ok: false, fouten } : { ok: true, waarden };
}

/**
 * Een telefoonnummer: cijfers, spaties, +, -, punten en haakjes, met 8 tot 15
 * cijfers. Leeg = geen telefoonnummer.
 */
export function valideerTelefoon(invoer: string | null | undefined): Uitkomst {
  const v = schoon(invoer)?.replace(/\s+/g, " ") ?? null;
  if (!v) return { ok: true, waarde: null };
  const cijfers = v.replace(/\D/g, "");
  if (v.length > 30 || !/^\+?[\d\s().-]+$/.test(v) || cijfers.length < 8 || cijfers.length > 15) {
    return { ok: false, fout: "Telefoonnummer: alleen cijfers, spaties en eventueel + (bijv. 06 12345678 of +31 6 12345678)." };
  }
  return { ok: true, waarde: v };
}

/** Het telefoonnummer als tel:-link ("06 1234 5678" → "tel:0612345678"). */
export function telefoonLink(telefoon: string): string {
  return `tel:${telefoon.trim().startsWith("+") ? "+" : ""}${telefoon.replace(/\D/g, "")}`;
}

/**
 * Opgeslagen instellingen → wat de site gebruikt. Ongeldige waarden (bijv. met
 * de hand in de database gezet) worden genegeerd in plaats van getoond.
 */
export function websiteInstellingen(
  map: Readonly<Record<string, string | null | undefined>> | null | undefined,
): WebsiteInstellingen {
  const m = map ?? {};
  const eigenNaam = schoon(m.site_naam)?.slice(0, MAX_NAAM) ?? null;
  const beeld = (sleutel: string) => {
    const u = valideerAfbeeldingUrl(m[sleutel]);
    return u.ok ? u.waarde : null;
  };
  const social: SocialLink[] = [];
  for (const s of SOCIAL_NETWERKEN) {
    const u = valideerSocialUrl(s.netwerk, m[s.sleutel]);
    if (u.ok && u.waarde) social.push({ netwerk: s.netwerk, label: s.label, url: u.waarde });
  }
  const telefoon = valideerTelefoon(m.telefoon);
  const type = schoon(m.bedrijf_type);
  const eigenaar = schoon(m.eigenaar_naam)?.slice(0, MAX_NAAM) ?? null;
  return {
    eigenNaam,
    korteNaam: eigenNaam ?? STANDAARD_SITE.korteNaam,
    volledigeNaam: eigenNaam ?? STANDAARD_SITE.volledigeNaam,
    omschrijving: schoon(m.site_omschrijving)?.slice(0, MAX_OMSCHRIJVING) ?? STANDAARD_SITE.omschrijving,
    logoUrl: beeld("logo_url"),
    faviconUrl: beeld("favicon_url"),
    deelAfbeeldingUrl: beeld("deel_afbeelding_url"),
    social,
    homepageIndeling: schoon(m.homepage_indeling),
    homeTitel: schoon(m.home_titel)?.slice(0, MAX_TITEL) ?? STANDAARD_SITE.homeTitel,
    deelTitel: schoon(m.deel_titel)?.slice(0, MAX_TITEL) ?? STANDAARD_SITE.deelTitel,
    nietIndexeren: schoon(m.niet_indexeren) === "ja",
    telefoon: telefoon.ok ? telefoon.waarde : null,
    werkgebied: schoon(m.werkgebied)?.slice(0, MAX_WERKGEBIED) ?? null,
    bedrijfType: isBedrijfType(type) ? type : BEDRIJF_TYPES[0].waarde,
    eigenaarNaam: eigenaar ?? STANDAARD_SITE.eigenaarNaam,
    standaardAuteur: schoon(m.standaard_auteur)?.slice(0, MAX_NAAM) ?? eigenaar ?? STANDAARD_SITE.eigenaarNaam,
    // Standaard verborgen; een oude waarde "verbergen" blijft verborgen.
    beheerlinkInFooter: schoon(m.footer_beheerlink) === "tonen",
    seoPaginas: schoon(m.seo_paginas),
  };
}

/** Alt-tekst van het logo: afgeleid van de sitenaam. */
export function logoAlt(site: Pick<WebsiteInstellingen, "korteNaam">): string {
  return site.korteNaam;
}
