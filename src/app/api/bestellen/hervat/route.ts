import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { mollie, centenNaarBedrag } from "@/lib/mollie";
import { siteUrl } from "@/lib/site";
import { magDoor } from "@/lib/rate-limit";
import { beoordeelHervatten } from "@/lib/hervatten";

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

  // Staat de vorige betaling nog open bij Mollie? Dan die gebruiken.
  if (order.status === "aangemaakt" && order.mollie_payment_id) {
    try {
      const bestaand = await mollie().payments.get(order.mollie_payment_id);
      const url = bestaand.status === "open" ? bestaand.getCheckoutUrl() : null;
      if (url) return NextResponse.redirect(url, 303);
    } catch {
      // Onbekend of niet bereikbaar: gewoon een nieuwe betaling maken.
    }
  }

  const lokaal = basis.startsWith("http://localhost");
  try {
    const betaling = await mollie().payments.create({
      amount: { currency: order.valuta || "EUR", value: centenNaarBedrag(order.bedrag_cent) },
      description: "Kledingadviestest – Lida Thiry",
      redirectUrl: `${basis}/bestellen/bedankt?order=${order.id}`,
      ...(lokaal ? {} : { webhookUrl: `${basis}/api/mollie/webhook` }),
      metadata: { orderId: order.id },
    });
    const { error } = await supabase
      .from("orders")
      .update({ mollie_payment_id: betaling.id, status: "aangemaakt" })
      .eq("id", order.id)
      .in("status", ["aangemaakt", "verlopen", "betaling_mislukt"]);
    if (error) throw new Error(error.message);
    const url = betaling.getCheckoutUrl();
    if (!url) return terug(pagina);
    return NextResponse.redirect(url, 303);
  } catch (e) {
    console.error("Betaling hervatten mislukt", order.id, e);
    return terug(`${pagina}&fout=1`);
  }
}
