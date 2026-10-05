// Gedeelde types voor de rekenkern. Puur; geen UI- of database-afhankelijkheden.

export type Lengtegroep = "kort" | "gemiddeld" | "lang";
type Gewichtsklasse = "tenger" | "gemiddeld" | "vol" | "plus";

/** De acht mogelijke FFIT-uitkomsten. Bij "Geen type" bepaalt het gekozen silhouet de letter. */
export type FfitType =
  | "Zandloper"
  | "Onderste zandloper"
  | "Bovenste zandloper"
  | "Lepel"
  | "Driehoek / peer"
  | "Omgekeerde driehoek"
  | "Rechthoek"
  | "Geen type";

/** De lichaamsmaten (in cm) die de rekenkern gebruikt. */
export interface Maten {
  borst: number;
  taille: number;
  hogeHeup: number;
  heup: number;
  /** Optioneel; wordt nu opgeslagen maar niet in de formule gebruikt (OPEN-punt). */
  binnenbeen?: number;
  /** Optioneel; schouderbreedte of -omvang (OPEN-punt, nog niet in de formule). */
  schouder?: number;
}

/** Eén lengte-subband met de bijbehorende gewichtsgrenzen (kg). */
interface CategorieSegment {
  lengteMin: number;
  /** Bovengrens van de lengteband; gebruik Infinity voor "en hoger". */
  lengteMax: number;
  gewichtMin: number;
  gewichtMax: number;
}

export interface CategorieDefinitie {
  nummer: number;
  lengtegroep: Lengtegroep;
  klasse: Gewichtsklasse;
  titel: string;
  segmenten: CategorieSegment[];
}
