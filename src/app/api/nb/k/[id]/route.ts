import { after } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { klopt, UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Kliklink in nieuwsbrieven: /api/nb/k/<verzending>?u=<doel>&s=<handtekening>.
// Alleen met een geldige handtekening sturen we door naar het doel (anders zou dit
// een open redirect zijn); anders naar de homepage. De klik wordt ná het antwoord
// geregistreerd (after). HEAD-verzoeken (linkcontroles) tellen niet.

function doorsturen(url: string): Response {
  return new Response(null, {
    status: 302,
    headers: {
      Location: url,
      "Cache-Control": "no-store",
      "X-Robots-Tag": "noindex",
      "Referrer-Policy": "no-referrer-when-downgrade",
    },
  });
}

function home(): Response {
  return doorsturen(`${siteUrl()}/`);
}

/** Het doel als de link geldig is, anders null. Gooit nooit. */
function geldigDoel(id: string, request: Request): string | null {
  try {
    if (!UUID_PATROON.test(id)) return null;
    const zoek = new URL(request.url).searchParams;
    const u = zoek.get("u");
    const s = zoek.get("s");
    if (!u || !s || u.length > 2000) return null;
    const doel = new URL(u);
    if (doel.protocol !== "http:" && doel.protocol !== "https:") return null;
    if (!klopt(id, u, s)) return null;
    return u;
  } catch {
    return null;
  }
}

async function verwerk(request: Request, params: Promise<{ id: string }>, registreer: boolean): Promise<Response> {
  let id = "";
  try {
    id = (await params).id.toLowerCase();
  } catch {
    return home();
  }
  const doel = geldigDoel(id, request);
  if (!doel) return home();
  if (registreer) {
    after(async () => {
      try {
        const { error } = await adminClient().rpc("nb_registreer_klik", { p_verzending: id, p_url: doel });
        if (error) console.error("Klik registreren mislukt", id, error.message);
      } catch (e) {
        console.error("Klik registreren mislukt", id, e);
      }
    });
  }
  return doorsturen(doel);
}

export function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return verwerk(request, params, true);
}

export function HEAD(request: Request, { params }: { params: Promise<{ id: string }> }) {
  return verwerk(request, params, false);
}
