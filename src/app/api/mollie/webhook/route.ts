import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { mollie } from "@/lib/mollie";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { stuurTestlinkMail } from "@/lib/resend";

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
      try {
        await stuurTestlinkMail({
          naam: order.klantnaam,
          email: order.email,
          token,
          geldigDagen: dagen,
        });
      } catch (e) {
        // Mail mislukt: betaling blijft geldig; de bedankpagina toont de testlink ook.
        console.error("Testlink-mail mislukt", order.id, e);
      }
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
