// Website-instellingen (Beheer → Website → Instellingen): naam, omschrijving, logo,
// favicon, deelafbeelding en social media. Puur: geen database. Lege waarden
// betekenen "standaard uit de code", zodat de site er zonder instellingen precies
// zo uitziet als vóór deze instellingen bestonden.

/** Standaardwaarden (gelijk aan wat de site al gebruikte). */
export const STANDAARD_SITE = {
  /** Korte naam: kop bovenaan en achter paginatitels ("Blog · Lida Thiry"). */
  korteNaam: "Lida Thiry",
  /** Volledige naam: bij delen (og:site_name), footer en applicatienaam. */
  volledigeNaam: "Lida Thiry Imago & Kledingadvies",
  omschrijving:
    "Ontdek je figuurtype met de online kledingadviestest van Lida Thiry, imago- en kledingadviseur. Meet jezelf op, beantwoord een paar vragen en ontvang direct je persoonlijke advies als PDF.",
  /** Titel van de homepage (zonder eigen sitenaam). */
  homeTitel: "Online kledingadviestest",
  /** Titel bij delen van de homepage. */
  deelTitel: "Ontdek je figuurtype",
} as const;

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
}

/** Sleutels die het beheerscherm opslaat (de homepage-indeling heeft een eigen scherm). */
export const WEBSITE_SLEUTELS = [
  "site_naam",
  "site_omschrijving",
  "logo_url",
  "favicon_url",
  "deel_afbeelding_url",
  ...SOCIAL_NETWERKEN.map((s) => s.sleutel),
] as const;
export type WebsiteSleutel = (typeof WEBSITE_SLEUTELS)[number];

export const MAX_NAAM = 80;
export const MAX_OMSCHRIJVING = 300;
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

  return fouten.length ? { ok: false, fouten } : { ok: true, waarden };
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
  };
}

/** Alt-tekst van het logo: afgeleid van de sitenaam. */
export function logoAlt(site: Pick<WebsiteInstellingen, "korteNaam">): string {
  return site.korteNaam;
}
