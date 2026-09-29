// Configuratietabel C: FFIT-type -> figuurletter.
// Vastgesteld met Lida Thiry (29-9-2026). De vijf letters in de 60
// adviesdocumenten: X (zandloper), A (peer/driehoek), V (omgekeerde driehoek),
// H (rechthoek), 8 (het curvy 8-figuur).

import type { FfitType } from "../types";

export type Figuurletter = "X" | "A" | "V" | "H" | "8";

export const FFIT_NAAR_LETTER: Record<
  Exclude<FfitType, "Geen type">,
  Figuurletter | null
> = {
  Zandloper: "X",
  "Onderste zandloper": "8",
  "Bovenste zandloper": "8",
  Lepel: "A",
  "Driehoek / peer": "A",
  "Omgekeerde driehoek": "V",
  Rechthoek: "H",
};
