// De extra figuurtypes I (I-silhouet) en O (O-silhouet, de Appel) in de
// berekening. Puur: de schakelaar, en welke van de twee de berekening mag geven.
// De regels zelf staan in src/rekenkern/verfijning.ts.

import { koppelingsDoelFouten } from "./lichaamstype-regels";
import { EXTRA_FIGUURTYPES, type ExtraFiguurtype } from "@/rekenkern/config/verfijning";
import type { VerfijningInstelling } from "@/rekenkern/verfijning";

/** Instellingssleutel van de schakelaar ("aan" of "uit"; standaard uit). */
export const EXTRA_FIGUURTYPES_SLEUTEL = "extra_figuurtypes_berekening";

/** Staat de verfijning naar I en O aan? Alles behalve precies "aan" is uit. */
export function extraFiguurtypesAan(waarde: string | null | undefined): boolean {
  return typeof waarde === "string" && waarde.trim().toLowerCase() === "aan";
}

type TypeRij = { code: string; naam: string; actief: boolean };
type AdviesRij = { sleutel: string; secties: number };

/**
 * Wat er per extra type nog ontbreekt voordat de berekening het mag geven: het
 * type moet bestaan, actief zijn en alle 12 hand-outs moeten inhoud hebben.
 * Leeg = in orde.
 */
export function extraTypeFouten(
  code: ExtraFiguurtype,
  lichaamstypes: readonly TypeRij[],
  adviestypes: readonly AdviesRij[],
): string[] {
  return koppelingsDoelFouten({ [`Extra type ${code}`]: code }, lichaamstypes, adviestypes);
}

/** De extra types die klaar zijn (actief, met 12 gevulde hand-outs). */
export function beschikbareExtraTypes(
  lichaamstypes: readonly TypeRij[],
  adviestypes: readonly AdviesRij[],
): ExtraFiguurtype[] {
  return EXTRA_FIGUURTYPES.filter((c) => extraTypeFouten(c, lichaamstypes, adviestypes).length === 0);
}

/** De instelling voor de rekenkern: alleen aan als de schakelaar aan staat. */
export function verfijningInstelling(
  schakelaar: string | null | undefined,
  lichaamstypes: readonly TypeRij[],
  adviestypes: readonly AdviesRij[],
): VerfijningInstelling {
  if (!extraFiguurtypesAan(schakelaar)) return { aan: false, beschikbaar: [] };
  return { aan: true, beschikbaar: beschikbareExtraTypes(lichaamstypes, adviestypes) };
}
