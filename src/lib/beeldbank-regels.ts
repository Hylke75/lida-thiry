// Regels van de beeldbank: verhouding, minimaal formaat en naamgeving.
// Puur (geen server- of browserafhankelijkheden), dus bruikbaar bij de upload in
// de browser én bij de controle op de server.

export const BEELD_BUCKET = "advies-beelden";

/** Kortste zijde die een (nieuw) beeld minimaal moet hebben, in pixels. */
export const MIN_KORTE_ZIJDE = 600;

/**
 * Standaardverhouding van alle beelden: 2:3 staand. Gekozen na analyse van de
 * 864 bronbeelden (beste vulling van het kader, 75% gemiddeld). Elk beeld wordt
 * zonder bijsnijden gecentreerd op een wit kader van deze verhouding gezet, zodat
 * alle beelden in de PDF even groot in een strak raster staan.
 */
export const STANDAARD_VERHOUDING: [number, number] = [2, 3];
export const IDEAAL_FORMAAT = { breedte: 1000, hoogte: 1500 } as const;

/** Toegestane afwijking van de vereiste verhouding (3%). */
export const VERHOUDING_TOLERANTIE = 0.03;

/** Maximale bestandsgrootte van een upload (15 MB). */
export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export const TOEGESTANE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

/** Gangbare verhoudingen waar een origineel naartoe wordt afgerond. */
export const STANDAARD_VERHOUDINGEN: [number, number][] = [
  [1, 1],
  [4, 3],
  [3, 4],
  [3, 2],
  [2, 3],
  [16, 9],
  [9, 16],
  [2, 1],
  [1, 2],
];

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

export const FIGUREN = ["X", "A", "V", "H", "8"] as const;
export const ADVIEZEN = ["goed", "vermijd"] as const;

export interface Eisen {
  verhouding_b: number;
  verhouding_h: number;
  min_breedte: number;
  min_hoogte: number;
}

function ggd(a: number, b: number): number {
  return b === 0 ? a : ggd(b, a % b);
}

/**
 * Rondt de verhouding van een bestaand beeld af naar een gangbare verhouding
 * (binnen 6%), anders naar de eigen verhouding in hele getallen (bijv. 7:5).
 */
export function snapVerhouding(breedte: number, hoogte: number): [number, number] {
  const r = breedte / hoogte;
  let beste: [number, number] = [1, 1];
  let afstand = Infinity;
  for (const [b, h] of STANDAARD_VERHOUDINGEN) {
    const d = Math.abs(Math.log(r / (b / h)));
    if (d < afstand) {
      afstand = d;
      beste = [b, h];
    }
  }
  if (afstand <= Math.log(1.06)) return beste;
  // Eigen verhouding, vereenvoudigd tot kleine gehele getallen.
  for (let noemer = 2; noemer <= 12; noemer++) {
    const teller = Math.round(r * noemer);
    if (Math.abs(teller / noemer - r) / r <= VERHOUDING_TOLERANTIE) {
      const g = ggd(teller, noemer);
      return [teller / g, noemer / g];
    }
  }
  const g = ggd(breedte, hoogte);
  return [breedte / g, hoogte / g];
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

/**
 * Controleert een (nieuw) beeld tegen de eisen. Geeft een lijst met
 * begrijpelijke foutmeldingen terug; leeg = goedgekeurd.
 */
export function controleerAfmetingen(breedte: number, hoogte: number, eisen: Eisen): string[] {
  const fouten: string[] = [];
  const vereist = eisen.verhouding_b / eisen.verhouding_h;
  const werkelijk = breedte / hoogte;
  if (Math.abs(werkelijk - vereist) / vereist > VERHOUDING_TOLERANTIE) {
    const [wb, wh] = snapVerhouding(breedte, hoogte);
    fouten.push(
      `De verhouding is ${verhoudingLabel(wb, wh)}, maar moet ${verhoudingLabel(eisen.verhouding_b, eisen.verhouding_h)} zijn. Snijd het beeld bij of pas het canvas aan.`,
    );
  }
  if (breedte < eisen.min_breedte || hoogte < eisen.min_hoogte) {
    fouten.push(
      `Het beeld is ${breedte} × ${hoogte} px; minimaal ${eisen.min_breedte} × ${eisen.min_hoogte} px is nodig voor een scherpe PDF.`,
    );
  }
  return fouten;
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
