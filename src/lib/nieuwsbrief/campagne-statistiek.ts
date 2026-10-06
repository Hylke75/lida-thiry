import "server-only";
import { adminClient } from "../supabase/admin";
import { LEGE_TOTALEN, totalenUitRij, type LinkTelling, type Totalen } from "./rapport";

/** Totalen per campagne, via de databasefunctie nb_campagne_statistiek (migratie 20261004150000). */
export async function statistiekPerCampagne(ids: string[]): Promise<Map<string, Totalen>> {
  const uit = new Map<string, Totalen>();
  if (!ids.length) return uit;
  const { data, error } = await adminClient().rpc("nb_campagne_statistiek", { p_ids: ids });
  if (error) throw new Error(`statistiek: ${error.message}`);
  for (const r of (data ?? []) as Record<string, unknown>[]) uit.set(String(r.campagne_id), totalenUitRij(r));
  for (const id of ids) if (!uit.has(id)) uit.set(id, { ...LEGE_TOTALEN });
  return uit;
}

/** Kliks per link van één campagne (unieke klikkers en totaal), via nb_klik_statistiek. */
export async function kliksPerLink(campagneId: string): Promise<LinkTelling[]> {
  const { data, error } = await adminClient().rpc("nb_klik_statistiek", { p_campagne: campagneId });
  if (error) throw new Error(`kliks: ${error.message}`);
  return ((data ?? []) as { url: string; uniek: unknown; totaal: unknown }[]).map((r) => ({
    url: r.url,
    uniek: Number(r.uniek) || 0,
    totaal: Number(r.totaal) || 0,
  }));
}
