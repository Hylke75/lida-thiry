import "server-only";
import { cache } from "react";
import { adminClient } from "../supabase/admin";
import { combineer, standaardWaarden, type Sectie, type SectieWaarden } from "./schema";

/** Alle opgeslagen teksten, één keer per request gelezen. */
export const leesAlleInhoud = cache(async (): Promise<Map<string, unknown>> => {
  const { data, error } = await adminClient().from("inhoud").select("sleutel, waarde");
  if (error) throw new Error(`inhoud lezen: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.sleutel as string, r.waarde as unknown]));
});

/**
 * De teksten van een sectie: opgeslagen aanpassingen aangevuld met de standaard.
 * Valt terug op de standaardtekst wanneer de database niet bereikbaar is, zodat
 * de site altijd blijft werken.
 */
export async function leesSectie<S extends Sectie>(s: S): Promise<SectieWaarden<S>> {
  try {
    const alles = await leesAlleInhoud();
    return combineer(s, alles.get(s.sleutel));
  } catch (e) {
    console.error(`Teksten voor ${s.sleutel} niet geladen; standaardtekst gebruikt.`, e);
    return standaardWaarden(s);
  }
}
