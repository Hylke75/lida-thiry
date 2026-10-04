import "server-only";
import { adminClient } from "../supabase/admin";
import {
  LEGE_TOTALEN,
  telKliks,
  telVerzendingen,
  totalenUitRij,
  type KlikRij,
  type LinkTelling,
  type Totalen,
  type VerzendStatusRij,
} from "./rapport";

/**
 * Totalen per campagne. Gebruikt de databasefunctie nb_campagne_statistiek
 * (migratie 20261004150000) en valt terug op tellen in de app als die functie
 * (nog) niet bestaat.
 */
export async function statistiekPerCampagne(ids: string[]): Promise<Map<string, Totalen>> {
  const uit = new Map<string, Totalen>();
  if (!ids.length) return uit;
  const supabase = adminClient();

  const { data, error } = await supabase.rpc("nb_campagne_statistiek", { p_ids: ids });
  if (!error && Array.isArray(data)) {
    for (const r of data as Record<string, unknown>[]) uit.set(String(r.campagne_id), totalenUitRij(r));
  } else {
    const rijen: VerzendStatusRij[] = [];
    for (let van = 0; ; van += 1000) {
      const { data: deel, error: fout } = await supabase
        .from("nb_verzendingen")
        .select("campagne_id, status, geopend_op, geklikt_op, afgemeld_op, gebounced_op")
        .in("campagne_id", ids)
        .order("id")
        .range(van, van + 999);
      if (fout) throw new Error(`statistiek: ${fout.message}`);
      rijen.push(...((deel ?? []) as VerzendStatusRij[]));
      if (!deel || deel.length < 1000) break;
    }
    for (const [id, t] of telVerzendingen(rijen)) uit.set(id, t);
  }
  for (const id of ids) if (!uit.has(id)) uit.set(id, { ...LEGE_TOTALEN });
  return uit;
}

/** Kliks per link van één campagne (unieke klikkers en totaal). */
export async function kliksPerLink(campagneId: string): Promise<LinkTelling[]> {
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("nb_klik_statistiek", { p_campagne: campagneId });
  if (!error && Array.isArray(data)) {
    return (data as { url: string; uniek: unknown; totaal: unknown }[]).map((r) => ({
      url: r.url,
      uniek: Number(r.uniek) || 0,
      totaal: Number(r.totaal) || 0,
    }));
  }
  const rijen: KlikRij[] = [];
  for (let van = 0; ; van += 1000) {
    const { data: deel, error: fout } = await supabase
      .from("nb_klikken")
      .select("url, verzending_id, nb_verzendingen!inner(campagne_id)")
      .eq("nb_verzendingen.campagne_id", campagneId)
      .order("id")
      .range(van, van + 999);
    if (fout) throw new Error(`kliks: ${fout.message}`);
    rijen.push(...((deel ?? []) as KlikRij[]));
    if (!deel || deel.length < 1000) break;
  }
  return telKliks(rijen);
}
