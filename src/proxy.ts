import { NextResponse, type NextFetchEvent, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";
import { haalIndex, telGebruik } from "@/lib/doorverwijzingen/cache";
import { doelAdres, isGereserveerd, statusCode, zoek } from "@/lib/doorverwijzingen/regels";

/**
 * Doorverwijzingen (Beheer → Website → Doorverwijzingen): één stap, 308 of 307.
 * Alleen GET/HEAD en nooit onder /admin, /api, /auth of /_next. Lukt het laden
 * van de tabel niet, dan gaat het verzoek gewoon door (fail open).
 */
async function doorverwijzing(request: NextRequest, event: NextFetchEvent): Promise<NextResponse | null> {
  if (request.method !== "GET" && request.method !== "HEAD") return null;
  const { pathname, search } = request.nextUrl;
  if (pathname === "/" || isGereserveerd(pathname)) return null;
  try {
    const regel = zoek(await haalIndex(), pathname);
    if (!regel) return null;
    // Na het antwoord tellen; een prefetch van de browser is geen bezoek. (De
    // prefetch-headers van de Next-router zelf haalt Next weg vóór de proxy.)
    const prefetch = /prefetch/i.test(request.headers.get("sec-purpose") ?? request.headers.get("purpose") ?? "");
    if (!prefetch) event.waitUntil(telGebruik(regel.van));
    const doel = new URL(doelAdres(regel.naar, search), request.url);
    return NextResponse.redirect(doel, statusCode(regel.permanent));
  } catch (e) {
    console.error("doorverwijzingen: overgeslagen", e);
    return null;
  }
}

export async function proxy(request: NextRequest, event: NextFetchEvent) {
  const omleiding = await doorverwijzing(request, event);
  if (omleiding) return omleiding;
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Alle paden behalve:
     * - _next/static (statische bestanden)
     * - _next/image (beeldoptimalisatie)
     * - favicon.ico en veelvoorkomende beeldextensies
     * - api/nb/ (nieuwsbrief: openpixel, kliklinks, afmelden, webhook; zonder
     *   inlog en moeten snel zijn, dus geen sessie-verversing)
     */
    "/((?!_next/static|_next/image|api/nb/|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
