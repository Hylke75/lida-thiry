// Pure regels voor het adresboek: namen splitsen, invoer opschonen, aanvullen.

import { geldigEmail } from "@/lib/email";

export const RELATIE_BRONNEN = ["handmatig", "bestelling", "nieuwsbrief", "contactformulier", "import"] as const;
export type RelatieBron = (typeof RELATIE_BRONNEN)[number];

export const RELATIE_BRON_LABEL: Record<RelatieBron, string> = {
  handmatig: "Handmatig",
  bestelling: "Bestelling",
  nieuwsbrief: "Nieuwsbrief",
  contactformulier: "Contactformulier",
  import: "Import",
};

export interface RelatieGegevens {
  email: string | null;
  voornaam: string | null;
  achternaam: string | null;
  telefoon: string | null;
  bedrijf: string | null;
  straat: string | null;
  postcode: string | null;
  plaats: string | null;
  land: string;
}

export interface Relatie extends RelatieGegevens {
  id: string;
  geboortedatum: string | null;
  notities: string;
  tags: string[];
  bron: RelatieBron;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export const RELATIE_VELDEN =
  "id, email, voornaam, achternaam, telefoon, bedrijf, straat, postcode, plaats, land, geboortedatum, notities, tags, bron, aangemaakt_op, bijgewerkt_op";

/** "Anna de Vries" → { voornaam: "Anna", achternaam: "de Vries" }. */
export function splitsNaam(naam: string | null | undefined): { voornaam: string | null; achternaam: string | null } {
  const delen = (naam ?? "").trim().split(/\s+/).filter(Boolean);
  if (!delen.length) return { voornaam: null, achternaam: null };
  return { voornaam: delen[0], achternaam: delen.slice(1).join(" ") || null };
}

export function volledigeNaam(r: Pick<RelatieGegevens, "voornaam" | "achternaam">): string {
  return [r.voornaam, r.achternaam].filter(Boolean).join(" ");
}

/** Nederlandse postcode netjes: "1234ab" → "1234 AB"; andere formaten blijven staan. */
export function normaliseerPostcode(p: string | null | undefined): string | null {
  const t = (p ?? "").trim();
  if (!t) return null;
  const nl = /^(\d{4})\s*([a-zA-Z]{2})$/.exec(t);
  return nl ? `${nl[1]} ${nl[2].toUpperCase()}` : t.slice(0, 20);
}

const leeg = (v: unknown, max = 200): string | null => {
  const t = typeof v === "string" ? v.trim().slice(0, max) : "";
  return t || null;
};

/** Schone gegevens uit (deels) onbetrouwbare invoer. */
export function schoonGegevens(ruw: Partial<Record<keyof RelatieGegevens, unknown>>): Partial<RelatieGegevens> {
  const uit: Partial<RelatieGegevens> = {};
  const email = leeg(ruw.email, 254)?.toLowerCase() ?? null;
  if (email && geldigEmail(email)) uit.email = email;
  for (const k of ["voornaam", "achternaam", "telefoon", "bedrijf", "straat", "plaats"] as const) {
    const w = leeg(ruw[k], k === "straat" ? 200 : 100);
    if (w) uit[k] = w;
  }
  const postcode = normaliseerPostcode(typeof ruw.postcode === "string" ? ruw.postcode : null);
  if (postcode) uit.postcode = postcode;
  const land = leeg(ruw.land, 60);
  if (land) uit.land = land;
  return uit;
}

/**
 * Welke velden bijgewerkt mogen worden bij automatisch koppelen: alleen lege
 * velden worden aangevuld, zodat handmatige correcties nooit overschreven worden.
 */
export function aanvulling(bestaand: Partial<RelatieGegevens>, nieuw: Partial<RelatieGegevens>): Partial<RelatieGegevens> {
  const uit: Partial<RelatieGegevens> = {};
  for (const [k, v] of Object.entries(nieuw) as [keyof RelatieGegevens, string | null][]) {
    if (k === "email" || k === "land" || !v) continue;
    if (!bestaand[k]) (uit as Record<string, string>)[k] = v;
  }
  return uit;
}
