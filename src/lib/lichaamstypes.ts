import "server-only";
import { cache } from "react";
import { adminClient } from "./supabase/admin";
import { beeldUrls } from "./beeldbank";
import { FFIT_NAAR_LETTER } from "@/rekenkern/config/ffit-naar-letter";
import type { FfitType } from "@/rekenkern/types";
import {
  alsSilhouet,
  ontleedTypeSleutel,
  type Lichaamstype,
  type Silhouet,
} from "./lichaamstype-regels";

const LICHAAMSTYPE_KOLOMMEN =
  "code, naam, alias, korte_omschrijving, uitleg, kenmerken, vorm, beeld_id, volgorde, actief";

/** Alle lichaamstypes (vers; per request gecachet), op volgorde. */
export const haalLichaamstypes = cache(async (): Promise<Lichaamstype[]> => {
  const { data, error } = await adminClient()
    .from("lichaamstypes")
    .select(LICHAAMSTYPE_KOLOMMEN)
    .order("volgorde")
    .order("code");
  if (error) throw new Error(`Lichaamstypes lezen: ${error.message}`);
  return (data ?? []) as Lichaamstype[];
});

/**
 * Silhouetten voor de test, de uitslag en "Jouw figuurtype" (met de URL van de
 * foto als die gekoppeld is). Standaard alleen de actieve types. Alleen voor
 * pagina's achter een geldige testlink of het beheer: de figuurtypes zijn niet
 * openbaar (geen publieke, gecachete variant).
 */
export const haalSilhouetten = cache(async (alleenActief = true): Promise<Silhouet[]> => {
  const types = (await haalLichaamstypes()).filter((t) => !alleenActief || t.actief);
  const beeldIds = types.map((t) => t.beeld_id).filter((id): id is string => Boolean(id));
  let paden: Record<string, string> = {};
  if (beeldIds.length) {
    const { data } = await adminClient().from("beelden").select("id, pad, thumb_pad").in("id", beeldIds);
    paden = Object.fromEntries((data ?? []).map((b) => [b.id, (b.thumb_pad ?? b.pad) as string]));
  }
  const urls = await beeldUrls(Object.values(paden));
  return types.map((t) => alsSilhouet(t, t.beeld_id ? urls[paden[t.beeld_id]] : null));
});

/** Het silhouet bij een adviestype-sleutel (bijv. 6A -> Peer / driehoek). */
export async function silhouetVoorSleutel(sleutel: string): Promise<Silhouet | undefined> {
  const code = ontleedTypeSleutel(sleutel)?.code;
  if (!code) return undefined;
  return (await haalSilhouetten(false)).find((s) => s.letter === code);
}

/**
 * Welke uitkomst van de berekening bij welk lichaamstype hoort. Valt terug op
 * de oorspronkelijke tabel uit de code als de database (nog) leeg is.
 */
export const haalFfitToewijzing = cache(
  async (): Promise<Record<Exclude<FfitType, "Geen type">, string | null>> => {
    const { data, error } = await adminClient().from("ffit_toewijzing").select("ffit_type, code");
    if (error || !data?.length) return { ...FFIT_NAAR_LETTER };
    const uit = { ...FFIT_NAAR_LETTER } as Record<Exclude<FfitType, "Geen type">, string | null>;
    for (const r of data) uit[r.ffit_type as Exclude<FfitType, "Geen type">] = r.code;
    return uit;
  },
);
