// Pure regels voor de pagina "Jouw figuurtype" (achter de betaalmuur, via de
// persoonlijke testlink): wie mag de pagina zien, en korte, beschrijvende zinnen
// over de verhoudingen van een figuurtype en hoe het zich tot de andere types
// verhoudt. Alleen op basis van de tekening (vorm) uit Beheer → Lichaamstypes;
// de berekening (src/rekenkern) wordt hier niet gebruikt of gewijzigd.

import { AFGERONDE_STATUSSEN } from "./order-status";
import type { Lichaamsvorm } from "./test-config";

/** Vanaf dit verschil (in halve breedtes van de tekening) noemen we iets "breder"/"smaller". */
const DREMPEL = 4;
/** Vanaf dit verschil heet de taille "duidelijk" smaller. */
const DUIDELIJK = 8;

/** Hoeveel smaller de taille is dan de smalste van borst en heup. */
function tailleDiepte(v: Lichaamsvorm): number {
  return Math.min(v.borst, v.heup) - v.taille;
}

/**
 * Twee of drie korte zinnen over de verhoudingen van een figuurtype, op basis
 * van de tekening: schouders tegenover heupen, en hoe uitgesproken de taille is.
 */
export function verhoudingen(v: Lichaamsvorm): string[] {
  const uit: string[] = [];
  const d = v.schouder - v.heup;
  if (d >= DREMPEL) uit.push("Je schouders zijn breder dan je heupen.");
  else if (d <= -DREMPEL) uit.push("Je heupen zijn breder dan je schouders.");
  else uit.push("Je schouders en heupen zijn ongeveer even breed.");

  const t = tailleDiepte(v);
  if (t >= DUIDELIJK) uit.push("Je taille is duidelijk smaller dan je borst en heupen.");
  else if (t >= DREMPEL) uit.push("Je taille is iets smaller dan je borst en heupen.");
  else uit.push("Je taille is nauwelijks smaller dan je borst en heupen.");

  const b = v.borst - v.heup;
  if (b >= DREMPEL) uit.push("Je bovenlichaam is voller dan je onderlichaam.");
  else if (b <= -DREMPEL) uit.push("Je onderlichaam is voller dan je bovenlichaam.");
  return uit;
}

function verschil(ander: number, eigen: number, meer: string, minder: string): string | null {
  const d = ander - eigen;
  if (d >= DREMPEL) return meer;
  if (d <= -DREMPEL) return minder;
  return null;
}

/**
 * Hoe een ander figuurtype zich tot het eigen type verhoudt, in één zin, bijv.
 * "Bredere schouders en smallere heupen dan jouw type."
 */
export function vergelijkMetEigen(eigen: Lichaamsvorm, ander: Lichaamsvorm): string {
  const delen = [
    verschil(ander.schouder, eigen.schouder, "bredere schouders", "smallere schouders"),
    verschil(ander.heup, eigen.heup, "bredere heupen", "smallere heupen"),
    verschil(tailleDiepte(ander), tailleDiepte(eigen), "een meer uitgesproken taille", "een minder uitgesproken taille"),
  ].filter((d): d is string => d !== null);
  if (!delen.length) return "Vergelijkbare verhoudingen als jouw type.";
  const zin = delen.length === 1 ? delen[0] : `${delen.slice(0, -1).join(", ")} en ${delen[delen.length - 1]}`;
  return `${zin.charAt(0).toUpperCase()}${zin.slice(1)} dan jouw type.`;
}

/** Afstand tussen twee tekeningen (hoe verschillend de verhoudingen zijn). */
export function vormAfstand(a: Lichaamsvorm, b: Lichaamsvorm): number {
  const sleutels: (keyof Lichaamsvorm)[] = ["schouder", "borst", "taille", "hogeHeup", "heup"];
  return Math.sqrt(sleutels.reduce((som, k) => som + (a[k] - b[k]) ** 2, 0));
}

/**
 * De andere figuurtypes, het meest verwante (kleinste vormverschil) eerst. Het
 * eigen type (op code) valt weg; bij gelijke afstand blijft de oorspronkelijke volgorde.
 */
export function andereTypes<T extends { letter: string; vorm: Lichaamsvorm }>(eigen: T, alle: readonly T[]): T[] {
  return alle
    .map((t, i) => ({ t, i, afstand: vormAfstand(eigen.vorm, t.vorm) }))
    .filter(({ t }) => t.letter !== eigen.letter)
    .sort((a, b) => a.afstand - b.afstand || a.i - b.i)
    .map(({ t }) => t);
}

/**
 * Welk adviestype (sleutel, bijv. "6H") de klant mag bekijken op "Jouw figuurtype":
 * alleen bij een geldige, betaalde testlink waarvan de test is afgerond en er een
 * type is toegekend (zie beoordeelToken in lib/test-order.ts). Anders null.
 */
export function figuurtypeSleutel(
  b: { toestand: string; order?: { status: string; toegekend_type: string | null } },
): string | null {
  if (b.toestand !== "al_afgerond" || !b.order?.toegekend_type) return null;
  if (!(AFGERONDE_STATUSSEN as readonly string[]).includes(b.order.status)) return null;
  return b.order.toegekend_type;
}
