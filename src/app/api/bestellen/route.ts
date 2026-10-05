import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { annuleerBetaling, startBetaling } from "@/lib/mollie";
import { maakTesttoken, tokenVerlooptOp } from "@/lib/tokens";
import { siteUrl } from "@/lib/site";
import { magDoor, teVeelVerzoeken } from "@/lib/rate-limit";
import {
  berekenKorting,
  controleerKortingscode,
  normaliseerCode,
  schoonFactuurgegevens,
  type Kortingscode,
} from "@/lib/prijs";
import { geefKortingsclaimVrij, naBetaling, nieuwsbriefNaBetaling } from "@/lib/bestelling-betaald";
import { gratisTestAan } from "@/lib/order-status";

export const runtime = "nodejs";

interface BestelInvoer {
  klantnaam?: string;
  email?: string;
  factuurgegevens?: Record<string, unknown>;
  voorwaarden_akkoord?: boolean;
  directe_levering_akkoord?: boolean;
  gratis?: boolean;
  website?: string;
  kortingscode?: string;
  nieuwsbrief?: boolean;
}

function geldigEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export async function POST(request: Request) {
  if (!(await magDoor(request, "bestellen", 10, 600))) return teVeelVerzoeken();
  let body: BestelInvoer;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });
  }
  // Honeypot: alleen bots vullen het verborgen veld 'website'. Doe alsof het lukt.
  if (typeof body.website === "string" && body.website.trim() !== "") {
    return NextResponse.json({ checkoutUrl: `${siteUrl()}/` });
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
  // Vinkje voor de nieuwsbrief (standaard uit); aanmelden gebeurt pas na betaling.
  const nieuwsbrief = body.nieuwsbrief === true ? { nieuwsbrief_akkoord: true } : {};
  // Alleen adres/postcode/plaats/land als (begrensde) tekst bewaren.
  const factuurgegevens = schoonFactuurgegevens(body.factuurgegevens);

  // Gratis testmodus (env-gated): sla Mollie over, maak direct een betaalde order
  // met testtoken aan en stuur de gebruiker rechtstreeks naar de test.
  if (body.gratis === true && gratisTestAan()) {
    const supabase = adminClient();
    const dagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
    const token = maakTesttoken();
    const { data: order, error } = await supabase
      .from("orders")
      .insert({
        klantnaam: naam,
        email,
        factuurgegevens,
        voorwaarden_akkoord: true,
        directe_levering_akkoord: true,
        ...nieuwsbrief,
        bedrag_cent: 0,
        valuta,
        status: "betaald",
        betaald_op: new Date().toISOString(),
        // Geen afhandeling na betaling (geen mails) in de gratis testmodus.
        nabetaling_klaar_op: new Date().toISOString(),
        testtoken: token,
        token_verloopt_op: tokenVerlooptOp(dagen),
      })
      .select("id")
      .single();
    if (error || !order) {
      return NextResponse.json({ fout: "Testbestelling aanmaken mislukt." }, { status: 500 });
    }
    // Geen mails in de gratis testmodus, maar wel hetzelfde nieuwsbriefgedrag als na betaling.
    await nieuwsbriefNaBetaling(order.id);
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

  // Kortingscode of cadeaubon (optioneel): altijd server-side valideren.
  const ingevoerdeCode = normaliseerCode(String(body.kortingscode ?? ""));
  let kortingscode: string | null = null;
  let kortingCent = 0;
  let teBetalenCent = prijsCent;
  if (ingevoerdeCode) {
    const { data: codeRij, error: codeFout } = await supabase
      .from("kortingscodes")
      .select("code, soort, waarde, geldig_tot, max_gebruik, aantal_gebruikt, actief")
      .eq("code", ingevoerdeCode)
      .maybeSingle();
    if (codeFout) {
      return NextResponse.json({ fout: "Kortingscode controleren mislukt." }, { status: 500 });
    }
    const reden = controleerKortingscode(codeRij as Kortingscode | null);
    if (reden) return NextResponse.json({ fout: reden }, { status: 400 });
    const berekend = berekenKorting(prijsCent, codeRij as Kortingscode);
    kortingscode = (codeRij as Kortingscode).code;
    kortingCent = berekend.kortingCent;
    teBetalenCent = berekend.eindbedragCent;
  }

  // Gebruik van de code atomair claimen bij het aanmaken (ook als er nog een
  // restbedrag via Mollie volgt), zodat een eenmalige code/cadeaubon maar één
  // keer werkt. Mislukt of verloopt de betaling, dan geeft de webhook de claim vrij.
  if (kortingscode) {
    const { data: geclaimd, error: claimFout } = await supabase.rpc("gebruik_kortingscode", {
      p_code: kortingscode,
      p_afdwingen: true,
    });
    if (claimFout) {
      return NextResponse.json({ fout: "Kortingscode verwerken mislukt." }, { status: 500 });
    }
    if (!geclaimd) {
      return NextResponse.json({ fout: "Deze kortingscode is al gebruikt." }, { status: 400 });
    }
  }
  const claim = kortingscode ? { korting_geclaimd: true } : {};

  // Volledig betaald met korting/cadeaubon: geen Mollie, direct een betaalde order.
  if (teBetalenCent === 0 && kortingscode) {
    const dagen = Number((await leesInstelling("token_geldigheid_dagen")) || "30");
    const token = maakTesttoken();
    const { data: gratisOrder, error: gratisFout } = await supabase
      .from("orders")
      .insert({
        klantnaam: naam,
        email,
        factuurgegevens,
        voorwaarden_akkoord: true,
        directe_levering_akkoord: true,
        ...nieuwsbrief,
        bedrag_cent: 0,
        korting_cent: kortingCent,
        kortingscode,
        ...claim,
        valuta,
        status: "betaald",
        betaald_op: new Date().toISOString(),
        nabetaling_poging_op: new Date().toISOString(),
        testtoken: token,
        token_verloopt_op: tokenVerlooptOp(dagen),
      })
      .select("id")
      .single();
    if (gratisFout || !gratisOrder) {
      await supabase.rpc("geef_kortingscode_vrij", { p_code: kortingscode });
      return NextResponse.json({ fout: "Bestelling aanmaken mislukt." }, { status: 500 });
    }
    // Bevestigingsmail met testlink (geen factuur bij € 0). Gooit nooit.
    await naBetaling({ orderId: gratisOrder.id, geldigDagen: dagen });
    return NextResponse.json({ testUrl: `${siteUrl()}/test/${token}` });
  }

  const { data: order, error: e1 } = await supabase
    .from("orders")
    .insert({
      klantnaam: naam,
      email,
      factuurgegevens,
      voorwaarden_akkoord: true,
      directe_levering_akkoord: true,
      ...nieuwsbrief,
      bedrag_cent: teBetalenCent,
      korting_cent: kortingCent,
      kortingscode,
      ...claim,
      valuta,
      status: "aangemaakt",
    })
    .select("id")
    .single();

  if (e1 || !order) {
    if (kortingscode) await supabase.rpc("geef_kortingscode_vrij", { p_code: kortingscode });
    return NextResponse.json({ fout: "Bestelling aanmaken mislukt." }, { status: 500 });
  }

  let betaalId: string | null = null;
  try {
    const betaling = await startBetaling({
      bedragCent: teBetalenCent,
      valuta,
      omschrijving: "Kledingadviestest – Lida Thiry",
      redirectPad: `/bestellen/bedankt?order=${order.id}`,
      metadata: { orderId: order.id },
    });
    betaalId = betaling.id;

    const { error: idFout } = await supabase
      .from("orders")
      .update({ mollie_payment_id: betaling.id })
      .eq("id", order.id);
    if (idFout) throw new Error(`Betaling koppelen mislukt: ${idFout.message}`);

    if (!betaling.checkoutUrl) throw new Error("Geen betaallink ontvangen.");
    return NextResponse.json({ checkoutUrl: betaling.checkoutUrl });
  } catch (e) {
    console.error("Betaling starten mislukt", order.id, e);
    if (betaalId) await annuleerBetaling(betaalId);
    await supabase
      .from("orders")
      .update({ status: "betaling_mislukt" })
      .eq("id", order.id)
      .eq("status", "aangemaakt");
    await geefKortingsclaimVrij(order.id).catch((fout) => console.error("Kortingsclaim vrijgeven mislukt", order.id, fout));
    return NextResponse.json({ fout: "Betaling starten mislukt. Probeer het opnieuw." }, { status: 502 });
  }
}
