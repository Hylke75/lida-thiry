// Regels rond lichaamstypes (figuurtypes) en adviestype-sleutels. Puur: bruikbaar
// in de browser, op de server en in tests.

import type { Lichaamsvorm } from "./test-config";
import type { FfitType } from "@/rekenkern/types";

/** Een lichaamstype zoals de app het gebruikt (uit de tabel lichaamstypes). */
export interface Lichaamstype {
  code: string;
  naam: string;
  alias: string | null;
  korte_omschrijving: string;
  uitleg: string;
  kenmerken: string;
  vorm: Lichaamsvorm;
  beeld_id: string | null;
  volgorde: number;
  actief: boolean;
}

/** Code van een lichaamstype: 1-3 hoofdletters; de bestaande '8' blijft geldig. */
export const CODE_PATROON = /^([A-Z]{1,3}|8)$/;

/** Adviestype-sleutel: categorie 1-12 gevolgd door de code (bijv. 6A, 12X, 108). */
export const TYPE_SLEUTEL_PATROON = /^(1[0-2]|[1-9])([A-Z]{1,3}|8)$/;

export const CATEGORIEEN = Array.from({ length: 12 }, (_, i) => i + 1);

/** De zeven mogelijke uitkomsten van de berekening (zonder "Geen type"). */
export const FFIT_TYPES: Exclude<FfitType, "Geen type">[] = [
  "Zandloper",
  "Onderste zandloper",
  "Bovenste zandloper",
  "Lepel",
  "Driehoek / peer",
  "Omgekeerde driehoek",
  "Rechthoek",
];

/** De standaardvorm van de tekening: één definitie, in lichaam-pad.ts. */
export { STANDAARD_VORM } from "./lichaam-pad";

/** Grenzen voor de tekening (halve breedtes in de illustratie). */
export const VORM_GRENZEN = { min: 12, max: 52 } as const;

export function ontleedTypeSleutel(sleutel: string): { categorie: number; code: string } | null {
  const m = TYPE_SLEUTEL_PATROON.exec(sleutel ?? "");
  return m ? { categorie: Number(m[1]), code: m[2] } : null;
}

export function typeSleutel(categorie: number, code: string): string {
  return `${categorie}${code}`;
}

/**
 * Sorteert adviestype-sleutels op categorie en daarna op de volgorde van de
 * lichaamstypes (of de vaste volgorde X, A, V, H, 8 en daarna alfabetisch).
 */
export function sorteerWaarde(sleutel: string, volgorde?: Record<string, number>): number {
  const o = ontleedTypeSleutel(sleutel);
  if (!o) return 1e9;
  const vast = "XAVH8".indexOf(o.code);
  const plek = volgorde?.[o.code] ?? (vast >= 0 ? vast : 100 + o.code.charCodeAt(0));
  return o.categorie * 1000 + plek;
}

/** Controleert de invoer voor een lichaamstype; geeft een lijst foutmeldingen. */
export function controleerLichaamstype(
  t: Partial<Lichaamstype>,
  { nieuw, bestaandeCodes }: { nieuw: boolean; bestaandeCodes: string[] },
): string[] {
  const fouten: string[] = [];
  const code = (t.code ?? "").trim();
  if (nieuw) {
    if (!CODE_PATROON.test(code)) fouten.push("De code moet uit 1 tot 3 hoofdletters bestaan, bijv. Y of OV.");
    else if (bestaandeCodes.includes(code)) fouten.push(`De code ${code} bestaat al.`);
  }
  if (!t.naam?.trim()) fouten.push("Vul een naam in.");
  if (t.vorm) {
    for (const [k, v] of Object.entries(t.vorm)) {
      if (!Number.isFinite(v) || v < VORM_GRENZEN.min || v > VORM_GRENZEN.max) {
        fouten.push(`De tekening-maat '${k}' moet tussen ${VORM_GRENZEN.min} en ${VORM_GRENZEN.max} liggen.`);
      }
    }
  }
  return fouten;
}

/** Zet een rij uit de database om naar de vorm die de test/uitslag gebruikt. */
export function alsSilhouet(t: Lichaamstype, beeldUrl?: string | null) {
  return {
    letter: t.code,
    naam: t.naam,
    alias: t.alias,
    omschrijving: t.korte_omschrijving,
    uitleg: t.uitleg,
    kenmerken: t.kenmerken
      .split("\n")
      .map((r) => r.replace(/^\s*[-•]\s*/, "").trim())
      .filter(Boolean),
    vorm: t.vorm,
    beeldUrl: beeldUrl ?? null,
  };
}

export type Silhouet = ReturnType<typeof alsSilhouet>;
