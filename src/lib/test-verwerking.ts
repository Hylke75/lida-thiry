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
import { VERFIJNING_UIT, verfijnLetter, type VerfijningInstelling } from "@/rekenkern/verfijning";
import type { ZandloperVariant } from "@/rekenkern/config/ffit-regels";
import type { Figuurletter } from "@/rekenkern/config/ffit-naar-letter";
import type { Bovenlichaam, BreedstePunt } from "@/rekenkern/config/lida-model";
import { bepaalSilhouetLida } from "@/rekenkern/lida-model";
import { REKENMODEL_FFIT, type Rekenmodel, type RekenmodelInstelling } from "./rekenmodel";

/** De extra gegevens voor Lida's rekenmethode (alleen gevraagd als die aan staat). */
export interface Proporties {
  /** Schouderbreedte in cm, op de rug van schouderpunt tot schouderpunt. */
  schouderbreedte: number | null;
  breedste_punt: BreedstePunt | null;
  bovenlichaam: Bovenlichaam | null;
}

export interface TestInvoer {
  lengte_cm: number;
  gewicht_kg: number;
  maten: Maten;
  controlemetingen: Partial<Record<"borst" | "taille" | "hoge_heup" | "heup", number>>;
  gekozen_silhouet: Figuurletter;
  pasvormantwoorden: Record<string, string>;
  hermeting: boolean;
  /** Bandmaat van de bh (optioneel; alleen gevraagd als de extra figuurtypes aan staan). */
  behamaat_band?: number | null;
  /** Alleen bij Lida's rekenmethode. */
  proporties?: Proporties | null;
  /**
   * Geeft de berekening geen duidelijk silhouet (Lida's methode), dan kiest de klant
   * zelf: true = ga uit van het gekozen silhouet.
   */
  eigen_keuze?: boolean;
}

export type TestUitkomst =
  | { soort: "opnieuw_meten"; bevindingen: Bevinding[] }
  | { soort: "silhouet_verschil"; berekendeLetter: Figuurletter }
  /** Lida's methode gaf geen duidelijk silhouet: de klant kiest zelf of vraagt STOA aan. */
  | { soort: "geen_type"; uitleg: string }
  | {
      soort: "type";
      sleutel: string;
      categorie: number;
      letter: Figuurletter;
      ffit_type: string;
      rekenmodel: Rekenmodel;
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
  verfijning: VerfijningInstelling = VERFIJNING_UIT,
  rekenmodel: RekenmodelInstelling = REKENMODEL_FFIT,
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

  // A + B + C. De FFIT-uitkomst wordt altijd bewaard (ook bij Lida's methode),
  // zodat de twee methodes later te vergelijken zijn.
  const categorie = bepaalCategorie(invoer.lengte_cm, invoer.gewicht_kg).nummer;
  const ffit = bepaalFiguurtype(maten, variant);
  const type = (letter: Figuurletter) =>
    definitiefType(categorie, letter, ffit, rekenmodel.model, meldingen);

  let letter: Figuurletter | null;
  if (rekenmodel.model === "lida") {
    // F. Lida's methode: omtrekken in procenten, breedste punt, heupvorm, bovenlichaam.
    const lida = bepaalSilhouetLida(
      {
        maten,
        breedstePunt: invoer.proporties?.breedste_punt,
        bovenlichaam: invoer.proporties?.bovenlichaam,
      },
      rekenmodel.grenzen,
      verfijning.aan ? verfijning.beschikbaar : [],
    );
    if (lida.letter === null) {
      // Geen duidelijk silhouet: de klant kiest zelf (met uitleg over het gevolg)
      // of vraagt een stijladvies op afstand aan.
      return invoer.eigen_keuze ? type(invoer.gekozen_silhouet) : { soort: "geen_type", uitleg: lida.uitleg };
    }
    letter = lida.letter;
  } else {
    // E. Verfijning naar de extra types I en O (standaard uit; VOORLOPIG).
    letter = verfijnLetter(
      { ffit, letter: bepaalLetter(ffit, toewijzing), maten, bandmaat: invoer.behamaat_band },
      verfijning,
    );
    // Geen passend figuurtype: het door de klant gekozen silhouet bepaalt de letter.
    if (letter === null) return type(invoer.gekozen_silhouet);
  }

  // Silhouet-vergelijking: bij verschil eerst een keer laten hermeten. Blijft
  // het verschil, dan winnen de maten (geen handmatige beoordeling).
  if (vergelijkSilhouet(invoer.gekozen_silhouet, letter) === "verschil" && !invoer.hermeting) {
    return { soort: "silhouet_verschil", berekendeLetter: letter };
  }

  return type(letter);
}

function definitiefType(
  categorie: number,
  letter: Figuurletter,
  ffit_type: string,
  rekenmodel: Rekenmodel,
  meldingen: Bevinding[],
): TestUitkomst {
  return {
    soort: "type",
    sleutel: `${categorie}${letter}`,
    categorie,
    letter,
    ffit_type,
    rekenmodel,
    meldingen,
  };
}
