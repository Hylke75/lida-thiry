"use client";

import { track } from "@vercel/analytics";
import type { Gebeurtenis } from "./regels";

/**
 * Telt een eigen gebeurtenis in Vercel Web Analytics. Zonder persoonsgegevens:
 * alleen de naam en hooguit een paar ja/nee-eigenschappen. Doet niets als de
 * analytics niet geladen is (bijv. lokaal of in het beheer) en gooit nooit.
 */
export function meet(naam: Gebeurtenis, eigenschappen?: Record<string, string | boolean | number>): void {
  try {
    track(naam, eigenschappen);
  } catch {
    // Statistiek mag nooit iets breken.
  }
}
