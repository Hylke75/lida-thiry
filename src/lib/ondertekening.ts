// Ondertekende links (HMAC) met een vervaldatum, bijv. voor het hervatten van een
// betaling vanuit een herinneringsmail. Zo staan er geen kale order-id's in links
// die iemand zou kunnen raden of aanpassen.

import { createHmac, timingSafeEqual } from "node:crypto";

function geheim(): string {
  const g =
    process.env.LINK_GEHEIM ||
    process.env.NIEUWSBRIEF_GEHEIM ||
    process.env.CRON_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!g) throw new Error("Geen geheim voor ondertekende links (zet LINK_GEHEIM).");
  return g;
}

function handtekening(doel: string, id: string, verlooptOp: number, sleutel: string): string {
  return createHmac("sha256", sleutel).update(`${doel}\n${id}\n${verlooptOp}`).digest("base64url").slice(0, 32);
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
  const verwacht = Buffer.from(handtekening(doel, id, sec, sleutel));
  const gekregen = Buffer.from(m[2]);
  return verwacht.length === gekregen.length && timingSafeEqual(verwacht, gekregen);
}
