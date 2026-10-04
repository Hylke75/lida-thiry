import "server-only";
import { adminClient } from "./supabase/admin";
import { publiekClient, publiekGecached } from "./cache/publiek";
import { filterPubliekeInstellingen } from "./cache/publieke-instellingen";

/** Leest alle instellingen als key/value-map (server-side, altijd vers: beheer, API's, mails). */
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

/** Zet een opgeslagen prijs om in centen, of null als die (nog) niet geldig is. */
function alsPrijsCent(waarde: string | null | undefined): number | null {
  if (!waarde) return null;
  const n = Number(waarde);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

/** De prijs in centen, of null wanneer de adviseur die nog niet heeft ingesteld (vers). */
export async function leesPrijsCent(): Promise<number | null> {
  return alsPrijsCent(await leesInstelling("prijs_cent"));
}

/**
 * De publieke instellingen (zie cache/publieke-instellingen.ts) voor het renderen
 * van de site: gecachet onder de tag "instellingen", met een tijdslimiet op de
 * database. Gooit bij een fout (de aanroeper valt terug op standaardwaarden).
 * Bedoeld voor pagina's en componenten van de publieke site, niet voor het beheer
 * of voor betalingen (die lezen vers).
 */
export const leesPubliekeInstellingen = publiekGecached("instellingen", ["instellingen"], async () => {
  const { data, error } = await publiekClient().from("instellingen").select("sleutel, waarde");
  if (error) throw new Error(`instellingen lezen: ${error.message}`);
  const map: Record<string, string | null> = {};
  for (const rij of data ?? []) map[rij.sleutel as string] = rij.waarde as string | null;
  return filterPubliekeInstellingen(map);
});

/** Prijs en valuta voor weergave op de publieke site (gecachet). Gooit bij een databasefout. */
export async function leesPubliekePrijs(): Promise<{ prijsCent: number | null; valuta: string }> {
  const inst = await leesPubliekeInstellingen();
  return { prijsCent: alsPrijsCent(inst.prijs_cent), valuta: inst.valuta || "EUR" };
}
