import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { annuleerBetaling, mollie, startBetaling } from "@/lib/mollie";
import { siteUrl } from "@/lib/site";
import { magDoor } from "@/lib/rate-limit";
import { beoordeelHervatten } from "@/lib/hervatten";
import { geefKortingsclaimVrij } from "@/lib/bestelling-betaald";
import { OPEN_STATUSSEN } from "@/lib/order-status";
import { leesInstelling } from "@/lib/instellingen";
import { betaalOmschrijving } from "@/lib/verkoop/regels";

export const runtime = "nodejs";

// Hervat de betaling van een niet-afgeronde bestelling (knop op
// /bestellen/hervat/[id]). Gewoon formulier (POST), zodat linkscanners in
// mailprogramma's geen betalingen aanmaken. Antwoordt met een 303-redirect.
export async function POST(request: Request) {
  const basis = siteUrl();
  const terug = (pad: string) => NextResponse.redirect(`${basis}${pad}`, 303);

  let id = "";
  let token = "";
  try {
    const form = await request.formData();
    id = String(form.get("id") ?? "");
    token = String(form.get("t") ?? "");
  } catch {
    return terug("/bestellen");
  }
  const pagina = `/bestellen/hervat/${encodeURIComponent(id)}?t=${encodeURIComponent(token)}`;
  if (!(await magDoor(request, "hervat", 10, 600))) return terug(pagina);

  const oordeel = await beoordeelHervatten(id, token).catch(() => ({ soort: "ongeldig" as const }));
  if (oordeel.soort !== "open") return terug(pagina);
  const order = oordeel.order;
  const supabase = adminClient();
  const bedankt = `/bestellen/bedankt?order=${order.id}`;

  // Is er al een betaling? Staat die nog open, dan die gebruiken; is die nog in
  // verwerking (pending/authorized) of al betaald, dan geen nieuwe maken.
  if (order.mollie_payment_id) {
    try {
      const bestaand = await mollie().payments.get(order.mollie_payment_id);
      if (bestaand.status === "open") {
        const url = bestaand.getCheckoutUrl();
        if (url) return NextResponse.redirect(url, 303);
      }
      if (["pending", "authorized", "paid"].includes(bestaand.status)) return terug(bedankt);
    } catch {
      // Onbekend of niet bereikbaar: gewoon een nieuwe betaling maken.
    }
  }

  // Een kortingscode/cadeaubon die (nog) niet door deze bestelling is geclaimd
  // (na een mislukte of verlopen betaling vrijgegeven), eerst opnieuw claimen.
  let zelfGeclaimd = false;
  if (order.kortingscode && !order.korting_geclaimd) {
    const { data: vlag, error: vlagFout } = await supabase
      .from("orders")
      .update({ korting_geclaimd: true })
      .eq("id", order.id)
      .eq("korting_geclaimd", false)
      .in("status", [...OPEN_STATUSSEN])
      .select("id");
    if (vlagFout || !vlag?.length) return terug(`${pagina}&fout=1`);
    const { data: geclaimd, error: claimFout } = await supabase.rpc("gebruik_kortingscode", {
      p_code: order.kortingscode,
      p_afdwingen: true,
    });
    if (claimFout || !geclaimd) {
      await supabase.from("orders").update({ korting_geclaimd: false }).eq("id", order.id);
      return terug(pagina);
    }
    zelfGeclaimd = true;
  }

  try {
    const betaling = await startBetaling({
      bedragCent: order.bedrag_cent,
      valuta: order.valuta,
      omschrijving: betaalOmschrijving(await leesInstelling("betaling_omschrijving")),
      redirectPad: bedankt,
      metadata: { orderId: order.id },
    });
    const { data: bijgewerkt, error } = await supabase
      .from("orders")
      .update({ mollie_payment_id: betaling.id, status: "aangemaakt" })
      .eq("id", order.id)
      .in("status", [...OPEN_STATUSSEN])
      .select("id");
    if (error) {
      await annuleerBetaling(betaling.id);
      throw new Error(error.message);
    }
    if (!bijgewerkt?.length) {
      // Inmiddels al betaald (bijv. een eerdere betaling kwam alsnog binnen).
      await annuleerBetaling(betaling.id);
      return terug(bedankt);
    }
    if (!betaling.checkoutUrl) return terug(pagina);
    return NextResponse.redirect(betaling.checkoutUrl, 303);
  } catch (e) {
    console.error("Betaling hervatten mislukt", order.id, e);
    if (zelfGeclaimd) await geefKortingsclaimVrij(order.id).catch(() => undefined);
    return terug(`${pagina}&fout=1`);
  }
}
