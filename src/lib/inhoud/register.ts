import type { Groep, Sectie } from "./schema";
import { WEBSITE } from "./groepen/website";
import { BESTELLEN } from "./groepen/bestellen";
import { TEST } from "./groepen/test";
import { EMAILS } from "./groepen/emails";
import { NIEUWSBRIEF } from "./groepen/nieuwsbrief";
import { JURIDISCH } from "./groepen/juridisch";

/** Alle groepen beheerbare teksten, in de volgorde van het beheerscherm. */
export const GROEPEN: readonly Groep[] = [WEBSITE, BESTELLEN, TEST, EMAILS, NIEUWSBRIEF, JURIDISCH];

export function vindGroep(sleutel: string): Groep | undefined {
  return GROEPEN.find((g) => g.sleutel === sleutel);
}

export function vindSectie(sleutel: string): { groep: Groep; sectie: Sectie } | undefined {
  for (const groep of GROEPEN) {
    const sectie = groep.secties.find((s) => s.sleutel === sleutel);
    if (sectie) return { groep, sectie };
  }
  return undefined;
}
