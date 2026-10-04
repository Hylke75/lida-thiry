import "server-only";
import type { adminClient } from "@/lib/supabase/admin";
import { supabaseRef } from "@/lib/omgeving";
import { manifestTabel, OPSLAG_OPMERKING, type BackupManifest, type ManifestTabel, type OpslagBucket } from "./formaat";
import { BACKUP_FORMAAT, BACKUP_TABELLEN, BACKUP_VERSIE, PAGINA_GROOTTE } from "./tabellen";

type SupabaseClient = ReturnType<typeof adminClient>;

/** Grenzen voor het tellen van de opslag (één verzoek per map). */
const MAX_LIJST_VERZOEKEN = 300;

/**
 * Telt per bucket het aantal bestanden en de totale grootte (recursief door de
 * mappen). Stopt na een vast aantal verzoeken; dan staat `onvolledig` aan.
 */
export async function telOpslag(supabase: SupabaseClient): Promise<{ buckets: OpslagBucket[]; fout?: string }> {
  const { data: buckets, error } = await supabase.storage.listBuckets();
  if (error) return { buckets: [], fout: error.message };
  let verzoeken = 0;
  const uit: OpslagBucket[] = [];
  for (const b of buckets ?? []) {
    const telling: OpslagBucket = { naam: b.name, publiek: b.public, bestanden: 0, bytes: 0 };
    const mappen = [""];
    while (mappen.length) {
      const map = mappen.shift()!;
      for (let offset = 0; ; offset += 1000) {
        if (++verzoeken > MAX_LIJST_VERZOEKEN) {
          telling.onvolledig = true;
          mappen.length = 0;
          break;
        }
        const { data, error: e } = await supabase.storage.from(b.name).list(map, { limit: 1000, offset });
        if (e) {
          telling.onvolledig = true;
          break;
        }
        for (const item of data ?? []) {
          // Mappen hebben geen id en geen metadata.
          if (item.id === null || item.id === undefined) mappen.push(map ? `${map}/${item.name}` : item.name);
          else {
            telling.bestanden++;
            const grootte = Number((item.metadata as { size?: unknown } | null)?.size ?? 0);
            telling.bytes += Number.isFinite(grootte) ? grootte : 0;
          }
        }
        if ((data?.length ?? 0) < 1000) break;
      }
    }
    uit.push(telling);
  }
  return { buckets: uit };
}

/** Aantal rijen per tabel in de huidige database (null = niet te tellen). */
export async function telTabellen(supabase: SupabaseClient): Promise<Record<string, number | null>> {
  const tellingen = await Promise.all(
    BACKUP_TABELLEN.map(async (t) => {
      const { count, error } = await supabase.from(t.naam).select("*", { count: "exact", head: true });
      return [t.naam, error ? null : (count ?? 0)] as const;
    }),
  );
  return Object.fromEntries(tellingen);
}

/**
 * De back-up als reeks JSON-stukken: per tabel per pagina van 1000 rijen, zodat
 * het geheugen klein blijft. Het manifest (met tellingen) komt aan het eind.
 * Een tabel die niet te lezen is, komt leeg in de back-up met de fout in het
 * manifest; een fout halverwege een tabel breekt de back-up af (het bestand
 * is dan onvolledig en de controle keurt het af).
 */
export async function* backupStukken(supabase: SupabaseClient, nu = new Date()): AsyncGenerator<string> {
  const gemaakt = nu.toISOString();
  yield `{"formaat":${JSON.stringify(BACKUP_FORMAAT)},"versie":${BACKUP_VERSIE},"gemaakt_op":${JSON.stringify(gemaakt)},"tabellen":{`;
  const manifest: ManifestTabel[] = [];
  for (const [i, t] of BACKUP_TABELLEN.entries()) {
    yield `${i ? "," : ""}${JSON.stringify(t.naam)}:[`;
    let aantal = 0;
    let fout: string | undefined;
    for (let van = 0; ; van += PAGINA_GROOTTE) {
      let q = supabase.from(t.naam).select("*");
      for (const k of t.sleutel) q = q.order(k, { ascending: true });
      const { data, error } = await q.range(van, van + PAGINA_GROOTTE - 1);
      if (error) {
        if (van === 0) {
          fout = error.message;
          break;
        }
        throw new Error(`Tabel ${t.naam} lezen mislukt na ${aantal} rijen: ${error.message}`);
      }
      const rijen = data ?? [];
      if (rijen.length) yield `${aantal ? "," : ""}${rijen.map((r) => JSON.stringify(r)).join(",")}`;
      aantal += rijen.length;
      if (rijen.length < PAGINA_GROOTTE) break;
    }
    yield "]";
    manifest.push(manifestTabel(t, aantal, fout));
  }
  const opslag = await telOpslag(supabase).catch((e: unknown) => ({
    buckets: [],
    fout: e instanceof Error ? e.message : String(e),
  }));
  const volledig: BackupManifest = {
    formaat: BACKUP_FORMAAT,
    versie: BACKUP_VERSIE,
    gemaakt_op: gemaakt,
    project: supabaseRef(process.env.NEXT_PUBLIC_SUPABASE_URL),
    tabellen: manifest,
    opslag,
    opmerking: OPSLAG_OPMERKING,
  };
  yield `},"manifest":${JSON.stringify(volledig)}}`;
}

/** De back-up als gzip-stream (voor de downloadroute). */
export function backupStream(supabase: SupabaseClient, bijFout: (e: unknown) => void): ReadableStream<Uint8Array> {
  const stukken = backupStukken(supabase);
  const encoder = new TextEncoder();
  const json = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const { value, done } = await stukken.next();
        if (done) controller.close();
        else controller.enqueue(encoder.encode(value));
      } catch (e) {
        bijFout(e);
        controller.error(e);
      }
    },
    async cancel() {
      await stukken.return(undefined);
    },
  });
  return json.pipeThrough(new CompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>);
}
