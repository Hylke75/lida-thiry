// Doelgroepen (segmenten) voor campagnes. Puur: het filter werkt op gewone data,
// zodat het te testen is; het ophalen staat in ontvangers.ts.

export const BRONNEN = ["formulier", "bestelling", "import", "handmatig"] as const;
export type Bron = (typeof BRONNEN)[number];

export const BRON_LABEL: Record<Bron, string> = {
  formulier: "Aanmeldformulier",
  bestelling: "Bij bestelling",
  import: "Import",
  handmatig: "Handmatig toegevoegd",
};

export const STATUSSEN = ["onbevestigd", "aangemeld", "afgemeld", "gebounced", "klacht"] as const;
export type ContactStatus = (typeof STATUSSEN)[number];

export const STATUS_LABEL: Record<ContactStatus, string> = {
  onbevestigd: "Nog niet bevestigd",
  aangemeld: "Aangemeld",
  afgemeld: "Afgemeld",
  gebounced: "Onbestelbaar",
  klacht: "Als spam gemeld",
};

export interface Doelgroep {
  /** Alleen contacten met (een van / al) deze tags. Leeg = geen filter. */
  tags?: string[];
  tagsModus?: "een" | "alle";
  /** Contacten zonder deze tags. */
  zonderTags?: string[];
  bronnen?: Bron[];
  /** Figuurtype-letters (zoals X, A, V, H, 8) uit de bestellingen van het contact. */
  figuurtypes?: string[];
  /** ja = heeft ooit betaald besteld, nee = nooit. */
  besteld?: "ja" | "nee";
}

export interface ContactVoorFilter {
  email: string;
  status: string;
  bron: string;
  tags: string[];
}

export interface Klantinfo {
  besteld: boolean;
  figuurtypes: Set<string>;
}

const lijst = (v: unknown, max = 50): string[] =>
  Array.isArray(v)
    ? [...new Set(v.filter((x): x is string => typeof x === "string").map((x) => x.trim()).filter(Boolean))].slice(0, max)
    : [];

/** Maakt een veilige doelgroep van onbetrouwbare invoer. */
export function normaliseerDoelgroep(ruw: unknown): Doelgroep {
  const o = ruw && typeof ruw === "object" ? (ruw as Record<string, unknown>) : {};
  const d: Doelgroep = {};
  const tags = [...new Set(lijst(o.tags).map(normaliseerTag).filter(Boolean))];
  if (tags.length) {
    d.tags = tags;
    d.tagsModus = o.tagsModus === "alle" ? "alle" : "een";
  }
  const zonder = [...new Set(lijst(o.zonderTags).map(normaliseerTag).filter(Boolean))];
  if (zonder.length) d.zonderTags = zonder;
  const bronnen = lijst(o.bronnen).filter((b): b is Bron => (BRONNEN as readonly string[]).includes(b));
  if (bronnen.length) d.bronnen = bronnen;
  const figuurtypes = lijst(o.figuurtypes, 20).filter((f) => /^([A-Z]{1,3}|8)$/.test(f));
  if (figuurtypes.length) d.figuurtypes = figuurtypes;
  if (o.besteld === "ja" || o.besteld === "nee") d.besteld = o.besteld;
  return d;
}

/** Tags zijn kleine letters zonder spaties aan de randen, maximaal 40 tekens. */
export function normaliseerTag(t: string): string {
  return t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40);
}

/** Of een contact binnen de doelgroep valt. Alleen aangemelde contacten ontvangen mail. */
export function valtBinnen(c: ContactVoorFilter, d: Doelgroep, klant?: Klantinfo): boolean {
  if (c.status !== "aangemeld") return false;
  if (d.tags?.length) {
    const heeft = (t: string) => c.tags.includes(t);
    if (d.tagsModus === "alle" ? !d.tags.every(heeft) : !d.tags.some(heeft)) return false;
  }
  if (d.zonderTags?.some((t) => c.tags.includes(t))) return false;
  if (d.bronnen?.length && !d.bronnen.includes(c.bron as Bron)) return false;
  if (d.besteld === "ja" && !klant?.besteld) return false;
  if (d.besteld === "nee" && klant?.besteld) return false;
  if (d.figuurtypes?.length && !d.figuurtypes.some((f) => klant?.figuurtypes.has(f))) return false;
  return true;
}

/** Korte omschrijving van een doelgroep, bijv. voor het campagneoverzicht. */
export function beschrijfDoelgroep(d: Doelgroep, typeNaam: (letter: string) => string = (l) => l): string {
  const delen: string[] = [];
  if (d.tags?.length) delen.push(`tag ${d.tags.join(d.tagsModus === "alle" ? " én " : " of ")}`);
  if (d.zonderTags?.length) delen.push(`zonder tag ${d.zonderTags.join(", ")}`);
  if (d.bronnen?.length) delen.push(`via ${d.bronnen.map((b) => BRON_LABEL[b].toLowerCase()).join(" of ")}`);
  if (d.besteld === "ja") delen.push("klanten");
  if (d.besteld === "nee") delen.push("nog geen klant");
  if (d.figuurtypes?.length) delen.push(`figuurtype ${d.figuurtypes.map(typeNaam).join(" of ")}`);
  return delen.length ? `Aangemelde contacten: ${delen.join(", ")}` : "Alle aangemelde contacten";
}
