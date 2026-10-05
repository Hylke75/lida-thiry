// B. Figuurtype (FFIT-regels) uit maten (cm). Eerste treffer wint.
// Grenswaarden en de zandloper-variant komen uit config/ffit-regels.ts.

import type { FfitType, Maten } from "./types";
import {
  FFIT_GRENZEN as G,
  STANDAARD_ZANDLOPER_VARIANT,
  type ZandloperVariant,
} from "./config/ffit-regels";

export interface AfgeleideMaten {
  heupMinBorst: number;
  borstMinHeup: number;
  borstMinTaille: number;
  heupMinTaille: number;
  hogeHeupDoorTaille: number;
}

export function afgeleideMaten(maten: Maten): AfgeleideMaten {
  const { borst, taille, hogeHeup, heup } = maten;
  return {
    heupMinBorst: heup - borst,
    borstMinHeup: borst - heup,
    borstMinTaille: borst - taille,
    heupMinTaille: heup - taille,
    hogeHeupDoorTaille: hogeHeup / taille,
  };
}

/** Regel 1 (zandloper) verschilt per variant; de overige regels zijn gelijk. */
function isZandloper(a: AfgeleideMaten, variant: ZandloperVariant): boolean {
  const tailleVoorwaarde =
    a.borstMinTaille >= G.drieEnTwintigCm || a.heupMinTaille >= G.tienInch;
  if (variant === "excel") {
    return (
      a.heupMinBorst <= G.tweeEnHalveCm &&
      a.borstMinHeup < G.negenCm &&
      tailleVoorwaarde
    );
  }
  // ffit (standaard)
  return (
    a.borstMinHeup <= G.tweeEnHalveCm &&
    a.heupMinBorst < G.negenCm &&
    tailleVoorwaarde
  );
}

/**
 * Bepaalt het FFIT-type uit de maten. Regels in vaste volgorde, eerste treffer wint.
 * Bij "Geen type" bepaalt het gekozen silhouet de letter (zie test-verwerking).
 */
export function bepaalFiguurtype(
  maten: Maten,
  variant: ZandloperVariant = STANDAARD_ZANDLOPER_VARIANT,
): FfitType {
  const a = afgeleideMaten(maten);

  if (isZandloper(a, variant)) return "Zandloper";

  if (
    a.heupMinBorst >= G.negenCm &&
    a.heupMinBorst < G.tienInch &&
    a.heupMinTaille >= G.drieEnTwintigCm &&
    a.hogeHeupDoorTaille < G.hogeHeupTailleRatio
  ) {
    return "Onderste zandloper";
  }

  if (
    a.borstMinHeup > G.tweeEnHalveCm &&
    a.borstMinHeup < G.tienInch &&
    a.borstMinTaille >= G.drieEnTwintigCm
  ) {
    return "Bovenste zandloper";
  }

  if (
    a.heupMinBorst > G.vijfCm &&
    a.heupMinTaille >= G.zeventienCm &&
    a.hogeHeupDoorTaille >= G.hogeHeupTailleRatio
  ) {
    return "Lepel";
  }

  if (a.heupMinBorst >= G.negenCm && a.heupMinTaille < G.drieEnTwintigCm) {
    return "Driehoek / peer";
  }

  if (a.borstMinHeup >= G.negenCm && a.borstMinTaille < G.drieEnTwintigCm) {
    return "Omgekeerde driehoek";
  }

  if (
    a.heupMinBorst < G.negenCm &&
    a.borstMinHeup < G.negenCm &&
    a.borstMinTaille < G.drieEnTwintigCm &&
    a.heupMinTaille < G.tienInch
  ) {
    return "Rechthoek";
  }

  return "Geen type";
}
