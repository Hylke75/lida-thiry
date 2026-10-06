// Server-side verwerking van een ingevulde test. Herbruikt de pure rekenkern.

import { bepaalCategorie } from "@/rekenkern/categorie";
import { bepaalFiguurtype } from "@/rekenkern/figuurtype";
import { bepaalLetter, vergelijkSilhouet, type FfitToewijzing } from "@/rekenkern/letter";
import {
  controleerHardeGrenzen,
  controleerControlemeting,
  logischeChecks,
  type Bevinding,
} from "@/rekenkern/plausibiliteit";
import type { Maten } from "@/rekenkern/types";
import type { ZandloperVariant } from "@/rekenkern/config/ffit-regels";
import type { Figuurletter } from "@/rekenkern/config/ffit-naar-letter";

export interface TestInvoer {
  lengte_cm: number;
  gewicht_kg: number;
  maten: Maten;
  controlemetingen: Partial<Record<"borst" | "taille" | "hoge_heup" | "heup", number>>;
  gekozen_silhouet: Figuurletter;
  pasvormantwoorden: Record<string, string>;
  hermeting: boolean;
}

export type TestUitkomst =
  | { soort: "opnieuw_meten"; bevindingen: Bevinding[] }
  | { soort: "silhouet_verschil"; berekendeLetter: Figuurletter }
  | {
      soort: "type";
      sleutel: string;
      categorie: number;
      letter: Figuurletter;
      ffit_type: string;
      meldingen: Bevinding[];
    };

const CONTROLE_MAP: Record<string, keyof Maten> = {
  borst: "borst",
  taille: "taille",
  hoge_heup: "hogeHeup",
  heup: "heup",
};

export function verwerkTest(
  invoer: TestInvoer,
  variant: ZandloperVariant,
  toewijzing?: FfitToewijzing,
): TestUitkomst {
  const { maten } = invoer;

  // D. Plausibiliteit — blokkerende bevindingen eerst.
  const blokkerend: Bevinding[] = [...controleerHardeGrenzen(maten)];
  for (const [veld, matKey] of Object.entries(CONTROLE_MAP)) {
    const controle = invoer.controlemetingen[veld as "borst"];
    if (controle !== undefined) {
      const b = controleerControlemeting(maten[matKey] as number, controle);
      if (b) blokkerend.push(b);
    }
  }
  if (blokkerend.length > 0) {
    return { soort: "opnieuw_meten", bevindingen: blokkerend };
  }
  const meldingen = logischeChecks(maten);

  // A + B + C.
  const categorie = bepaalCategorie(invoer.lengte_cm, invoer.gewicht_kg).nummer;
  const ffit = bepaalFiguurtype(maten, variant);
  const letter = bepaalLetter(ffit, toewijzing);

  // Geen passend figuurtype: het door de klant gekozen silhouet bepaalt de letter.
  if (letter === null) {
    return definitiefType(categorie, invoer.gekozen_silhouet, ffit, meldingen);
  }

  // Silhouet-vergelijking: bij verschil eerst een keer laten hermeten. Blijft
  // het verschil, dan winnen de maten (geen handmatige beoordeling).
  if (vergelijkSilhouet(invoer.gekozen_silhouet, letter) === "verschil" && !invoer.hermeting) {
    return { soort: "silhouet_verschil", berekendeLetter: letter };
  }

  return definitiefType(categorie, letter, ffit, meldingen);
}

function definitiefType(
  categorie: number,
  letter: Figuurletter,
  ffit_type: string,
  meldingen: Bevinding[],
): TestUitkomst {
  return {
    soort: "type",
    sleutel: `${categorie}${letter}`,
    categorie,
    letter,
    ffit_type,
    meldingen,
  };
}
