import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { valideerAbonnement } from "@/lib/push/regels";

export const runtime = "nodejs";

/**
 * De service worker (public/sw.js) meldt hier een door de browser vernieuwd
 * pushabonnement (pushsubscriptionchange). Geen sessie nodig: alleen wie het oude,
 * geheime adres kent, kan het bijbehorende abonnement bijwerken.
 */
export async function POST(request: Request) {
  if (!(await magDoor(request, "push-vernieuw", 10, 600))) return teVeelVerzoeken();
  let body: { oudEndpoint?: unknown; abonnement?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  const v = valideerAbonnement(body?.abonnement);
  if (typeof body?.oudEndpoint !== "string" || !body.oudEndpoint || !v.ok) {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  const { error } = await adminClient()
    .from("push_abonnementen")
    .update({ endpoint: v.abonnement.endpoint, p256dh: v.abonnement.p256dh, auth: v.abonnement.auth })
    .eq("endpoint", body.oudEndpoint);
  if (error) {
    console.error("Pushabonnement vernieuwen mislukt", error.message);
    return NextResponse.json({ fout: "Opslaan mislukt." }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
