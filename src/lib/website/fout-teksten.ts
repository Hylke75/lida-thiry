"use server";

import { leesSectie } from "../inhoud/lees";
import { standaardWaarden, type SectieWaarden } from "../inhoud/schema";
import { WEBSITE_FOUT } from "../inhoud/groepen/website";

export type FoutTeksten = SectieWaarden<typeof WEBSITE_FOUT>;

/**
 * De (openbare) teksten van de foutpagina, voor app/error.tsx: dat is een
 * client-component en kan de database niet zelf lezen. Faalt zacht naar de
 * standaardtekst.
 */
export async function haalFoutTeksten(): Promise<FoutTeksten> {
  try {
    return await leesSectie(WEBSITE_FOUT);
  } catch {
    return standaardWaarden(WEBSITE_FOUT);
  }
}
