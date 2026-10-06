// Uitleg waarom de maten op een ander silhouet wijzen dan de klant zelf koos.
// Puur (geen server- of UI-afhankelijkheden), zodat het los te testen is.

import { afgeleideMaten } from "@/rekenkern/figuurtype";
import type { Maten } from "@/rekenkern/types";
import type { Figuurletter } from "@/rekenkern/config/ffit-naar-letter";
/** Namen per code; standaard de vijf oorspronkelijke lichaamstypes. */
export type Namen = Record<string, string>;
const STANDAARD_NAMEN: Namen = { X: "Zandloper", A: "Peer / driehoek", V: "Omgekeerde driehoek", H: "Rechthoek", "8": "De 8" };

export function silhouetNaam(letter: Figuurletter, namen: Namen = STANDAARD_NAMEN): string {
  return namen[letter] ?? letter;
}

const cm = (v: number) => `${Math.round(Math.abs(v))} cm`;

/** Korte, concrete reden uit de maten voor het berekende silhouet. */
function redenUitMaten(maten: Maten, berekend: Figuurletter): string {
  const a = afgeleideMaten(maten);
  const tailleVerschil = Math.max(a.borstMinTaille, a.heupMinTaille);

  switch (berekend) {
    case "A":
      return `Je heupen zijn duidelijk breder dan je borst (${cm(a.heupMinBorst)} verschil).`;
    case "V":
      return `Je borst is duidelijk breder dan je heupen (${cm(a.borstMinHeup)} verschil).`;
    case "X":
      return `Je borst en heupen zijn bijna even breed (${cm(a.heupMinBorst)} verschil) en je taille is duidelijk smaller (${cm(tailleVerschil)}).`;
    case "H":
      return `Je borst, taille en heupen liggen dicht bij elkaar: je taille is maar ${cm(tailleVerschil)} smaller.`;
    case "8":
      return a.heupMinBorst >= a.borstMinHeup
        ? `Je taille is duidelijk smaller (${cm(tailleVerschil)}) en je heupen zijn voller dan je borst (${cm(a.heupMinBorst)} verschil).`
        : `Je taille is duidelijk smaller (${cm(tailleVerschil)}) en je borst is voller dan je heupen (${cm(a.borstMinHeup)} verschil).`;
    default:
      return "De verhoudingen tussen je borst, taille en heupen wijzen op een ander silhouet.";
  }
}

/**
 * Uitleg bij een silhouetverschil, met de namen van beide silhouetten, bijv.:
 * "Je heupen zijn duidelijk breder dan je borst (12 cm verschil). Dat past meer
 * bij Peer / driehoek dan bij Zandloper."
 */
export function silhouetVerschilReden(
  maten: Maten,
  gekozen: Figuurletter,
  berekend: Figuurletter,
  namen?: Namen,
): string {
  return `${redenUitMaten(maten, berekend)} Dat past meer bij ${silhouetNaam(berekend, namen)} dan bij ${silhouetNaam(gekozen, namen)}.`;
}
