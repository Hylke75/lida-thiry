import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { legeDoorverwijzingCache } from "./cache";
import { bestemmingsPad, isGereserveerd, MAX_DOORVERWIJZINGEN, normaliseerPad, slugWijziging, type DoorverwijzingRij } from "./regels";

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

/** `pad` als ilike-patroon zonder jokertekens (% en _ letterlijk). */
function letterlijk(pad: string): string {
  return pad.replace(/[\\%_]/g, (t) => `\\${t}`);
}

/**
 * Er staat (weer) een pagina of bericht online op `pad`: een doorverwijzing vanaf
 * dat adres zou die verbergen (de proxy draait vóór de pagina's), dus die vervalt.
 * Hoofdletterongevoelig, net als het opzoeken in de proxy. Faalt zacht; geeft
 * terug of het lukte.
 */
export async function ruimDoorverwijzingOp(pad: string): Promise<boolean> {
  const van = normaliseerPad(pad);
  if (van === "/" || isGereserveerd(van)) return true;
  try {
    const db = adminClient();
    const { data, error } = await db.from("doorverwijzingen").select("id, naar").ilike("van", letterlijk(van));
    if (error) throw error;
    // Een regel als "/Over → /over" (naar dit adres zelf) mag blijven staan.
    const weg = (data ?? []).filter((r) => bestemmingsPad(r.naar as string) !== van).map((r) => r.id as string);
    if (!weg.length) return true;
    const { error: fout } = await db.from("doorverwijzingen").delete().in("id", weg);
    if (fout) throw fout;
    legeDoorverwijzingCache();
    return true;
  } catch (e) {
    console.error(`doorverwijzingen: doorverwijzing vanaf ${van} niet verwijderd`, e);
    return false;
  }
}

/**
 * Na opslaan of publiceren van iets dat nu online staat op `nieuwPad`: was het al
 * online op `oudPad` (ander adres), dan verwijst het oude adres voortaan door;
 * een doorverwijzing vanaf het nieuwe adres vervalt (anders blijft het verborgen).
 * Geeft een waarschuwing als de automatische doorverwijzing niet lukte, anders null.
 */
export async function werkDoorverwijzingenBij(nieuwPad: string, oudPad?: string | null): Promise<string | null> {
  let waarschuwing: string | null = null;
  if (oudPad && oudPad !== nieuwPad && !(await registreerSlugWijziging(oudPad, nieuwPad))) {
    waarschuwing = `Let op: de automatische doorverwijzing van ${oudPad} naar ${nieuwPad} kon niet worden aangemaakt. Voeg die zelf toe onder Doorverwijzingen, anders werken links naar het oude adres niet meer.`;
  }
  await ruimDoorverwijzingOp(nieuwPad);
  return waarschuwing;
}

/** Een melding met (als die er is) de waarschuwing van werkDoorverwijzingenBij erachter. */
export function metWaarschuwing(melding: string, waarschuwing: string | null): string {
  return waarschuwing ? `${melding} ${waarschuwing}` : melding;
}

/**
 * Wat er nu online staat op `pad` (een gepubliceerde pagina of een zichtbaar
 * blogbericht), voor een waarschuwing bij het aanmaken van een doorverwijzing.
 * Faalt zacht (null).
 */
export async function onlineOpPad(pad: string): Promise<string | null> {
  const van = normaliseerPad(pad).toLowerCase();
  const blog = /^\/blog\/([^/]+)$/.exec(van);
  const pagina = /^\/([^/]+)$/.exec(van);
  try {
    if (blog) {
      const { data } = await adminClient()
        .from("blog_berichten")
        .select("titel")
        .eq("slug", blog[1])
        .eq("status", "gepubliceerd")
        .lte("gepubliceerd_op", new Date().toISOString())
        .maybeSingle();
      return data ? `het blogbericht ‘${data.titel as string}’` : null;
    }
    if (pagina) {
      const { data } = await adminClient().from("paginas").select("titel").eq("slug", pagina[1]).eq("status", "gepubliceerd").maybeSingle();
      return data ? `de pagina ‘${data.titel as string}’` : null;
    }
  } catch (e) {
    console.error(`doorverwijzingen: controle op ${van} mislukt`, e);
  }
  return null;
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
