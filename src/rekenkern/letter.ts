// C. Van FFIT-type naar figuurletter, plus silhouet-vergelijking.
// De mapping komt uit config/ffit-naar-letter.ts (OPEN, door de adviseur in te vullen).

import type { FfitType } from "./types";
import {
  FFIT_NAAR_LETTER,
  type Figuurletter,
} from "./config/ffit-naar-letter";

/**
 * Geeft de letter voor een FFIT-type, of null wanneer er (nog) geen letter is.
 * null betekent een twijfelgeval (ook altijd bij "Geen type").
 */
export function bepaalLetter(ffitType: FfitType): Figuurletter | null {
  if (ffitType === "Geen type") return null;
  return FFIT_NAAR_LETTER[ffitType] ?? null;
}

/**
 * Is de FFIT-naar-letter-tabel compleet? De app mag niet naar productie zolang
 * er een reeel FFIT-type zonder letter is (productie-vlag).
 */
export function isMappingCompleet(): boolean {
  return Object.values(FFIT_NAAR_LETTER).every((letter) => letter !== null);
}

/** FFIT-types die nog geen letter hebben (voor de open-punten-/productie-check). */
export function ontbrekendeLetters(): FfitType[] {
  return (Object.keys(FFIT_NAAR_LETTER) as Exclude<FfitType, "Geen type">[]).filter(
    (type) => FFIT_NAAR_LETTER[type] === null,
  );
}

export type SilhouetVergelijking = "gelijk" | "verschil";

/**
 * Vergelijkt het door de klant gekozen silhouet met de berekende letter.
 * "verschil" -> klant eenmaal vragen de maten te controleren; blijft het verschil,
 * dan is het een twijfelgeval (die vervolgstap zit in de flow, niet hier).
 */
export function vergelijkSilhouet(
  gekozenLetter: Figuurletter,
  berekendeLetter: Figuurletter | null,
): SilhouetVergelijking {
  return gekozenLetter === berekendeLetter ? "gelijk" : "verschil";
}
