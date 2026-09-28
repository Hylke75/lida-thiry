// FFIT-grenswaarden (in cm; 1 inch = 2,54 cm). Absolute verschillen.
// Deze staan hier als configuratie, niet in de logica.

export const FFIT_GRENZEN = {
  tweeEnHalveCm: 2.54, // 1 inch
  vijfCm: 5.08, // 2 inch
  negenCm: 9.14, // 3,6 inch
  vijftienCm: 25.4, // 10 inch
  drieEnTwintigCm: 22.86, // 9 inch
  zeventienCm: 17.78, // 7 inch
  hogeHeupTailleRatio: 1.193,
} as const;

/**
 * Welke zandloper-variant gebruikt wordt voor regel 1.
 * - "ffit": oorspronkelijke FFIT-bron (STANDAARD): borstMinHeup <= 2,54 EN heupMinBorst < 9,14
 * - "excel": aangeleverde Excel (omgedraaid):      heupMinBorst <= 2,54 EN borstMinHeup < 9,14
 * OPEN-punt #1: bevestigen welke variant leidend is.
 */
export type ZandloperVariant = "ffit" | "excel";

export const STANDAARD_ZANDLOPER_VARIANT: ZandloperVariant = "ffit";
