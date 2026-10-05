// Regels van de beeldbank: verhouding, minimaal formaat en naamgeving.
// Puur (geen server- of browserafhankelijkheden), dus bruikbaar bij de upload in
// de browser én bij de controle op de server.

import { ADVIES_BEELDEN } from "./opslag";

export const BEELD_BUCKET = ADVIES_BEELDEN;

/** Kortste zijde die een (nieuw) beeld minimaal moet hebben, in pixels. */
const MIN_KORTE_ZIJDE = 600;

/**
 * Standaardverhouding van alle beelden: 2:3 staand. Gekozen na analyse van de
 * 864 bronbeelden (beste vulling van het kader, 75% gemiddeld). Elk beeld wordt
 * zonder bijsnijden gecentreerd op een wit kader van deze verhouding gezet, zodat
 * alle beelden in de PDF even groot in een strak raster staan.
 */
const STANDAARD_VERHOUDING: [number, number] = [2, 3];
export const IDEAAL_FORMAAT = { breedte: 1000, hoogte: 1500 } as const;

/** Maximale bestandsgrootte van een upload (15 MB). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Onderdelen (gelijk aan de hoofdstukken van de hand-outs). */
export const ONDERDELEN = [
  "tops",
  "broeken",
  "rokken",
  "jurken",
  "jasjes-en-mantels",
  "schoenen",
  "tassen",
  "sieraden",
  "sjaals",
  "riemen-en-ceintuurs",
  "kleuren-en-dessins",
  "schouders",
  "bovenlichaam",
  "taille-en-middenrif",
  "onderlichaam",
  "outfits",
  "silhouetten",
  "overig",
] as const;

export const ADVIEZEN = ["goed", "vermijd"] as const;

export interface Eisen {
  verhouding_b: number;
  verhouding_h: number;
  min_breedte: number;
  min_hoogte: number;
}

/** Minimaal formaat bij een verhouding: de kortste zijde is MIN_KORTE_ZIJDE. */
export function minFormaat(vb: number, vh: number): { min_breedte: number; min_hoogte: number } {
  if (vb >= vh) {
    return { min_breedte: Math.round((MIN_KORTE_ZIJDE * vb) / vh), min_hoogte: MIN_KORTE_ZIJDE };
  }
  return { min_breedte: MIN_KORTE_ZIJDE, min_hoogte: Math.round((MIN_KORTE_ZIJDE * vh) / vb) };
}

/** De vaste eisen van de beeldbank: 2:3, minimaal 600 × 900 px. */
export const STANDAARD_EISEN: Eisen = {
  verhouding_b: STANDAARD_VERHOUDING[0],
  verhouding_h: STANDAARD_VERHOUDING[1],
  ...minFormaat(STANDAARD_VERHOUDING[0], STANDAARD_VERHOUDING[1]),
};

/**
 * Afmetingen van het witte kader waarop een beeld zonder bijsnijden past
 * (het beeld wordt in de breedte of hoogte aangevuld tot de verhouding).
 */
export function kaderAfmetingen(
  breedte: number,
  hoogte: number,
  [vb, vh]: [number, number] = STANDAARD_VERHOUDING,
): { breedte: number; hoogte: number; aangevuld: boolean } {
  if (breedte * vh > hoogte * vb) {
    const h = Math.round((breedte * vh) / vb);
    return { breedte, hoogte: h, aangevuld: h !== hoogte };
  }
  const b = Math.round((hoogte * vb) / vh);
  return { breedte: b, hoogte, aangevuld: b !== breedte };
}

/**
 * Controle bij uploaden: het beeld wordt op het standaardkader gezet; alleen
 * als dat kader kleiner is dan het minimum wordt het geweigerd.
 */
export function controleerUpload(breedte: number, hoogte: number): { fouten: string[]; melding: string | null } {
  const k = kaderAfmetingen(breedte, hoogte);
  const fouten: string[] = [];
  if (k.breedte < STANDAARD_EISEN.min_breedte || k.hoogte < STANDAARD_EISEN.min_hoogte) {
    fouten.push(
      `Het beeld is te klein (${breedte} × ${hoogte} px). Op het 2:3-kader wordt het ${k.breedte} × ${k.hoogte} px; minimaal ${STANDAARD_EISEN.min_breedte} × ${STANDAARD_EISEN.min_hoogte} px is nodig voor een scherpe PDF (ideaal ${IDEAAL_FORMAAT.breedte} × ${IDEAAL_FORMAAT.hoogte} px).`,
    );
  }
  const melding = k.aangevuld
    ? `Het beeld is niet precies 2:3; het wordt zonder bijsnijden aangevuld met wit tot ${k.breedte} × ${k.hoogte} px.`
    : null;
  return { fouten, melding };
}

export function verhoudingLabel(vb: number, vh: number): string {
  const vorm = vb === vh ? "vierkant" : vb > vh ? "liggend" : "staand";
  return `${vb}:${vh} (${vorm})`;
}

/** Is het huidige beeld kleiner dan het vereiste minimum? */
export function isTeKlein(
  b: { breedte: number | null; hoogte: number | null; min_breedte: number | null; min_hoogte: number | null },
): boolean {
  if (!b.breedte || !b.hoogte || !b.min_breedte || !b.min_hoogte) return false;
  return b.breedte < b.min_breedte || b.hoogte < b.min_hoogte;
}

/** Maakt een veilige bestandsnaam-slug: kleine letters, cijfers en streepjes. */
export function slug(tekst: string): string {
  return tekst
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const NAAM_PATROON = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Naamvoorstel volgens de conventie onderdeel-omschrijving[-figuur]-advies. */
export function naamSuggestie(b: {
  onderdeel?: string | null;
  omschrijving?: string | null;
  figuur?: string | null;
  advies?: string | null;
}): string {
  return [b.onderdeel, b.omschrijving, b.figuur, b.advies]
    .filter((d): d is string => Boolean(d && d.trim()))
    .map(slug)
    .filter(Boolean)
    .join("-");
}
