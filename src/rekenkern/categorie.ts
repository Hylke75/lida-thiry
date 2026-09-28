// A. Categorie (1-12) uit lengte (cm) en gewicht (kg).
// Grenswaarden komen uit config/categorie-tabel.ts; hier alleen de logica.

import type { CategorieDefinitie, Lengtegroep } from "./types";
import { CATEGORIE_TABEL, LENGTEGROEP_GRENZEN } from "./config/categorie-tabel";

/** Rondt af op het dichtstbijzijnde hele getal (cm/kg), zoals in de UI vermeld. */
function afronden(waarde: number): number {
  return Math.round(waarde);
}

function bepaalLengtegroep(lengte: number): Lengtegroep {
  if (lengte <= LENGTEGROEP_GRENZEN.kortMax) return "kort";
  if (lengte <= LENGTEGROEP_GRENZEN.gemiddeldMax) return "gemiddeld";
  return "lang";
}

/** De vier categorieen van een lengtegroep, op volgorde tenger -> gemiddeld -> vol -> plus. */
function categorieenVanGroep(groep: Lengtegroep): CategorieDefinitie[] {
  const volgorde = { tenger: 0, gemiddeld: 1, vol: 2, plus: 3 };
  return CATEGORIE_TABEL.filter((c) => c.lengtegroep === groep).sort(
    (a, b) => volgorde[a.klasse] - volgorde[b.klasse],
  );
}

/**
 * Vindt de gewicht-bovengrens van een categorie bij een gegeven lengte.
 * Valt de lengte onder de laagste subband van de categorie, dan wordt die laagste
 * subband gebruikt (lengte onder 145 -> kort); Infinity dekt "en hoger" af.
 */
function bovengrensBij(categorie: CategorieDefinitie, lengte: number): number {
  const segmenten = categorie.segmenten;
  const treffer = segmenten.find(
    (s) => lengte >= s.lengteMin && lengte <= s.lengteMax,
  );
  if (treffer) return treffer.gewichtMax;
  // Geen directe treffer: clamp naar de dichtstbijzijnde subband.
  const laagste = segmenten[0];
  const hoogste = segmenten[segmenten.length - 1];
  if (lengte < laagste.lengteMin) return laagste.gewichtMax;
  return hoogste.gewichtMax;
}

export interface CategorieResultaat {
  nummer: number;
  categorie: CategorieDefinitie;
}

/**
 * Bepaalt de categorie (1-12) uit lengte en gewicht.
 * De vier gewichtsklassen binnen een lengtegroep zijn aaneensluitend: onder de
 * laagste grens -> tenger, boven de hoogste -> plus. Zo levert elke combinatie
 * precies een categorie op.
 */
export function bepaalCategorie(
  lengteCm: number,
  gewichtKg: number,
): CategorieResultaat {
  const lengte = afronden(lengteCm);
  const gewicht = afronden(gewichtKg);

  const groep = bepaalLengtegroep(lengte);
  const categorieen = categorieenVanGroep(groep); // [tenger, gemiddeld, vol, plus]

  // Loop van tenger naar plus; de eerste klasse waarvan de bovengrens het gewicht
  // dekt, wint. Valt het gewicht boven alle grenzen, dan is het plus (laatste).
  for (let i = 0; i < categorieen.length - 1; i++) {
    const bovengrens = bovengrensBij(categorieen[i], lengte);
    if (gewicht <= bovengrens) {
      return { nummer: categorieen[i].nummer, categorie: categorieen[i] };
    }
  }
  const plus = categorieen[categorieen.length - 1];
  return { nummer: plus.nummer, categorie: plus };
}
