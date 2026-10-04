import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling, leesPrijsCent } from "@/lib/instellingen";
import { mollie, centenNaarBedrag } from "@/lib/mollie";
import { siteUrl } from "@/lib/site";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import { valideerCadeaubon } from "@/lib/cadeaubon/regels";

export const runtime = "nodejs";

// Start de aankoop van een cadeaubon: rij in cadeaubon_bestellingen + Mollie-betaling.
// De code en de mail volgen pas na betaling (webhook).
export async function POST(request: Request) {
  if (!(await magDoor(request, "cadeaubon", 10, 600))) return teVeelVerzoeken();
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  if (!body || typeof body !== "object") {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  // Honeypot: alleen bots vullen het verborgen veld 'website'. Doe alsof het lukt.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ checkoutUrl: `${siteUrl()}/` });
  }

  let prijsCent: number | null = null;
  try {
    prijsCent = await leesPrijsCent();
  } catch {
    prijsCent = null;
  }
  const invoer = valideerCadeaubon(body, { prijsCent });
  if (!invoer.ok) return NextResponse.json({ fout: invoer.fout }, { status: 400 });
  const v = invoer.waarde;

  const valuta = (await leesInstelling("valuta")) || "EUR";
  const supabase = adminClient();
  const { data: bon, error } = await supabase
    .from("cadeaubon_bestellingen")
    .insert({
      koper_naam: v.koperNaam,
      koper_email: v.koperEmail,
      ontvanger_naam: v.ontvangerNaam,
      ontvanger_email: v.ontvangerEmail,
      boodschap: v.boodschap,
      bezorging: v.bezorging,
      verzend_op: v.verzendOp,
      bedrag_cent: v.bedragCent,
      valuta,
      status: "aangemaakt",
    })
    .select("id")
    .single();
  if (error || !bon) {
    return NextResponse.json({ fout: "Bestelling aanmaken mislukt." }, { status: 500 });
  }

  const basis = siteUrl();
  const lokaal = basis.startsWith("http://localhost");
  try {
    const betaling = await mollie().payments.create({
      amount: { currency: valuta, value: centenNaarBedrag(v.bedragCent) },
      description: "Cadeaubon kledingadviestest – Lida Thiry",
      redirectUrl: `${basis}/cadeaubon/bedankt?bon=${bon.id}`,
      ...(lokaal ? {} : { webhookUrl: `${basis}/api/mollie/webhook` }),
      metadata: { cadeaubonId: bon.id },
    });
    await supabase.from("cadeaubon_bestellingen").update({ mollie_payment_id: betaling.id }).eq("id", bon.id);
    const checkoutUrl = betaling.getCheckoutUrl();
    if (!checkoutUrl) return NextResponse.json({ fout: "Geen betaallink ontvangen." }, { status: 502 });
    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    await supabase.from("cadeaubon_bestellingen").update({ status: "mislukt" }).eq("id", bon.id);
    console.error("Cadeaubonbetaling starten mislukt", bon.id, e);
    return NextResponse.json({ fout: "Betaling starten mislukt. Probeer het opnieuw." }, { status: 502 });
  }
}
