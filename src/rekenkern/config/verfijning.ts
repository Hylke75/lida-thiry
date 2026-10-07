// Configuratie E: verfijning na FFIT -> letter, voor de extra figuurtypes I en O.
//
// VOORLOPIG — door Lida te controleren. Deze grenzen zijn afgeleid uit Lida's
// eigen beschrijvingen (blog) van het I- en O-silhouet en zijn nog niet aan
// echte metingen getoetst. De verfijning staat standaard UIT (instelling
// `extra_figuurtypes_berekening`) en geeft alleen I of O als dat type actief is
// en alle 12 hand-outs inhoud hebben.

import type { FfitType } from "../types";

export const VERFIJNING_GRENZEN = {
  /**
   * I-silhouet (VOORLOPIG — door Lida te controleren): een recht figuur als H,
   * maar met een kleine bandmaat. Lida: "bandmaat 70 of kleiner (elke cup) -> I;
   * 75 of groter -> H". Grens inclusief: bandmaat <= 70 -> I.
   */
  iMaxBandmaat: 70,
  /**
   * O-silhouet (VOORLOPIG — door Lida te controleren): taille bijna even breed
   * als (of breder dan) de heupen. taille / heup >= 0,95 (grens inclusief).
   */
  oMinTailleHeupRatio: 0.95,
  /**
   * O-silhouet (VOORLOPIG — door Lida te controleren): hoge balans, de borst is
   * voller dan de heupen. borst - heup > 0 cm (strikt groter).
   */
  oMinBorstMinHeup: 0,
} as const;

/** De letter waaruit het I-silhouet verfijnd wordt (I is een "smalle H"). */
export const I_VANUIT_LETTER = "H";

/**
 * FFIT-uitkomsten waarbij het O-silhouet mogelijk is (VOORLOPIG — door Lida te
 * controleren).
 * - Rechthoek: borst, taille en heup liggen dicht bij elkaar; met een volle
 *   taille en hoge balans is dat Lida's O ("taille, heup en schouders ongeveer
 *   even breed", "borst > heup").
 * - Omgekeerde driehoek: borst duidelijk breder dan de heup en weinig taille;
 *   met een volle taille past dat bij "brede ribbenkast, smalle heupen".
 * Bewust NIET:
 * - De zandlopers (incl. bovenste): die vragen een duidelijk smallere taille;
 *   samen met taille >= 0,95 x heup kan dat (bijna) niet en het past niet bij O.
 * - Peer / lepel: heupen voller dan de borst, dus geen hoge balans.
 * - "Geen type": daar bepaalt het door de klant gekozen silhouet de letter. Is
 *   O actief, dan kan de klant het O-silhouet zelf kiezen; de maten overrulen
 *   die keuze hier niet.
 */
export const O_VANUIT_FFIT: readonly Exclude<FfitType, "Geen type">[] = ["Rechthoek", "Omgekeerde driehoek"];

/** Codes van de extra figuurtypes. */
export const EXTRA_FIGUURTYPES = ["I", "O"] as const;
export type ExtraFiguurtype = (typeof EXTRA_FIGUURTYPES)[number];

/** Toegestane bandmaten bij de invoer (cm, Europese maat). */
export const BANDMAAT_GRENZEN = { min: 60, max: 120 } as const;
