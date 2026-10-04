import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
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
