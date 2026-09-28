// D. Plausibiliteitscontrole van de maten. Grenzen komen uit config/grenzen.ts.
// Geen AI-inschatting in deze versie; wel uitbreidbaar met een verwachte bandbreedte.

import type { Maten } from "./types";
import { MAAT_GRENZEN as M } from "./config/grenzen";

export type Ernst = "blokkerend" | "melding";

export interface Bevinding {
  code: string;
  ernst: Ernst;
  bericht: string;
}

/** Harde grenzen per maat. Buiten bereik -> blokkerend (opnieuw meten). */
export function controleerHardeGrenzen(maten: Maten): Bevinding[] {
  const bevindingen: Bevinding[] = [];
  const omtrekken: [string, number][] = [
    ["borst", maten.borst],
    ["taille", maten.taille],
    ["hoge heup", maten.hogeHeup],
    ["heup", maten.heup],
  ];
  for (const [naam, waarde] of omtrekken) {
    if (waarde < M.omtrekMin || waarde > M.omtrekMax) {
      bevindingen.push({
        code: "omtrek_buiten_bereik",
        ernst: "blokkerend",
        bericht: `De ${naam}omvang (${waarde} cm) valt buiten het bereik ${M.omtrekMin}–${M.omtrekMax} cm. Controleer de meting.`,
      });
    }
  }
  if (maten.binnenbeen !== undefined) {
    if (
      maten.binnenbeen < M.binnenbeenMin ||
      maten.binnenbeen > M.binnenbeenMax
    ) {
      bevindingen.push({
        code: "binnenbeen_buiten_bereik",
        ernst: "blokkerend",
        bericht: `De binnenbeenlengte (${maten.binnenbeen} cm) valt buiten het bereik ${M.binnenbeenMin}–${M.binnenbeenMax} cm. Controleer de meting.`,
      });
    }
  }
  return bevindingen;
}

/** Controlemeting versus eerste meting: verschil groter dan de marge -> opnieuw meten. */
export function controleerControlemeting(
  eersteMeting: number,
  controleMeting: number,
): Bevinding | null {
  const verschil = Math.abs(eersteMeting - controleMeting);
  if (verschil > M.controleVerschilMax) {
    return {
      code: "controlemeting_verschil",
      ernst: "blokkerend",
      bericht: `De twee metingen verschillen ${verschil} cm (meer dan ${M.controleVerschilMax} cm). Meet deze maat opnieuw.`,
    };
  }
  return null;
}

/**
 * Logische checks. Leveren een "melding" op (de klant mag bevestigen en doorgaan),
 * geen harde blokkade.
 */
export function logischeChecks(maten: Maten): Bevinding[] {
  const bevindingen: Bevinding[] = [];
  if (maten.taille > maten.borst && maten.taille > maten.heup) {
    bevindingen.push({
      code: "taille_grootst",
      ernst: "melding",
      bericht:
        "Je taille is groter dan zowel je borst als je heup. Klopt deze maat?",
    });
  }
  if (maten.hogeHeup > maten.heup + M.hogeHeupBovenHeupMarge) {
    bevindingen.push({
      code: "hoge_heup_boven_heup",
      ernst: "melding",
      bericht: "Je hoge heup is groter dan je heup. Klopt deze maat?",
    });
  }
  if (maten.heup < maten.taille - M.heupOnderTailleMarge) {
    bevindingen.push({
      code: "heup_onder_taille",
      ernst: "melding",
      bericht: "Je heup is kleiner dan je taille. Klopt deze maat?",
    });
  }
  return bevindingen;
}

/**
 * Uitbreidingspunt: een verwachte bandbreedte per maat op basis van lengte en gewicht.
 * Nog niet ingevuld (retourneert null); de logische checks blijven werken.
 */
export function verwachteBandbreedte(
  lengte: number,
  gewicht: number,
): { maat: keyof Maten; min: number; max: number }[] | null {
  // Nog niet ingevuld; lengte en gewicht worden hier straks omgezet naar een
  // verwachte bandbreedte per maat.
  void lengte;
  void gewicht;
  return null;
}
