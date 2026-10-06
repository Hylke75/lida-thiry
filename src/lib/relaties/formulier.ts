// Pure controle van het relatieformulier (nieuw en bewerken).

import { ontleedTags } from "../nieuwsbrief/contactregels";
import { schoonGegevens, type RelatieGegevens } from "./regels";

export interface RelatieInvoer extends RelatieGegevens {
  geboortedatum: string | null;
  tags: string[];
  notities: string;
}

export type VeldFouten = Partial<Record<"email" | "geboortedatum" | "naam", string>>;

/** "2026-10-04" of "4-10-2026" / "04/10/2026" → "2026-10-04"; null bij een ongeldige datum. */
export function leesDatum(invoer: string): string | null {
  const t = invoer.trim();
  let j: number, m: number, d: number;
  const iso = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(t);
  const nl = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(t);
  if (iso) [j, m, d] = [Number(iso[1]), Number(iso[2]), Number(iso[3])];
  else if (nl) [d, m, j] = [Number(nl[1]), Number(nl[2]), Number(nl[3])];
  else return null;
  const datum = new Date(Date.UTC(j, m - 1, d));
  if (datum.getUTCFullYear() !== j || datum.getUTCMonth() !== m - 1 || datum.getUTCDate() !== d) return null;
  return datum.toISOString().slice(0, 10);
}

/**
 * Controleert en schoont het formulier. Lege velden worden null (zodat je een
 * veld ook kunt leegmaken); het land valt terug op Nederland.
 */
export function controleerRelatieInvoer(
  ruw: Record<string, unknown>,
  vandaag: string = new Date().toISOString().slice(0, 10),
): { invoer: RelatieInvoer; fouten: VeldFouten } {
  const s = (k: string) => (typeof ruw[k] === "string" ? (ruw[k] as string) : "");
  const schoon = schoonGegevens({
    email: s("email"),
    voornaam: s("voornaam"),
    achternaam: s("achternaam"),
    telefoon: s("telefoon"),
    bedrijf: s("bedrijf"),
    straat: s("straat"),
    postcode: s("postcode"),
    plaats: s("plaats"),
    land: s("land"),
  });
  const fouten: VeldFouten = {};
  if (s("email").trim() && !schoon.email) fouten.email = "Dit is geen geldig e-mailadres.";

  let geboortedatum: string | null = null;
  if (s("geboortedatum").trim()) {
    geboortedatum = leesDatum(s("geboortedatum"));
    if (!geboortedatum || geboortedatum < "1900-01-01" || geboortedatum > vandaag) {
      fouten.geboortedatum = "Vul een geldige geboortedatum in.";
      geboortedatum = null;
    }
  }

  const invoer: RelatieInvoer = {
    email: schoon.email ?? null,
    voornaam: schoon.voornaam ?? null,
    achternaam: schoon.achternaam ?? null,
    telefoon: schoon.telefoon ?? null,
    bedrijf: schoon.bedrijf ?? null,
    straat: schoon.straat ?? null,
    postcode: schoon.postcode ?? null,
    plaats: schoon.plaats ?? null,
    land: schoon.land ?? "Nederland",
    geboortedatum,
    tags: ontleedTags(s("tags")),
    notities: s("notities").replace(/\r\n/g, "\n").trim().slice(0, 50_000),
  };
  if (!invoer.email && !invoer.voornaam && !invoer.achternaam && !invoer.bedrijf) {
    fouten.naam = "Vul minstens een naam, bedrijf of e-mailadres in.";
  }
  return { invoer, fouten };
}
