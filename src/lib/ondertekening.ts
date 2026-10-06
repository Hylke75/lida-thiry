// Ondertekende links (HMAC) met een vervaldatum, bijv. voor het hervatten van een
// betaling vanuit een herinneringsmail. Zo staan er geen kale order-id's in links
// die iemand zou kunnen raden of aanpassen.

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Een geheim afgeleid van de service-role-sleutel, met een eigen label per doel
 * (zodat het niet de sleutel zelf is). Alleen als noodoplossing in productie
 * wanneer het eigen geheim (nog) niet is ingesteld: de site blijft dan werken,
 * en de checklist "Klaar voor livegang" waarschuwt. Null als er geen sleutel is.
 */
export function afgeleidGeheim(doel: string, env: Record<string, string | undefined> = process.env): string | null {
  const basis = env.SUPABASE_SERVICE_ROLE_KEY;
  if (!basis) return null;
  return createHmac("sha256", basis).update(`lida-thiry:${doel}`).digest("base64url");
}

const gewaarschuwd = new Set<string>();
/** Eén waarschuwing per proces in de serverlogs als een eigen geheim ontbreekt. */
export function waarschuwOntbrekendGeheim(naam: string) {
  if (gewaarschuwd.has(naam)) return;
  gewaarschuwd.add(naam);
  console.warn(`${naam} ontbreekt in productie; er wordt een afgeleid geheim gebruikt. Zet ${naam} in Vercel.`);
}

/**
 * Het geheim voor ondertekende links. In productie (VERCEL_ENV=production) hoort
 * LINK_GEHEIM ingesteld te zijn; ontbreekt het, dan een afgeleid geheim (zie
 * afgeleidGeheim) in plaats van kapotte links. Lokaal en op previews valt het
 * terug op andere geheimen.
 */
export function linkGeheim(env: Record<string, string | undefined> = process.env): string {
  if (env.VERCEL_ENV === "production") {
    if (env.LINK_GEHEIM) return env.LINK_GEHEIM;
    const afgeleid = afgeleidGeheim("link", env);
    if (!afgeleid) throw new Error("LINK_GEHEIM ontbreekt: in productie is een eigen geheim voor ondertekende links nodig.");
    waarschuwOntbrekendGeheim("LINK_GEHEIM");
    return afgeleid;
  }
  const g = env.LINK_GEHEIM || env.NIEUWSBRIEF_GEHEIM || env.CRON_SECRET || env.SUPABASE_SERVICE_ROLE_KEY;
  if (!g) throw new Error("Geen geheim voor ondertekende links (zet LINK_GEHEIM).");
  return g;
}

function geheim(): string {
  return linkGeheim();
}

/** HMAC-SHA256 van `bericht` met `sleutel`, als base64url ingekort tot `lengte` tekens. */
export function hmacHandtekening(bericht: string, sleutel: string, lengte: number): string {
  return createHmac("sha256", sleutel).update(bericht).digest("base64url").slice(0, lengte);
}

/** Vergelijkt een verwachte en een gekregen handtekening in constante tijd. */
export function zelfdeHandtekening(verwacht: string, gekregen: string): boolean {
  const a = Buffer.from(verwacht);
  const b = Buffer.from(gekregen);
  return a.length === b.length && timingSafeEqual(a, b);
}

function handtekening(doel: string, id: string, verlooptOp: number, sleutel: string): string {
  return hmacHandtekening(`${doel}\n${id}\n${verlooptOp}`, sleutel, 32);
}

/** Token "<verloopt-op in seconden>.<handtekening>" voor `doel` en `id`. */
export function ondertekenLink(doel: string, id: string, verlooptOp: Date, sleutel = geheim()): string {
  const sec = Math.floor(verlooptOp.getTime() / 1000);
  return `${sec}.${handtekening(doel, id, sec, sleutel)}`;
}

/** Klopt het token voor `doel` en `id`, en is het nog niet verlopen? */
export function controleerLink(
  doel: string,
  id: string,
  token: string,
  nu: Date = new Date(),
  sleutel = geheim(),
): boolean {
  const m = /^(\d{1,12})\.([A-Za-z0-9_-]{32})$/.exec(token ?? "");
  if (!m) return false;
  const sec = Number(m[1]);
  if (sec * 1000 < nu.getTime()) return false;
  return zelfdeHandtekening(handtekening(doel, id, sec, sleutel), m[2]);
}
