// Configuratietabel C: FFIT-type -> figuurletter.
// Vastgesteld met Lida Thiry (29-9-2026). De vijf letters in de 60
// adviesdocumenten: X (zandloper), A (peer/driehoek), V (omgekeerde driehoek),
// H (rechthoek), 8 (het curvy 8-figuur).

import type { FfitType } from "../types";

/**
 * Code van een lichaamstype (X, A, V, H, 8 of een in beheer toegevoegde code).
 * De actuele koppeling staat in de database (ffit_toewijzing); deze tabel is de
 * oorspronkelijke standaard en dient als terugval.
 */
export type Figuurletter = string;

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
