import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { legeDoorverwijzingCache } from "./cache";
import { MAX_DOORVERWIJZINGEN, slugWijziging, type DoorverwijzingRij } from "./regels";

export const DOORVERWIJZING_VELDEN = "id, van, naar, permanent, automatisch, aantal_gebruikt, laatst_gebruikt_op, aangemaakt_op";

/** Alle doorverwijzingen, nieuwste eerst. */
export async function alleDoorverwijzingen(): Promise<DoorverwijzingRij[]> {
  const { data, error } = await adminClient()
    .from("doorverwijzingen")
    .select(DOORVERWIJZING_VELDEN)
    .order("aangemaakt_op", { ascending: false })
    .limit(MAX_DOORVERWIJZINGEN);
  if (error) throw new Error(`Doorverwijzingen lezen: ${error.message}`);
  return (data ?? []) as DoorverwijzingRij[];
}

/**
 * Een gepubliceerde pagina/blogbericht/formulierpagina verhuist van `oudPad` naar
 * `nieuwPad`: het oude adres verwijst voortaan (permanent, automatisch) naar het
 * nieuwe; verwijzingen naar het oude adres gaan direct naar het nieuwe (geen
 * ketens); een verwijzing vanaf het nieuwe adres vervalt (daar staat nu de pagina).
 * Faalt zacht: het opslaan van de pagina zelf is al gelukt. Geeft terug of het lukte.
 */
export async function registreerSlugWijziging(oudPad: string, nieuwPad: string): Promise<boolean> {
  const w = slugWijziging(oudPad, nieuwPad);
  if (!w) return true;
  try {
    const db = adminClient();
    // Volgorde telt: eerst de verwijzing vanaf het nieuwe adres weg, anders kan het
    // herrichten een regel "nieuw → nieuw" opleveren.
    const weg = await db.from("doorverwijzingen").delete().eq("van", w.verwijderVan);
    if (weg.error) throw weg.error;
    const om = await db.from("doorverwijzingen").update({ naar: w.herrichtNaar.naar }).eq("naar", w.herrichtNaar.van);
    if (om.error) throw om.error;
    const nieuw = await db.from("doorverwijzingen").upsert(w.upsert, { onConflict: "van" });
    if (nieuw.error) throw nieuw.error;
    return true;
  } catch (e) {
    console.error(`doorverwijzingen: automatische doorverwijzing ${oudPad} → ${nieuwPad} mislukt`, e);
    return false;
  } finally {
    legeDoorverwijzingCache();
  }
}
