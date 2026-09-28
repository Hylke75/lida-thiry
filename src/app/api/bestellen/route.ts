import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { mollie, centenNaarBedrag } from "@/lib/mollie";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { siteUrl } from "@/lib/site";

export const runtime = "nodejs";

interface BestelInvoer {
  klantnaam?: string;
  email?: string;
  factuurgegevens?: Record<string, unknown>;
  voorwaarden_akkoord?: boolean;
  directe_levering_akkoord?: boolean;
  gratis?: boolean;
}

function geldigEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  let body: BestelInvoer;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }

  const naam = (body.klantnaam ?? "").trim();
  const email = (body.email ?? "").trim().toLowerCase();

  if (naam.length < 2) {
    return NextResponse.json({ fout: "Vul je naam in." }, { status: 400 });
  }
  if (!geldigEmail(email)) {
    return NextResponse.json({ fout: "Vul een geldig e-mailadres in." }, { status: 400 });
  }
  if (!body.voorwaarden_akkoord) {
    return NextResponse.json({ fout: "Akkoord met de voorwaarden is verplicht." }, { status: 400 });
  }
  if (!body.directe_levering_akkoord) {
    return NextResponse.json(
      { fout: "Instemming met directe levering van digitale inhoud is verplicht." },
      { status: 400 },
    );
  }

  const valuta = (await leesInstelling("valuta")) || "EUR";

  // Gratis testmodus (env-gated): sla Mollie over, maak direct een betaalde order
  // met testtoken aan en stuur de gebruiker rechtstreeks naar de test.
  if (body.gratis === true && process.env.GRATIS_TEST) {
    const supabase = adminClient();
    const dagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
    const token = maakTesttoken();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        klantnaam: naam,
        email,
        factuurgegevens: body.factuurgegevens ?? {},
        voorwaarden_akkoord: true,
        directe_levering_akkoord: true,
        bedrag_cent: 0,
        valuta,
        status: "betaald",
        betaald_op: new Date().toISOString(),
        testtoken: token,
        token_verloopt_op: tokenVerlooptOp(dagen),
      })
      .select("id")
      .single();
    if (error || !order) {
      return NextResponse.json({ fout: "Testbestelling aanmaken mislukt." }, { status: 500 });
    }
    return NextResponse.json({ testUrl: `${siteUrl()}/test/${token}` });
  }

  const prijsCent = await leesPrijsCent();
  if (!prijsCent) {
    return NextResponse.json(
      { fout: "De prijs is nog niet ingesteld. Neem contact op met de beheerder." },
      { status: 409 },
    );
  }

  const supabase = adminClient();
  const { data: order, error: e1 } = await supabase
    .from("orders")
    .insert({
      klantnaam: naam,
      email,
      factuurgegevens: body.factuurgegevens ?? {},
      voorwaarden_akkoord: true,
      directe_levering_akkoord: true,
      bedrag_cent: prijsCent,
      valuta,
      status: "aangemaakt",
    })
    .select("id")
    .single();

  if (e1 || !order) {
    return NextResponse.json({ fout: "Bestelling aanmaken mislukt." }, { status: 500 });
  }

  const basis = siteUrl();
  const lokaal = basis.startsWith("http://localhost");

  try {
    const betaling = await mollie().payments.create({
      amount: { currency: valuta, value: centenNaarBedrag(prijsCent) },
      description: "Kledingadviestest – Lida Thiry",
      redirectUrl: `${basis}/bestellen/bedankt?order=${order.id}`,
      // Mollie weigert een niet-bereikbare (localhost) webhook: lokaal weglaten.
      ...(lokaal ? {} : { webhookUrl: `${basis}/api/mollie/webhook` }),
      metadata: { orderId: order.id },
    });

    await supabase
      .from("orders")
      .update({ mollie_payment_id: betaling.id })
      .eq("id", order.id);

    const checkoutUrl = betaling.getCheckoutUrl();
    if (!checkoutUrl) {
      return NextResponse.json({ fout: "Geen betaallink ontvangen." }, { status: 502 });
    }
    return NextResponse.json({ checkoutUrl });
  } catch (e) {
    await supabase
      .from("orders")
      .update({ status: "betaling_mislukt" })
      .eq("id", order.id);
    const bericht = e instanceof Error ? e.message : "Betaling starten mislukt.";
    return NextResponse.json({ fout: bericht }, { status: 502 });
  }
}
