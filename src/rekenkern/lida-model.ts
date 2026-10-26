// F. Silhouet volgens de rekenmethode van Lida Thiry. Puur; de grenzen komen uit
// config/lida-model.ts (instelbaar in Beheer → Rekentool).
//
// Regels (eerste treffer wint):
//   1. O (alleen als O beschikbaar is): taille >= 95% van de heup en borst > heup.
//   2. Tegenstrijdig (schouders het breedst maar heupen ruim voller, of andersom):
//      geen type; de klant kiest zelf of vraagt een stijladvies op afstand aan.
//   3. Schouders het breedst                                  -> V
//   4. Heupen voller dan de borst, of heupen het breedst:
//        hoge heup bijna even breed als de lage heup ("plankje") -> 8 (Lepel)
//        hoge heup duidelijk smaller (ronde overgang)            -> A (Peer)
//        daartussen: kort bovenlichaam -> 8, lang -> A, anders geen type
//   5. Borst voller dan de heup: duidelijke taille -> X, anders -> V
//   6. In balans: duidelijke taille -> X (Zandloper), anders -> H (Rechthoek)
// Het I-silhouet valt onder H (Lida, 26-10-2026).

import type { Maten } from "./types";
import type { Figuurletter } from "./config/ffit-naar-letter";
import { VERFIJNING_GRENZEN } from "./config/verfijning";
import {
  LIDA_GRENZEN_STANDAARD,
  type Bovenlichaam,
  type BreedstePunt,
  type LidaGrenzen,
} from "./config/lida-model";

export interface LidaInvoer {
  maten: Pick<Maten, "borst" | "taille" | "hogeHeup" | "heup">;
  /** Het breedste punt in de spiegel; onbekend telt als "gelijk". */
  breedstePunt?: BreedstePunt | null;
  /** Uitkomst van de handentest; onbekend telt niet mee. */
  bovenlichaam?: Bovenlichaam | null;
}

/** De kengetallen waarop de regels beslissen (als fractie). */
export interface LidaKengetallen {
  /** (heup - borst) / borst */
  heupVoorsprong: number;
  /** (borst - heup) / heup */
  borstVoorsprong: number;
  /** taille / grootste van borst en heup */
  tailleRatio: number;
  /** hoge heup / heup */
  hogeHeupRatio: number;
}

export interface LidaUitkomst {
  /** Het silhouet, of null als de gegevens geen duidelijk beeld geven. */
  letter: Figuurletter | null;
  /** Waarom: in gewone taal, voor de proefberekening in het beheer. */
  uitleg: string;
  kengetallen: LidaKengetallen;
}

const pct = (f: number) => `${Math.round(f * 100)}%`;

export function lidaKengetallen(m: LidaInvoer["maten"]): LidaKengetallen {
  return {
    heupVoorsprong: m.borst > 0 ? (m.heup - m.borst) / m.borst : 0,
    borstVoorsprong: m.heup > 0 ? (m.borst - m.heup) / m.heup : 0,
    tailleRatio: Math.max(m.borst, m.heup) > 0 ? m.taille / Math.max(m.borst, m.heup) : 1,
    hogeHeupRatio: m.heup > 0 ? m.hogeHeup / m.heup : 1,
  };
}

/**
 * Bepaalt het silhouet volgens Lida's methode. `beschikbaar` zijn de extra types
 * die de berekening mag geven (alleen O telt hier).
 */
export function bepaalSilhouetLida(
  invoer: LidaInvoer,
  grenzen: LidaGrenzen = LIDA_GRENZEN_STANDAARD,
  beschikbaar: readonly string[] = [],
): LidaUitkomst {
  const k = lidaKengetallen(invoer.maten);
  const g = grenzen;
  const breedst = invoer.breedstePunt ?? "gelijk";
  const uit = (letter: Figuurletter | null, uitleg: string): LidaUitkomst => ({ letter, uitleg, kengetallen: k });
  const duidelijkeTaille = k.tailleRatio <= g.zandloperTailleMax;
  const taille = `taille ${pct(1 - k.tailleRatio)} kleiner dan ${invoer.maten.heup >= invoer.maten.borst ? "de heup" : "de borst"}`;

  // 1. O (de Appel): alleen als O actief is en alle hand-outs heeft.
  if (
    beschikbaar.includes("O") &&
    invoer.maten.heup > 0 &&
    invoer.maten.taille / invoer.maten.heup >= VERFIJNING_GRENZEN.oMinTailleHeupRatio &&
    invoer.maten.borst - invoer.maten.heup > VERFIJNING_GRENZEN.oMinBorstMinHeup
  ) {
    return uit("O", "Volle taille (bijna even breed als de heup) en de borst voller dan de heup: het O-silhouet.");
  }

  // 2. Tegenstrijdig: de spiegel zegt iets anders dan de maten.
  if (breedst === "schouders" && k.heupVoorsprong >= 2 * g.heupBredMin) {
    return uit(
      null,
      `De schouders zijn volgens de klant het breedst, maar de heup is ${pct(k.heupVoorsprong)} voller dan de borst. Dat spreekt elkaar tegen.`,
    );
  }
  if (breedst === "heupen" && k.borstVoorsprong >= 2 * g.borstBredMin) {
    return uit(
      null,
      `De heupen zijn volgens de klant het breedst, maar de borst is ${pct(k.borstVoorsprong)} voller dan de heup. Dat spreekt elkaar tegen.`,
    );
  }

  // 3. Schouders het breedst: de Omgekeerde driehoek.
  if (breedst === "schouders") {
    return uit("V", "De schouders zijn het breedste punt: de Omgekeerde driehoek.");
  }

  // 4. Heupen voller of het breedst: Lepel of Peer, op de vorm van de heup.
  if (k.heupVoorsprong >= g.heupBredMin || breedst === "heupen") {
    const reden =
      k.heupVoorsprong >= g.heupBredMin
        ? `de heup is ${pct(k.heupVoorsprong)} voller dan de borst`
        : "de heupen zijn het breedste punt";
    const heupvorm = `de hoge heup is ${pct(k.hogeHeupRatio)} van de lage heup`;
    if (k.hogeHeupRatio >= g.lepelHogeHeupMin) {
      return uit("8", `${hoofdletter(reden)} en ${heupvorm} (recht, een "plankje"): de Lepel.`);
    }
    if (k.hogeHeupRatio <= g.peerHogeHeupMax) {
      return uit("A", `${hoofdletter(reden)} en ${heupvorm} (ronde overgang van taille naar heup): de Peer.`);
    }
    if (invoer.bovenlichaam === "kort") {
      return uit("8", `${hoofdletter(reden)}, ${heupvorm} (twijfel) en een kort bovenlichaam: de Lepel.`);
    }
    if (invoer.bovenlichaam === "lang") {
      return uit("A", `${hoofdletter(reden)}, ${heupvorm} (twijfel) en een lang bovenlichaam: de Peer.`);
    }
    return uit(
      null,
      `${hoofdletter(reden)}, maar ${heupvorm}: dat zit tussen Lepel en Peer in, en het bovenlichaam geeft geen uitsluitsel.`,
    );
  }

  // 5. Borst voller dan de heup: een (bovenste) zandloper met taille, anders V.
  if (k.borstVoorsprong >= g.borstBredMin) {
    return duidelijkeTaille
      ? uit("X", `De borst is ${pct(k.borstVoorsprong)} voller dan de heup, met een duidelijke taille (${taille}): de Zandloper.`)
      : uit("V", `De borst is ${pct(k.borstVoorsprong)} voller dan de heup en de taille is niet uitgesproken (${taille}): de Omgekeerde driehoek.`);
  }

  // 6. In balans.
  return duidelijkeTaille
    ? uit("X", `Borst en heup zijn in balans, met een duidelijke taille (${taille}): de Zandloper.`)
    : uit("H", `Borst en heup zijn in balans en de taille is niet uitgesproken (${taille}): de Rechthoek.`);
}

function hoofdletter(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}
