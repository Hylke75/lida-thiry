import "server-only";
import { cache } from "react";
import { adminClient } from "./supabase/admin";
import { beeldUrls } from "./beeldbank";
import { FFIT_NAAR_LETTER } from "@/rekenkern/config/ffit-naar-letter";
import { EXTRA_FIGUURTYPES } from "@/rekenkern/config/verfijning";
import { VERFIJNING_UIT, type VerfijningInstelling } from "@/rekenkern/verfijning";
import { leesInstelling } from "./instellingen";
import { alles } from "./supabase/alles";
import { EXTRA_FIGUURTYPES_SLEUTEL, extraFiguurtypesAan, verfijningInstelling } from "./extra-figuurtypes";
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

/**
 * Adviestypes van de gegeven lichaamstypes met hun aantal onderdelen (secties).
 * Voor de beschikbaarheid van de extra figuurtypes I en O.
 */
export async function haalAdviesInhoud(codes: readonly string[]): Promise<{ sleutel: string; secties: number }[]> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("adviestypes").select("sleutel").in("letter", [...codes]);
  if (error) throw new Error(`adviestypes lezen: ${error.message}`);
  const sleutels = (data ?? []).map((r) => r.sleutel as string);
  if (!sleutels.length) return [];
  const secties = await alles<{ type_sleutel: string }>((van, tot) =>
    supabase.from("adviessecties").select("type_sleutel").in("type_sleutel", sleutels).order("id").range(van, tot),
  );
  const per = new Map<string, number>();
  for (const s of secties) per.set(s.type_sleutel, (per.get(s.type_sleutel) ?? 0) + 1);
  return sleutels.map((sleutel) => ({ sleutel, secties: per.get(sleutel) ?? 0 }));
}

/**
 * Of de berekening de extra figuurtypes I en O mag geven, en welke. Staat de
 * schakelaar uit (standaard), dan zonder verdere databasevragen "uit".
 */
export async function haalVerfijning(): Promise<VerfijningInstelling> {
  try {
    const schakelaar = await leesInstelling(EXTRA_FIGUURTYPES_SLEUTEL);
    if (!extraFiguurtypesAan(schakelaar)) return VERFIJNING_UIT;
    const [types, advies] = await Promise.all([haalLichaamstypes(), haalAdviesInhoud(EXTRA_FIGUURTYPES)]);
    return verfijningInstelling(schakelaar, types, advies);
  } catch (e) {
    // Bij twijfel de gewone berekening: liever geen I/O dan een mislukte test.
    console.error("Verfijning I/O lezen mislukt; gewone berekening", e);
    return VERFIJNING_UIT;
  }
}
