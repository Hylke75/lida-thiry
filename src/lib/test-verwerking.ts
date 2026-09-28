// Server-side verwerking van een ingevulde test. Herbruikt de pure rekenkern.

import { bepaalCategorie } from "@/rekenkern/categorie";
import { bepaalFiguurtype } from "@/rekenkern/figuurtype";
import { bepaalLetter, vergelijkSilhouet } from "@/rekenkern/letter";
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
  | { soort: "twijfelgeval"; reden: string; categorie: number; ffit_type: string }
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
  const letter = bepaalLetter(ffit);

  if (ffit === "Geen type" || letter === null) {
    return {
      soort: "twijfelgeval",
      reden: ffit === "Geen type" ? "Geen passend figuurtype gevonden." : "Voor dit figuurtype is nog geen letter vastgesteld.",
      categorie,
      ffit_type: ffit,
    };
  }

  // Silhouet-vergelijking: bij verschil eerst een keer laten hermeten.
  if (vergelijkSilhouet(invoer.gekozen_silhouet, letter) === "verschil") {
    if (!invoer.hermeting) {
      return { soort: "silhouet_verschil", berekendeLetter: letter };
    }
    return {
      soort: "twijfelgeval",
      reden: "Gekozen silhouet en berekende maten blijven verschillen.",
      categorie,
      ffit_type: ffit,
    };
  }

  return {
    soort: "type",
    sleutel: `${categorie}${letter}`,
    categorie,
    letter,
    ffit_type: ffit,
    meldingen,
  };
}
