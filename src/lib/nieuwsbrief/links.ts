// Links in nieuwsbrieven: afmelden, bevestigen, klik- en openmeting. Kliklinks zijn
// ondertekend (HMAC), zodat de doorstuurroute niet als open redirect te misbruiken is.

import { hmacHandtekening, zelfdeHandtekening } from "../ondertekening";
import { siteUrl } from "../site";

/** Productie: op Vercel de productieomgeving, elders een productiebuild (next start). */
function isProductie(): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV === "production";
  return process.env.NODE_ENV === "production";
}

// Eigen geheim (NIEUWSBRIEF_GEHEIM), los van LINK_GEHEIM: verstuurde mails blijven
// zo werken als een van beide wordt vervangen.
function geheim(): string {
  const eigen = process.env.NIEUWSBRIEF_GEHEIM;
  if (eigen) return eigen;
  // In productie geen terugval op andere geheimen: wie CRON_SECRET of de
  // service-role-sleutel roteert, zou anders alle verstuurde links breken, en die
  // sleutels horen niet in een HMAC voor openbare links.
  if (isProductie()) throw new Error("NIEUWSBRIEF_GEHEIM ontbreekt: verplicht in productie voor nieuwsbrieflinks.");
  const g = process.env.CRON_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!g) throw new Error("Geen geheim voor nieuwsbrieflinks (zet NIEUWSBRIEF_GEHEIM).");
  return g;
}

export function handtekening(verzendingId: string, url: string, sleutel = geheim()): string {
  return hmacHandtekening(`${verzendingId}\n${url}`, sleutel, 24);
}

export function klopt(verzendingId: string, url: string, sig: string, sleutel = geheim()): boolean {
  return zelfdeHandtekening(handtekening(verzendingId, url, sleutel), sig);
}

export function klikUrl(verzendingId: string, url: string): string {
  const p = new URLSearchParams({ u: url, s: handtekening(verzendingId, url) });
  return `${siteUrl()}/api/nb/k/${verzendingId}?${p.toString()}`;
}

export function pixelUrl(verzendingId: string): string {
  return `${siteUrl()}/api/nb/o/${verzendingId}`;
}

/** Pagina waar de ontvanger zich met één klik afmeldt (link onderaan de mail). */
export function afmeldPagina(token: string): string {
  return `${siteUrl()}/nieuwsbrief/afmelden/${token}`;
}

/** Endpoint voor de List-Unsubscribe-header (one-click, RFC 8058: POST). */
export function afmeldEndpoint(token: string): string {
  return `${siteUrl()}/api/nb/afmelden/${token}`;
}

export function bevestigPagina(token: string): string {
  return `${siteUrl()}/nieuwsbrief/bevestig/${token}`;
}

export const TOKEN_PATROON = /^[a-f0-9]{64}$/;
export const UUID_PATROON = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
