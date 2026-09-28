import "server-only";
import { adminClient } from "./supabase/admin";

/** Leest alle instellingen als key/value-map (server-side). */
export async function leesInstellingen(): Promise<Record<string, string | null>> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("instellingen")
    .select("sleutel, waarde");
  if (error) throw new Error(`instellingen lezen: ${error.message}`);
  const map: Record<string, string | null> = {};
  for (const rij of data ?? []) map[rij.sleutel] = rij.waarde;
  return map;
}

export async function leesInstelling(sleutel: string): Promise<string | null> {
  const map = await leesInstellingen();
  return map[sleutel] ?? null;
}

/** De prijs in centen, of null wanneer de adviseur die nog niet heeft ingesteld. */
export async function leesPrijsCent(): Promise<number | null> {
  const waarde = await leesInstelling("prijs_cent");
  if (!waarde) return null;
  const n = Number(waarde);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}
