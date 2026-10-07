// E. Verfijning na FFIT -> letter: de extra figuurtypes I en O (VOORLOPIG).
// Puur. Standaard uit; de server bepaalt of de verfijning aan staat en welke van
// I en O beschikbaar zijn (actief, met alle hand-outs gevuld).
//
// Regels (eerste treffer wint):
//   1. O: FFIT is Rechthoek of Omgekeerde driehoek
//         EN taille / heup >= 0,95
//         EN borst - heup > 0                      -> O
//   2. I: berekende letter is H
//         EN de bandmaat (bh) is bekend en <= 70   -> I
//   Anders blijft de berekende letter.
// O gaat voor I: de O-regel kijkt naar de maten zelf (volle taille, hoge balans),
// terwijl I juist "geen buikje, geen brede heupen" is.
// Bij "Geen type" (letter null) verandert er niets: dan kiest de klant zelf.

import type { FfitType, Maten } from "./types";
import type { Figuurletter } from "./config/ffit-naar-letter";
import {
  I_VANUIT_LETTER,
  O_VANUIT_FFIT,
  VERFIJNING_GRENZEN as G,
  type ExtraFiguurtype,
} from "./config/verfijning";

export interface VerfijningInstelling {
  /** De instelling extra_figuurtypes_berekening staat aan. */
  aan: boolean;
  /** Welke extra types de berekening mag geven (actief én met complete hand-outs). */
  beschikbaar: readonly string[];
}

export const VERFIJNING_UIT: VerfijningInstelling = { aan: false, beschikbaar: [] };

export interface VerfijningInvoer {
  ffit: FfitType;
  /** De letter uit de koppeling FFIT -> lichaamstype (null bij "Geen type"). */
  letter: Figuurletter | null;
  maten: Pick<Maten, "borst" | "taille" | "heup">;
  /** Bandmaat van de bh (bijv. 70 bij 70B); null/undefined = onbekend. */
  bandmaat?: number | null;
}

/** Wijzen de maten op het O-silhouet (los van aan/uit en beschikbaarheid)? */
export function pastBijO(ffit: FfitType, maten: VerfijningInvoer["maten"]): boolean {
  if (ffit === "Geen type" || !O_VANUIT_FFIT.includes(ffit)) return false;
  if (!(maten.heup > 0)) return false;
  return maten.taille / maten.heup >= G.oMinTailleHeupRatio && maten.borst - maten.heup > G.oMinBorstMinHeup;
}

/** Wijst de combinatie letter + bandmaat op het I-silhouet? */
export function pastBijI(letter: Figuurletter | null, bandmaat: number | null | undefined): boolean {
  return (
    letter === I_VANUIT_LETTER &&
    typeof bandmaat === "number" &&
    Number.isFinite(bandmaat) &&
    bandmaat > 0 &&
    bandmaat <= G.iMaxBandmaat
  );
}

/** Welk extra type de regels zouden geven, zonder te kijken naar aan/uit. */
export function verfijningsRegel(invoer: VerfijningInvoer): ExtraFiguurtype | null {
  if (invoer.letter === null) return null;
  if (pastBijO(invoer.ffit, invoer.maten)) return "O";
  if (pastBijI(invoer.letter, invoer.bandmaat)) return "I";
  return null;
}

/**
 * De definitieve letter na verfijning. Geeft de oorspronkelijke letter terug als
 * de verfijning uit staat, geen regel van toepassing is of het type niet
 * beschikbaar is. Wijzen de maten op O maar is O niet beschikbaar, dan blijft
 * de oorspronkelijke letter (geen terugval op I: I is juist "geen buikje").
 */
export function verfijnLetter(invoer: VerfijningInvoer, instelling: VerfijningInstelling): Figuurletter | null {
  if (!instelling.aan || invoer.letter === null) return invoer.letter;
  const regel = verfijningsRegel(invoer);
  return regel && instelling.beschikbaar.includes(regel) ? regel : invoer.letter;
}
