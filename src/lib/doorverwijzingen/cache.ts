// Doorverwijzingen voor de proxy: de tabel staat per serverinstantie maximaal
// CACHE_MS in het geheugen. Geen 'server-only' en geen supabase-js: alleen fetch
// naar PostgREST met de service-role-sleutel (werkt in de Node-runtime van de
// proxy). Is de database onbereikbaar, dan zijn er gewoon geen doorverwijzingen.

import { bouwIndex, MAX_DOORVERWIJZINGEN, type Doorverwijzing, type Index } from "./regels";

const CACHE_MS = 60_000;
/** Na een fout korter wachten met opnieuw proberen, maar niet bij elk verzoek. */
const FOUT_CACHE_MS = 15_000;
const LAAD_TIMEOUT_MS = 1_500;
const TEL_TIMEOUT_MS = 3_000;

interface Staat {
  index: Index | null;
  geldigTot: number;
  bezig: Promise<Index> | null;
  /** Wordt opgehoogd bij legen; een lading van vóór het legen geldt dan niet als vers. */
  generatie: number;
}

// Op globalThis, zodat beheeracties in hetzelfde Node-proces de cache direct
// kunnen legen (anders: hooguit CACHE_MS oud).
const SLEUTEL = Symbol.for("lida-thiry.doorverwijzingen");
function staat(): Staat {
  const g = globalThis as unknown as Record<symbol, Staat | undefined>;
  return (g[SLEUTEL] ??= { index: null, geldigTot: 0, bezig: null, generatie: 0 });
}

const LEEG: Index = { exact: new Map(), klein: new Map() };

function config(): { url: string; sleutel: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sleutel = process.env.SUPABASE_SERVICE_ROLE_KEY;
  return url && sleutel ? { url: url.replace(/\/$/, ""), sleutel } : null;
}

function kop(sleutel: string): Record<string, string> {
  return { apikey: sleutel, Authorization: `Bearer ${sleutel}` };
}

async function laad(): Promise<Index> {
  const s = staat();
  const generatie = s.generatie;
  const c = config();
  if (!c) {
    s.index = LEEG;
    s.geldigTot = Date.now() + CACHE_MS;
    return LEEG;
  }
  try {
    const res = await fetch(`${c.url}/rest/v1/doorverwijzingen?select=van,naar,permanent&limit=${MAX_DOORVERWIJZINGEN}`, {
      headers: kop(c.sleutel),
      cache: "no-store",
      signal: AbortSignal.timeout(LAAD_TIMEOUT_MS),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rijen = (await res.json()) as Doorverwijzing[];
    const index = bouwIndex(Array.isArray(rijen) ? rijen : []);
    // Intussen geleegd (wijziging in beheer)? Dan is deze lading te oud om te bewaren.
    if (generatie === s.generatie) {
      s.index = index;
      s.geldigTot = Date.now() + CACHE_MS;
    }
    return index;
  } catch (e) {
    console.error("doorverwijzingen: laden mislukt, tijdelijk zonder doorverwijzingen", e instanceof Error ? e.message : e);
    // Oude tabel blijven gebruiken als die er is; anders geen doorverwijzingen.
    if (generatie !== s.generatie) return s.index ?? LEEG;
    s.index ??= LEEG;
    s.geldigTot = Date.now() + FOUT_CACHE_MS;
    return s.index;
  } finally {
    if (generatie === s.generatie) s.bezig = null;
  }
}

/**
 * De opzoektabel. Verlopen maar aanwezig: direct de oude teruggeven en op de
 * achtergrond verversen. Nog niets geladen: wachten (maximaal LAAD_TIMEOUT_MS).
 */
export async function haalIndex(): Promise<Index> {
  const s = staat();
  if (s.index && Date.now() < s.geldigTot) return s.index;
  s.bezig ??= laad();
  if (s.index) {
    s.bezig.catch(() => {});
    return s.index;
  }
  return s.bezig;
}

/** Laat de volgende aanvraag de tabel opnieuw laden (na een wijziging in beheer). */
export function legeDoorverwijzingCache(): void {
  const s = staat();
  // index weg: het volgende verzoek wacht op de verse tabel i.p.v. de oude te gebruiken.
  s.index = null;
  s.geldigTot = 0;
  s.bezig = null;
  s.generatie++;
}

/** Telt een gebruik; fouten worden genegeerd (alleen statistiek). */
export async function telGebruik(van: string): Promise<void> {
  const c = config();
  if (!c) return;
  try {
    await fetch(`${c.url}/rest/v1/rpc/tel_doorverwijzing`, {
      method: "POST",
      headers: { ...kop(c.sleutel), "Content-Type": "application/json" },
      body: JSON.stringify({ p_van: van }),
      cache: "no-store",
      signal: AbortSignal.timeout(TEL_TIMEOUT_MS),
    });
  } catch {
    // statistiek is niet belangrijk genoeg om iets te laten mislukken
  }
}
