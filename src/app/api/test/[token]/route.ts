import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { beoordeelToken } from "@/lib/test-order";
import { verwerkTest, type TestInvoer } from "@/lib/test-verwerking";
import { leverAdvies } from "@/lib/advies-leveren";
import type { ZandloperVariant } from "@/rekenkern/config/ffit-regels";

export const runtime = "nodejs";
export const maxDuration = 60;

function getal(v: unknown): number | undefined {
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const beoordeling = await beoordeelToken(token);
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

  const variant = ((await leesInstelling("zandloper_variant")) || "ffit") as ZandloperVariant;
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
  await supabase.from("testresultaten").upsert(
    {
      order_id: order.id,
      lengte_cm: Math.round(invoer.lengte_cm),
      gewicht_kg: Math.round(invoer.gewicht_kg),
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

  // Definitief type.
  await supabase
    .from("orders")
    .update({
      status: "test_afgerond",
      toegekend_type: uitkomst.sleutel,
      afgerond_op: new Date().toISOString(),
    })
    .eq("id", order.id)
    .eq("status", "betaald");

  // PDF genereren, mailen en op 'advies_verzonden' zetten. Faalt stil als het
  // adviesdocument nog niet geïmporteerd is (dan blijft de order 'test_afgerond').
  let pdfKlaar = false;
  try {
    pdfKlaar = await leverAdvies(order.id);
  } catch {
    // PDF of mail mislukt: order blijft test_afgerond, kan later opnieuw.
  }

  return NextResponse.json({ soort: "type", sleutel: uitkomst.sleutel, pdfKlaar });
}
