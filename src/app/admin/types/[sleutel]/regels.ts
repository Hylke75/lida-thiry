// Pure regels voor de editor van één adviestype (zonder database), zodat ze te testen zijn.

export interface Type {
  sleutel: string;
  letter: string;
  categorie: number;
  titel: string;
  lengte_label: string | null;
  maat_label: string | null;
  bijgewerkt_op: string | null;
}

export interface SectieBeeld {
  volgorde: number;
  beeld_id: string;
  code: string;
  naam: string | null;
  bijschrift: string | null;
  url: string | null;
}

/** Een vast veld van de hand-out (zelfde voor elk type). */
export interface Veld {
  sleutel: string;
  kop: string;
  volgorde: number;
  groep: string;
  hulptekst: string | null;
}

export interface Sectie {
  id: string;
  veld_sleutel: string | null;
  volgorde: number;
  kop: string;
  tekst: string;
  beelden: SectieBeeld[];
}

/** Een sectie zoals Supabase hem teruggeeft, met de gekoppelde beelden. */
export type SectieRij = {
  id: string;
  veld_sleutel: string | null;
  volgorde: number;
  kop: string;
  tekst: string;
  sectie_beelden: {
    volgorde: number;
    beeld_id: string;
    beelden: {
      code: string;
      naam: string | null;
      bijschrift: string | null;
      pad: string;
      thumb_pad: string | null;
    };
  }[];
};

/** Het pad waarvan we een voorbeeld tonen: de miniatuur als die er is, anders het origineel. */
const voorbeeldPad = (b: SectieRij["sectie_beelden"][number]["beelden"]) => b.thumb_pad ?? b.pad;

/** Alle paden waarvoor een (tijdelijke) URL nodig is. */
export function voorbeeldPaden(rijen: SectieRij[]): string[] {
  return rijen.flatMap((s) => s.sectie_beelden.map((sb) => voorbeeldPad(sb.beelden)));
}

/** Rijen uit de database naar secties, met de beelden op volgorde en hun voorbeeld-URL. */
export function naarSecties(rijen: SectieRij[], urls: Record<string, string>): Sectie[] {
  return rijen.map((s) => ({
    id: s.id,
    veld_sleutel: s.veld_sleutel,
    volgorde: s.volgorde,
    kop: s.kop,
    tekst: s.tekst,
    beelden: [...s.sectie_beelden]
      .sort((a, b) => a.volgorde - b.volgorde)
      .map((sb) => ({
        volgorde: sb.volgorde,
        beeld_id: sb.beeld_id,
        code: sb.beelden.code,
        naam: sb.beelden.naam,
        bijschrift: sb.beelden.bijschrift,
        url: urls[voorbeeldPad(sb.beelden)] ?? null,
      })),
  }));
}

/** Secties per vast veld, en de secties die bij geen vast veld horen. */
export function verdeelSecties(secties: Sectie[]): { perVeld: Map<string, Sectie>; overige: Sectie[] } {
  return {
    perVeld: new Map(secties.filter((s) => s.veld_sleutel).map((s) => [s.veld_sleutel!, s])),
    overige: secties.filter((s) => !s.veld_sleutel),
  };
}

/** De groepen van de velden, in de volgorde waarin ze voor het eerst voorkomen. */
export const veldGroepen = (velden: Pick<Veld, "groep">[]) => [...new Set(velden.map((v) => v.groep))];

/** Het vorige en volgende type in de (gesorteerde) lijst, voor de navigatie. */
export function buren<T extends { sleutel: string }>(alle: T[], sleutel: string): { vorige: T | null; volgende: T | null } {
  const plek = alle.findIndex((t) => t.sleutel === sleutel);
  return {
    vorige: plek > 0 ? alle[plek - 1] : null,
    volgende: plek >= 0 && plek < alle.length - 1 ? alle[plek + 1] : null,
  };
}

/** Het totale aantal gekoppelde beelden over alle secties. */
export const aantalBeelden = (secties: Pick<Sectie, "beelden">[]) => secties.reduce((n, s) => n + s.beelden.length, 0);
