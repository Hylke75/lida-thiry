import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { mollie } from "@/lib/mollie";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { naBetaling } from "@/lib/bestelling-betaald";
import { verwerkAfspraakBetaling } from "@/lib/afspraken/data";

export const runtime = "nodejs";

// Mollie stuurt alleen de payment-id; de status halen we bij Mollie op (nooit
// op de payload vertrouwen). De verwerking is idempotent.
export async function POST(request: Request) {
  let betaalId = "";
  try {
    const form = await request.formData();
    betaalId = String(form.get("id") ?? "");
  } catch {
    const tekst = await request.text().catch(() => "");
    betaalId = new URLSearchParams(tekst).get("id") ?? "";
  }
  if (!betaalId) return NextResponse.json({ ok: true });

  const supabase = adminClient();

  let betaling;
  try {
    betaling = await mollie().payments.get(betaalId);
  } catch (e) {
    // Mollie (tijdelijk) onbereikbaar: 500 zodat Mollie de webhook later herhaalt.
    console.error("Mollie-betaling ophalen mislukt", betaalId, e);
    return NextResponse.json({ ok: false }, { status: 500 });
  }

  // Aanbetaling voor een afspraak (metadata soort 'afspraak'): eigen verwerking.
  const afspraakMeta = betaling.metadata as { soort?: string; afspraakId?: string } | null;
  if (afspraakMeta?.soort === "afspraak") {
    if (!afspraakMeta.afspraakId) return NextResponse.json({ ok: true });
    const gelukt = await verwerkAfspraakBetaling({ id: betaling.id, status: betaling.status }, afspraakMeta.afspraakId);
    return NextResponse.json({ ok: gelukt }, { status: gelukt ? 200 : 500 });
  }

  const orderId = (betaling.metadata as { orderId?: string } | null)?.orderId;
  if (!orderId) return NextResponse.json({ ok: true });

  const { data: order, error: leesFout } = await supabase
    .from("orders")
    .select("id, status, klantnaam, email")
    .eq("id", orderId)
    .maybeSingle();
  if (leesFout) return NextResponse.json({ ok: false }, { status: 500 });
  if (!order) return NextResponse.json({ ok: true });

  if (betaling.status === "paid") {
    const dagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
    const token = maakTesttoken();

    // Idempotent: alleen de eerste overgang aangemaakt -> betaald slaagt en
    // levert een rij op; herhaalde webhooks doen niets en mailen niet opnieuw.
    const { data: bijgewerkt, error: updateFout } = await supabase
      .from("orders")
      .update({
        status: "betaald",
        betaald_op: new Date().toISOString(),
        testtoken: token,
        token_verloopt_op: tokenVerlooptOp(dagen),
      })
      .eq("id", order.id)
      .eq("status", "aangemaakt")
      .select("id");
    if (updateFout) return NextResponse.json({ ok: false }, { status: 500 });

    if (bijgewerkt && bijgewerkt.length > 0) {
      // Kortingsgebruik tellen, factuur maken en bevestigingsmail met testlink
      // sturen. Gooit nooit; bij fouten krijgt de beheerder een melding (de
      // betaling blijft geldig en de bedankpagina toont de testlink ook).
      await naBetaling({ orderId: order.id, token, geldigDagen: dagen });
    }
    return NextResponse.json({ ok: true });
  }

  // Niet betaald: markeer mislukt/verlopen als de order nog openstond.
  if (["failed", "expired", "canceled"].includes(betaling.status)) {
    await supabase
      .from("orders")
      .update({ status: betaling.status === "expired" ? "verlopen" : "betaling_mislukt" })
      .eq("id", order.id)
      .eq("status", "aangemaakt");
  }

  return NextResponse.json({ ok: true });
}
