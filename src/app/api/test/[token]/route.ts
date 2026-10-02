import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { beoordeelToken } from "@/lib/test-order";
import { verwerkTest, type TestInvoer } from "@/lib/test-verwerking";
import { leverAdvies } from "@/lib/advies-leveren";
import {
  STANDAARD_ZANDLOPER_VARIANT,
  type ZandloperVariant,
} from "@/rekenkern/config/ffit-regels";
import { SILHOUETTEN } from "@/lib/test-config";

export const runtime = "nodejs";
export const maxDuration = 60;

/** Hele centimeters/kilo's (de database slaat gehele getallen op). */
function getal(v: unknown): number | undefined {
  if (v === null || v === undefined || v === "") return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const beoordeling = await beoordeelToken(token);
  // Al afgerond (bijv. opnieuw verstuurd na een weggevallen verbinding): geef het
  // eerdere resultaat terug in plaats van een foutmelding.
  if (beoordeling.toestand === "al_afgerond" && beoordeling.order.toegekend_type) {
    return NextResponse.json({ soort: "type", sleutel: beoordeling.order.toegekend_type });
  }
  if (beoordeling.toestand !== "geldig") {
    return NextResponse.json({ fout: "Deze testlink is niet (meer) bruikbaar." }, { status: 403 });
  }
  const order = beoordeling.order;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ fout: "Ongeldige aanvraag." }, { status: 400 });

  const lengte = getal(body.lengte_cm);
  const gewicht = getal(body.gewicht_kg);
  const m = (body.maten ?? {}) as Record<string, unknown>;
  const borst = getal(m.borst);
  const taille = getal(m.taille);
  const hogeHeup = getal(m.hoge_heup);
  const heup = getal(m.heup);

  if ([lengte, gewicht, borst, taille, hogeHeup, heup].some((v) => v === undefined)) {
    return NextResponse.json({ fout: "Vul lengte, gewicht en alle verplichte maten in." }, { status: 400 });
  }
  if (lengte! < 120 || lengte! > 220 || gewicht! < 30 || gewicht! > 250) {
    return NextResponse.json(
      { fout: "Controleer je lengte (in cm) en gewicht (in kg)." },
      { status: 400 },
    );
  }
  if (!SILHOUETTEN.some((s) => s.letter === body.gekozen_silhouet)) {
    return NextResponse.json({ fout: "Kies een silhouet." }, { status: 400 });
  }

  const invoer: TestInvoer = {
    lengte_cm: lengte!,
    gewicht_kg: gewicht!,
    maten: {
      borst: borst!,
      taille: taille!,
      hogeHeup: hogeHeup!,
      heup: heup!,
      binnenbeen: getal(m.binnenbeen),
      schouder: getal(m.schouder),
    },
    controlemetingen: {
      borst: getal((body.controlemetingen as Record<string, unknown>)?.borst),
      taille: getal((body.controlemetingen as Record<string, unknown>)?.taille),
      hoge_heup: getal((body.controlemetingen as Record<string, unknown>)?.hoge_heup),
      heup: getal((body.controlemetingen as Record<string, unknown>)?.heup),
    },
    gekozen_silhouet: body.gekozen_silhouet as TestInvoer["gekozen_silhouet"],
    pasvormantwoorden: (body.pasvormantwoorden ?? {}) as Record<string, string>,
    hermeting: body.hermeting === true,
  };

  const variant = ((await leesInstelling("zandloper_variant")) ||
    STANDAARD_ZANDLOPER_VARIANT) as ZandloperVariant;
  const uitkomst = verwerkTest(invoer, variant);

  // Tussenstappen: niets opslaan.
  if (uitkomst.soort === "opnieuw_meten") {
    return NextResponse.json({ soort: "opnieuw_meten", bevindingen: uitkomst.bevindingen });
  }
  if (uitkomst.soort === "silhouet_verschil") {
    return NextResponse.json({ soort: "silhouet_verschil" });
  }

  const supabase = adminClient();
  const categorie = uitkomst.categorie;

  // Testresultaat opslaan (één per order dankzij de unieke order_id).
  const { error: opslagFout } = await supabase.from("testresultaten").upsert(
    {
      order_id: order.id,
      lengte_cm: invoer.lengte_cm,
      gewicht_kg: invoer.gewicht_kg,
      categorie,
      borst: invoer.maten.borst,
      taille: invoer.maten.taille,
      hoge_heup: invoer.maten.hogeHeup,
      heup: invoer.maten.heup,
      binnenbeen: invoer.maten.binnenbeen ?? null,
      schouder: invoer.maten.schouder ?? null,
      controlemetingen: invoer.controlemetingen,
      gekozen_silhouet: invoer.gekozen_silhouet,
      pasvormantwoorden: invoer.pasvormantwoorden,
      ffit_type: uitkomst.ffit_type,
      letter: uitkomst.letter,
    },
    { onConflict: "order_id" },
  );
  if (opslagFout) {
    return NextResponse.json(
      { fout: "Opslaan van je antwoorden mislukte. Probeer het opnieuw." },
      { status: 500 },
    );
  }

  // Definitief type. Alleen de eerste overgang betaald -> test_afgerond telt,
  // zodat een dubbele verzending niet twee keer een advies mailt.
  const { data: bijgewerkt, error: orderFout } = await supabase
    .from("orders")
    .update({
      status: "test_afgerond",
      toegekend_type: uitkomst.sleutel,
      afgerond_op: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "betaald")
    .select("id");
  if (orderFout) {
    return NextResponse.json({ fout: "Afronden mislukte. Probeer het opnieuw." }, { status: 500 });
  }
  if (!bijgewerkt?.length) {
    return NextResponse.json({ soort: "type", sleutel: uitkomst.sleutel });
  }

  // PDF genereren, mailen en op 'advies_verzonden' zetten. Mislukt dat, dan blijft
  // de order 'test_afgerond' en probeert de nachtelijke cron het opnieuw.
  let pdfKlaar = false;
  try {
    pdfKlaar = await leverAdvies(order.id);
  } catch (e) {
    console.error("Advies leveren mislukt", order.id, e);
  }

  return NextResponse.json({ soort: "type", sleutel: uitkomst.sleutel, pdfKlaar });
}
