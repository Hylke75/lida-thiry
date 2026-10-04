import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { bepaalWebhookActie, controleerWebhook } from "@/lib/nieuwsbrief/webhook";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Webhook van Resend (Svix-handtekening, geheim in RESEND_WEBHOOK_SECRET).
// - email.bounced (hard): verzending krijgt gebounced_op, contact wordt 'gebounced'
// - email.complained: contact wordt 'klacht' en is daarmee afgemeld
// - de rest (delivered, opened, clicked …): niets; opens en kliks meten we zelf.
// Idempotent: Resend/Svix kan hetzelfde bericht vaker sturen.
// Mails die geen nieuwsbrief zijn (bestellingen, adviezen) hebben geen verzending
// en worden genegeerd.
export async function POST(request: Request) {
  const geheim = process.env.RESEND_WEBHOOK_SECRET?.trim();
  if (!geheim) {
    return NextResponse.json({ fout: "RESEND_WEBHOOK_SECRET niet ingesteld." }, { status: 503 });
  }

  const body = await request.text();
  const geldig = controleerWebhook(
    geheim,
    {
      id: request.headers.get("svix-id"),
      tijdstempel: request.headers.get("svix-timestamp"),
      handtekening: request.headers.get("svix-signature"),
    },
    body,
  );
  if (!geldig) return NextResponse.json({ fout: "Ongeldige handtekening." }, { status: 401 });

  let gebeurtenis: unknown;
  try {
    gebeurtenis = JSON.parse(body);
  } catch {
    return NextResponse.json({ ok: true, genegeerd: "geen JSON" });
  }
  const actie = bepaalWebhookActie(gebeurtenis);
  if (actie.soort === "negeer") return NextResponse.json({ ok: true, genegeerd: actie.reden });

  try {
    const supabase = adminClient();
    const { data: verzending, error } = await supabase
      .from("nb_verzendingen")
      .select("id, contact_id")
      .eq("resend_id", actie.emailId)
      .limit(1)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!verzending) return NextResponse.json({ ok: true, genegeerd: "geen nieuwsbriefmail" });

    const nu = new Date().toISOString();
    if (actie.soort === "bounce") {
      const v = await supabase
        .from("nb_verzendingen")
        .update({ gebounced_op: nu })
        .eq("id", verzending.id)
        .is("gebounced_op", null);
      if (v.error) throw new Error(v.error.message);
      if (verzending.contact_id) {
        // Een klacht weegt zwaarder en blijft staan.
        const c = await supabase
          .from("nb_contacten")
          .update({ status: "gebounced" })
          .eq("id", verzending.contact_id)
          .in("status", ["onbevestigd", "aangemeld", "afgemeld"]);
        if (c.error) throw new Error(c.error.message);
      }
    } else {
      const v = await supabase
        .from("nb_verzendingen")
        .update({ afgemeld_op: nu })
        .eq("id", verzending.id)
        .is("afgemeld_op", null);
      if (v.error) throw new Error(v.error.message);
      if (verzending.contact_id) {
        const c = await supabase
          .from("nb_contacten")
          .update({ status: "klacht" })
          .eq("id", verzending.contact_id)
          .neq("status", "klacht");
        if (c.error) throw new Error(c.error.message);
        const a = await supabase
          .from("nb_contacten")
          .update({ afgemeld_op: nu })
          .eq("id", verzending.contact_id)
          .is("afgemeld_op", null);
        if (a.error) throw new Error(a.error.message);
      }
    }
    return NextResponse.json({ ok: true, verwerkt: actie.soort });
  } catch (e) {
    // 500: Resend probeert het later opnieuw.
    console.error("Resend-webhook verwerken mislukt", actie, e);
    return NextResponse.json({ fout: "Verwerken mislukt." }, { status: 500 });
  }
}
