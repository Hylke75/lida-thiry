// Publieke API van de rekenkern.

export * from "./types";
export { bepaalCategorie } from "./categorie";
export type { CategorieResultaat } from "./categorie";
export { bepaalFiguurtype, afgeleideMaten } from "./figuurtype";
export type { AfgeleideMaten } from "./figuurtype";
export {
  bepaalLetter,
  isMappingCompleet,
  ontbrekendeLetters,
  vergelijkSilhouet,
} from "./letter";
export type { SilhouetVergelijking } from "./letter";
export type { Figuurletter } from "./config/ffit-naar-letter";
export {
  controleerHardeGrenzen,
  controleerControlemeting,
  logischeChecks,
  verwachteBandbreedte,
} from "./plausibiliteit";
export type { Bevinding, Ernst } from "./plausibiliteit";
export { OPEN_PUNTEN } from "./open-punten";
export type { OpenPunt } from "./open-punten";
