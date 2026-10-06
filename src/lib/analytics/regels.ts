// Pure regels voor de bezoekersstatistieken (Vercel Web Analytics en Speed
// Insights). Geen cookies, geen persoonsgegevens: we sturen alleen het pad mee,
// zonder zoekparameters en zonder geheime sleutels uit de url. Bruikbaar in de
// browser en in tests.

/** De vaste namen van de eigen gebeurtenissen (zonder persoonsgegevens). */
export const GEBEURTENISSEN = {
  bestellingGestart: "bestelling gestart",
  testGestart: "test gestart",
  testAfgerond: "test afgerond",
  nieuwsbriefAanmelding: "nieuwsbrief aanmelding",
  contactVerzonden: "contactformulier verzonden",
} as const;

export type Gebeurtenis = (typeof GEBEURTENISSEN)[keyof typeof GEBEURTENISSEN];

/**
 * Hoe meten we op dit pad?
 * - "volledig": publieke pagina's, met paginaweergaven en Speed Insights;
 * - "alleen-gebeurtenissen": de test (/test/<token>): geen paginaweergaven, alleen
 *   "test gestart/afgerond", met het pad vervangen door "/test";
 * - "uit": het beheer en inloggen.
 */
export type Meetwijze = "volledig" | "alleen-gebeurtenissen" | "uit";

const UIT = ["/admin", "/auth"];

function onder(pad: string, basis: string): boolean {
  return pad === basis || pad.startsWith(`${basis}/`);
}

export function meetwijze(pad: string | null | undefined): Meetwijze {
  if (!pad) return "volledig";
  if (UIT.some((p) => onder(pad, p))) return "uit";
  if (onder(pad, "/test")) return "alleen-gebeurtenissen";
  return "volledig";
}

/** Paden met een persoonlijke sleutel als laatste deel; die vervangen we door [token]. */
const MET_TOKEN = ["/nieuwsbrief/afmelden", "/nieuwsbrief/bevestig", "/api/nb/afmelden"];

/**
 * Maakt een url veilig om te versturen: zonder zoekparameters en #-deel, en
 * zonder sleutels in het pad. De test wordt altijd "/test". Ongeldige urls
 * worden null (= niet versturen).
 */
export function veiligeUrl(url: string): string | null {
  let u: URL;
  try {
    u = new URL(url, "https://voorbeeld.invalid");
  } catch {
    return null;
  }
  let pad = u.pathname;
  if (onder(pad, "/test")) pad = "/test";
  for (const basis of MET_TOKEN) {
    if (pad.startsWith(`${basis}/`)) pad = `${basis}/[token]`;
  }
  return u.origin === "https://voorbeeld.invalid" ? pad : `${u.origin}${pad}`;
}

/**
 * Bewerkt een gebeurtenis van de analytics-scripts vóór verzenden (null = niet
 * versturen). De meetwijze volgt uit de url van de gebeurtenis zelf, zodat ook
 * na navigeren binnen de site (bijv. naar het beheer) niets ongewenst meegaat.
 */
export function filterGebeurtenis<T extends { type: string; url: string }>(e: T): T | null {
  let pad: string;
  try {
    pad = new URL(e.url, "https://voorbeeld.invalid").pathname;
  } catch {
    return null;
  }
  const wijze = meetwijze(pad);
  if (wijze === "uit") return null;
  if (wijze === "alleen-gebeurtenissen" && e.type !== "event") return null;
  const url = veiligeUrl(e.url);
  return url ? { ...e, url } : null;
}
