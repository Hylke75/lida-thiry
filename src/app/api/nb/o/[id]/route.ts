import { after } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Openpixel in nieuwsbrieven: altijd direct een doorzichtige 1×1-GIF terug; het
// registreren gebeurt ná het antwoord (after), zodat de mail nooit wacht en een
// databasefout de lezer niet raakt. HEAD-verzoeken (controles, prefetchers) tellen niet.

const GIF = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

function pixel(): Response {
  return new Response(new Uint8Array(GIF), {
    status: 200,
    headers: {
      "Content-Type": "image/gif",
      "Content-Length": String(GIF.length),
      "Cache-Control": "no-store, no-cache, must-revalidate, private, max-age=0",
      Pragma: "no-cache",
      Expires: "0",
      "X-Robots-Tag": "noindex",
    },
  });
}

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const verzending = id.replace(/\.gif$/i, "").toLowerCase();
    if (UUID_PATROON.test(verzending)) {
      after(async () => {
        try {
          const { error } = await adminClient().rpc("nb_registreer_open", { p_verzending: verzending });
          if (error) console.error("Open registreren mislukt", verzending, error.message);
        } catch (e) {
          console.error("Open registreren mislukt", verzending, e);
        }
      });
    }
  } catch (e) {
    console.error("Openpixel", e);
  }
  return pixel();
}

export function HEAD() {
  return pixel();
}
