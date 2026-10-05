import "server-only";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { levensduurVoor, NOODVOORZIENING_LEVENSDUUR, type CacheTag } from "./tags";
import { fetchMetTijdslimiet, maakStroomonderbreker, type Stroomonderbreker } from "./tijdslimiet";

// Gecachet lezen voor de publieke site.
//
// Keuze voor deze Next-versie: de "Cache Components"-aanpak ('use cache',
// cacheTag, cacheLife) vraagt `cacheComponents: true` voor de hele app. Dat
// verbiedt `export const dynamic`, verandert navigatie (Activity) en vraagt
// Suspense-grenzen rond alles wat cookies of zoekparameters leest, ook in het
// hele beheer. Daarom gebruiken we het (nog volledig ondersteunde) vorige model:
// unstable_cache met tags + revalidate, en ISR op de pagina's. Overstappen naar
// 'use cache' kan later per functie in dít bestand, zonder de aanroepers te raken.
//
// Regels:
//   - Alleen PUBLIEKE gegevens gaan door deze cache (wat elke bezoeker mag zien).
//     Het beheer leest via adminClient() altijd vers.
//   - Geen geheimen in het resultaat: de sleutel zit alleen in de request-headers
//     van de client, en het cachen gebeurt op het (gefilterde) resultaat.
//   - Fouten worden niet gecachet. Bij een fout geven we het laatst bekende
//     resultaat uit het geheugen terug (als dat er is) en anders gooien we door;
//     de leesfuncties vallen dan terug op hun standaardwaarden.

const ONDERBREKER = Symbol.for("lida-thiry.publiek-db.onderbreker");

/** Eén stroomonderbreker per serverproces (gedeeld door alle publieke leesfuncties). */
function onderbreker(): Stroomonderbreker {
  const g = globalThis as unknown as Record<symbol, Stroomonderbreker | undefined>;
  return (g[ONDERBREKER] ??= maakStroomonderbreker());
}

let client: SupabaseClient | null = null;

/**
 * Supabase-client voor het publieke leeswerk: service-role (zoals de rest van de
 * server), maar met een tijdslimiet van 3 s per verzoek, zonder automatische
 * herhaalpogingen, en met een stroomonderbreker.
 * Is de database traag of weg, dan vallen de pagina's snel terug op hun
 * standaardinhoud in plaats van 7–14 s te wachten. Niet gebruiken om te schrijven.
 */
export function publiekClient(): SupabaseClient {
  if (client) return client;
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY en NEXT_PUBLIC_SUPABASE_URL zijn vereist (server).");
  }
  client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    // supabase-js probeert een mislukt leesverzoek standaard nog 3 keer, met 1 + 2 + 4 s
    // wachttijd: 7 s extra per query bij een netwerkfout. Voor het renderen willen
    // we juist snel terugvallen (de onderbreker en de cache vangen het op).
    db: { retry: false },
    // Via een pijlfunctie: zo gebruiken we de fetch van Next op het moment van aanroepen.
    global: { fetch: fetchMetTijdslimiet((invoer, init) => fetch(invoer, init), { onderbreker: onderbreker() }) },
  });
  return client;
}

// Laatst bekende goede resultaten, per leesfunctie + argumenten (begrensd), met
// de tags van de leesfunctie: vernieuwPubliekeData vergeet ze per tag, zodat iets
// dat in het beheer offline is gehaald niet terugkomt als de database even weg is.
const MAX_ONTHOUDEN = 300;
const laatstBekend = new Map<string, { waarde: unknown; tags: readonly CacheTag[] }>();

function onthoud(sleutel: string, waarde: unknown, tags: readonly CacheTag[]) {
  laatstBekend.delete(sleutel);
  laatstBekend.set(sleutel, { waarde, tags });
  if (laatstBekend.size > MAX_ONTHOUDEN) laatstBekend.delete(laatstBekend.keys().next().value!);
}

/**
 * Vergeet de laatst bekende resultaten van leesfuncties met een van deze tags
 * (alleen in dit serverproces; andere instanties vergeten ze na hun eigen
 * herstart of overschrijven ze bij de volgende geslaagde lezing).
 */
export function vergeetLaatstBekend(tags: readonly string[]): void {
  if (!tags.length) return;
  const weg = new Set(tags);
  for (const [sleutel, item] of laatstBekend) {
    if (item.tags.some((t) => weg.has(t))) laatstBekend.delete(sleutel);
  }
}

const kortLeven = unstable_cache(async () => true, ["publiek", "noodvoorziening"], {
  revalidate: NOODVOORZIENING_LEVENSDUUR,
});

/**
 * Meldt dat deze render standaard- of oude gegevens gebruikt (database niet
 * bereikbaar). Een statische pagina blijft dan maar kort (30 s) bewaard, zodat
 * de echte inhoud snel terugkomt. Werkt via de kortste revalidate van de pagina.
 */
export async function noodvoorziening(): Promise<void> {
  try {
    await kortLeven();
  } catch {
    // buiten een Next-request (tests, scripts): niets te doen
  }
}

/**
 * Maakt van een leesfunctie een gecachete publieke leesfunctie.
 * - `naam`: unieke, vaste naam (onderdeel van de cachesleutel, samen met de argumenten).
 * - `tags`: zie lib/cache/tags.ts; beheeracties vernieuwen die via vernieuwPubliekeData.
 * - levensduur: de kortste van de tags (zie LEVENSDUUR), tenzij opgegeven.
 * De argumenten en het resultaat moeten JSON-serialiseerbaar zijn (geen Map/Date).
 */
export function publiekGecached<A extends unknown[], R>(
  naam: string,
  tags: readonly CacheTag[],
  lees: (...args: A) => Promise<R>,
  opties: { levensduur?: number } = {},
): (...args: A) => Promise<R> {
  const gecached = unstable_cache(lees, ["publiek", naam], {
    tags: [...tags],
    revalidate: opties.levensduur ?? levensduurVoor(tags),
  });
  // React cache: binnen één request maar één keer lezen.
  return cache(async (...args: A): Promise<R> => {
    const sleutel = `${naam}:${JSON.stringify(args)}`;
    try {
      const waarde = await gecached(...args);
      onthoud(sleutel, waarde, tags);
      return waarde;
    } catch (e) {
      await noodvoorziening();
      if (laatstBekend.has(sleutel)) {
        console.error(`${naam}: database niet bereikbaar; laatst bekende gegevens gebruikt.`, e instanceof Error ? e.message : e);
        return laatstBekend.get(sleutel)!.waarde as R;
      }
      throw e;
    }
  });
}
