// Configuratietabel C: FFIT-type -> figuurletter.
// OPEN-punt #2: de adviseur vult de volledige tabel in. Uit de prompt zijn alleen
// deze drie voorbeelden bekend; de rest staat bewust op null en wordt NIET verzonnen.
// Zolang een reeel FFIT-type geen letter heeft, is de mapping niet productie-gereed.
//
// De vijf letters die in de 60 adviesdocumenten voorkomen: X, A, V, H, 8.

import type { FfitType } from "../types";

export type Figuurletter = "X" | "A" | "V" | "H" | "8";

export const FFIT_NAAR_LETTER: Record<
  Exclude<FfitType, "Geen type">,
  Figuurletter | null
> = {
  Zandloper: "X",
  "Onderste zandloper": null, // OPEN: adviseur
  "Bovenste zandloper": null, // OPEN: adviseur
  Lepel: null, // OPEN: adviseur
  "Driehoek / peer": "A",
  "Omgekeerde driehoek": "V",
  Rechthoek: null, // OPEN: adviseur
};
