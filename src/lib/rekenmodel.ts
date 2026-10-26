// Welke rekenmethode de test gebruikt: de FFIT-methode (standaard) of de methode
// van Lida (src/rekenkern/lida-model.ts), met haar instelbare grenzen. Puur: de
// instellingen worden op de server gelezen (src/lib/lichaamstypes.ts).

import {
  BOVENLICHAAM_LENGTES,
  BREEDSTE_PUNTEN,
  LIDA_GRENZEN_BEREIK,
  LIDA_GRENZEN_STANDAARD,
  SCHOUDERBREEDTE_GRENZEN,
  type Bovenlichaam,
  type BreedstePunt,
  type LidaGrenzen,
} from "@/rekenkern/config/lida-model";

/** Instelling: "ffit" (standaard) of "lida". */
export const REKENMODEL_SLEUTEL = "rekenmodel";
/** Instelling: de grenzen van Lida's methode als JSON (leeg = standaard). */
export const LIDA_GRENZEN_SLEUTEL = "rekenmodel_lida_grenzen";

export type Rekenmodel = "ffit" | "lida";

export interface RekenmodelInstelling {
  model: Rekenmodel;
  grenzen: LidaGrenzen;
}

export const REKENMODEL_FFIT: RekenmodelInstelling = { model: "ffit", grenzen: LIDA_GRENZEN_STANDAARD };

/** Alles behalve precies "lida" is de FFIT-methode. */
export function leesRekenmodel(waarde: string | null | undefined): Rekenmodel {
  return typeof waarde === "string" && waarde.trim().toLowerCase() === "lida" ? "lida" : "ffit";
}

/**
 * De grenzen uit de instelling: per grens het opgeslagen getal als het geldig is
 * en binnen het bereik valt, anders de standaard. Kapotte JSON = standaard.
 */
export function leesLidaGrenzen(json: string | null | undefined): LidaGrenzen {
  let ruw: Record<string, unknown> = {};
  try {
    const p = json ? JSON.parse(json) : {};
    if (p && typeof p === "object" && !Array.isArray(p)) ruw = p as Record<string, unknown>;
  } catch {
    ruw = {};
  }
  const uit = { ...LIDA_GRENZEN_STANDAARD };
  for (const k of Object.keys(LIDA_GRENZEN_BEREIK) as (keyof LidaGrenzen)[]) {
    const v = ruw[k];
    const { min, max } = LIDA_GRENZEN_BEREIK[k];
    if (typeof v === "number" && Number.isFinite(v) && v >= min && v <= max) uit[k] = v;
  }
  return uit;
}

/** Een breedste punt uit de invoer, of null. */
export function alsBreedstePunt(v: unknown): BreedstePunt | null {
  return typeof v === "string" && (BREEDSTE_PUNTEN as readonly string[]).includes(v) ? (v as BreedstePunt) : null;
}

/** Een lengte van het bovenlichaam uit de invoer, of null. */
export function alsBovenlichaam(v: unknown): Bovenlichaam | null {
  return typeof v === "string" && (BOVENLICHAAM_LENGTES as readonly string[]).includes(v) ? (v as Bovenlichaam) : null;
}

/** Ligt de schouderbreedte (cm) binnen het bereik? */
export function geldigeSchouderbreedte(v: number | null | undefined): v is number {
  return typeof v === "number" && Number.isFinite(v) && v >= SCHOUDERBREEDTE_GRENZEN.min && v <= SCHOUDERBREEDTE_GRENZEN.max;
}
