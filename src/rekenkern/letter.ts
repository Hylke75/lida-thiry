// C. Van FFIT-type naar figuurletter, plus silhouet-vergelijking.
// De mapping komt uit config/ffit-naar-letter.ts (OPEN, door de adviseur in te vullen).

import type { FfitType } from "./types";
import {
  FFIT_NAAR_LETTER,
  type Figuurletter,
} from "./config/ffit-naar-letter";

/**
 * Geeft de letter voor een FFIT-type, of null wanneer er (nog) geen letter is.
 * null bij "Geen type"; dan bepaalt het gekozen silhouet de letter.
 */
export type FfitToewijzing = Partial<Record<Exclude<FfitType, "Geen type">, Figuurletter | null>>;

export function bepaalLetter(
  ffitType: FfitType,
  toewijzing: FfitToewijzing = FFIT_NAAR_LETTER,
): Figuurletter | null {
  if (ffitType === "Geen type") return null;
  return toewijzing[ffitType] ?? null;
}

/**
 * Is de FFIT-naar-letter-tabel compleet? De app mag niet naar productie zolang
 * er een reeel FFIT-type zonder letter is (productie-vlag).
 */
export function isMappingCompleet(toewijzing: FfitToewijzing = FFIT_NAAR_LETTER): boolean {
  return (Object.keys(FFIT_NAAR_LETTER) as (keyof typeof FFIT_NAAR_LETTER)[]).every((t) => Boolean(toewijzing[t]));
}

/** FFIT-types die nog geen letter hebben (voor de productie-check). */
export function ontbrekendeLetters(toewijzing: FfitToewijzing = FFIT_NAAR_LETTER): FfitType[] {
  return (Object.keys(FFIT_NAAR_LETTER) as Exclude<FfitType, "Geen type">[]).filter((type) => !toewijzing[type]);
}

export type SilhouetVergelijking = "gelijk" | "verschil";

/**
 * Vergelijkt het door de klant gekozen silhouet met de berekende letter.
 * "verschil" -> klant eenmaal vragen de maten te controleren; blijft het verschil,
 * dan winnen de maten (die vervolgstap zit in de flow, niet hier).
 */
export function vergelijkSilhouet(
  gekozenLetter: Figuurletter,
  berekendeLetter: Figuurletter | null,
): SilhouetVergelijking {
  return gekozenLetter === berekendeLetter ? "gelijk" : "verschil";
}
