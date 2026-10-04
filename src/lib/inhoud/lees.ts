import "server-only";
import { cache } from "react";
import { adminClient } from "../supabase/admin";
import { publiekClient, publiekGecached } from "../cache/publiek";
import { combineer, standaardWaarden, type Sectie, type SectieWaarden } from "./schema";

/** Alle opgeslagen teksten, vers uit de database (voor het beheer), één keer per request gelezen. */
export const leesAlleInhoud = cache(async (): Promise<Map<string, unknown>> => {
  const { data, error } = await adminClient().from("inhoud").select("sleutel, waarde");
  if (error) throw new Error(`inhoud lezen: ${error.message}`);
  return new Map((data ?? []).map((r) => [r.sleutel as string, r.waarde as unknown]));
});

/**
 * Alle opgeslagen teksten voor de site: gecachet onder de tag "inhoud" (opslaan
 * in Beheer → Teksten vernieuwt hem direct), met een tijdslimiet op de database.
 * Teksten zijn openbaar (ze staan op de site of in mails aan klanten).
 */
const leesInhoudGecached = publiekGecached("inhoud", ["inhoud"], async (): Promise<Record<string, unknown>> => {
  const { data, error } = await publiekClient().from("inhoud").select("sleutel, waarde");
  if (error) throw new Error(`inhoud lezen: ${error.message}`);
  return Object.fromEntries((data ?? []).map((r) => [r.sleutel as string, r.waarde as unknown]));
});

/**
 * De teksten van een sectie: opgeslagen aanpassingen aangevuld met de standaard.
 * Gecachet (zie hierboven). Valt terug op de standaardtekst wanneer de database
 * niet bereikbaar is, zodat de site altijd blijft werken.
 */
export async function leesSectie<S extends Sectie>(s: S): Promise<SectieWaarden<S>> {
  try {
    const alles = await leesInhoudGecached();
    return combineer(s, alles[s.sleutel]);
  } catch (e) {
    console.error(`Teksten voor ${s.sleutel} niet geladen; standaardtekst gebruikt.`, e);
    return standaardWaarden(s);
  }
}

/** Als leesSectie, maar vers uit de database: voor beheerschermen die teksten tonen. */
export async function leesSectieVers<S extends Sectie>(s: S): Promise<SectieWaarden<S>> {
  try {
    return combineer(s, (await leesAlleInhoud()).get(s.sleutel));
  } catch (e) {
    console.error(`Teksten voor ${s.sleutel} niet geladen; standaardtekst gebruikt.`, e);
    return standaardWaarden(s);
  }
}
