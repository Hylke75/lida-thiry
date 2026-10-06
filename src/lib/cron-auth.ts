import { createHash, timingSafeEqual } from "node:crypto";

/**
 * Of het verzoek de juiste cron-sleutel meestuurt (Vercel stuurt
 * `Authorization: Bearer <CRON_SECRET>`). Vergelijkt in constante tijd (via
 * SHA-256, zodat ook de lengte niets prijsgeeft). Zonder ingesteld geheim is
 * niets geldig.
 */
export function isGeldigeCron(request: Request, geheim: string | undefined = process.env.CRON_SECRET): boolean {
  if (!geheim) return false;
  const gekregen = request.headers.get("authorization") ?? "";
  const hash = (s: string) => createHash("sha256").update(s).digest();
  return timingSafeEqual(hash(gekregen), hash(`Bearer ${geheim}`));
}
