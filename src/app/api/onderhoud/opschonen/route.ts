import { NextResponse } from "next/server";
import { adminClient } from "@/lib/supabase/admin";
import { leesInstelling } from "@/lib/instellingen";
import { leverAdvies } from "@/lib/advies-leveren";
import { stuurHerinneringMail } from "@/lib/resend";
import { stuurBeheerMelding, foutTekst } from "@/lib/beheermelding";
import { nodigUitVoorReviews } from "@/lib/reviews/uitnodigen";
import { stuurBetaalherinneringen } from "@/lib/betaalherinnering";
import { verstuurGeplandeCadeaubonnen } from "@/lib/cadeaubon/verwerken";
import { stuurAfspraakHerinneringen } from "@/lib/afspraken/data";
import { ruimLogboekOp } from "@/lib/beheer-log";

const HERINNERING_NA_DAGEN = 3;

export const runtime = "nodejs";
export const maxDuration = 300;

// Geplande opschoning (Vercel-cron): anonimiseert lichaamsmaten ouder dan de
// bewaartermijn, levert adviezen opnieuw waarvan de PDF of mail eerder mislukte en
// stuurt een herinnering als een betaalde test na enkele dagen nog niet is gedaan.
// Blijven er problemen over, dan gaat er één samenvattende beheermelding uit.
// Beveiligd met CRON_SECRET (Vercel stuurt Authorization: Bearer ...).
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) {
    return NextResponse.json({ fout: "CRON_SECRET niet ingesteld." }, { status: 503 });
  }
  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${geheim}`) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }

  const dagen = Number((await leesInstelling("bewaartermijn_maten_dagen")) || "30");
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("anonimiseer_oude_maten", { dagen });
  // Oude rate-limitvensters opruimen; een fout hier mag de rest niet tegenhouden.
  await supabase.rpc("opschonen_rate_limits").then(
    () => undefined,
    () => undefined,
  );
  if (error) {
    return NextResponse.json({ fout: error.message }, { status: 500 });
  }

  // Afgeronde tests zonder verzonden advies (ouder dan 10 minuten) opnieuw leveren.
  const { data: open } = await supabase
    .from("orders")
    .select("id")
    .eq("status", "test_afgerond")
    .lt("afgerond_op", new Date(Date.now() - 10 * 60 * 1000).toISOString());
  let opnieuwGeleverd = 0;
  const adviesProblemen: string[] = [];
  for (const o of open ?? []) {
    try {
      if (await leverAdvies(o.id)) opnieuwGeleverd++;
      else adviesProblemen.push(`${o.id}: advies (nog) niet te maken (ontbreekt het adviesdocument?)`);
    } catch (e) {
      console.error("Opnieuw leveren mislukt", o.id, e);
      adviesProblemen.push(`${o.id}: ${foutTekst(e)}`);
    }
  }

  const herinnering = await stuurHerinneringen(supabase);
  // Klanten een paar dagen na hun advies om een review vragen (gooit niet).
  const reviews = await nodigUitVoorReviews(supabase);
  // Eigen beheermeldingen bij fouten; gooien nooit.
  const betaalherinneringen = await stuurBetaalherinneringen();
  const cadeaubonnen = await verstuurGeplandeCadeaubonnen();
  // Afspraken van morgen: herinnering aan de klant (gooit nooit).
  const afspraakHerinnering = await stuurAfspraakHerinneringen();
  herinnering.mislukt.push(...afspraakHerinnering.mislukt);
  // Logboek van beheeracties: regels ouder dan 2 jaar weg (gooit nooit).
  const logboekOpgeruimd = await ruimLogboekOp();

  const nogOpen = (open?.length ?? 0) - opnieuwGeleverd;
  if (nogOpen > 0 || herinnering.mislukt.length > 0 || reviews.mislukt.length > 0) {
    const delen: string[] = [];
    if (nogOpen > 0) {
      delen.push(
        `${nogOpen} afgeronde test(s) zonder verzonden advies:\n${adviesProblemen.map((r) => `- ${r}`).join("\n")}`,
      );
    }
    if (herinnering.mislukt.length > 0) {
      delen.push(
        `${herinnering.mislukt.length} herinneringsmail(s) mislukt:\n${herinnering.mislukt.map((r) => `- ${r}`).join("\n")}`,
      );
    }
    if (reviews.mislukt.length > 0) {
      delen.push(
        `${reviews.mislukt.length} review-uitnodiging(en) mislukt:\n${reviews.mislukt.map((r) => `- ${r}`).join("\n")}`,
      );
    }
    await stuurBeheerMelding("Nachtelijke controle: actie nodig", delen.join("\n\n"));
  }

  return NextResponse.json({
    ok: true,
    geanonimiseerd: data ?? 0,
    bewaartermijn_dagen: dagen,
    opnieuw_geleverd: opnieuwGeleverd,
    nog_open: nogOpen,
    herinneringen_verstuurd: herinnering.verstuurd,
    herinneringen_mislukt: herinnering.mislukt.length,
    reviews_uitgenodigd: reviews.verstuurd,
    reviews_mislukt: reviews.mislukt.length,
    betaalherinneringen,
    cadeaubonnen,
    afspraak_herinneringen_verstuurd: afspraakHerinnering.verstuurd,
    logboek_opgeruimd: logboekOpgeruimd,
  });
}

/**
 * Herinnering voor betaalde orders waarvan de test na enkele dagen nog niet is
 * gedaan (eenmalig per order, alleen zolang de testlink geldig is). Gratis
 * testbestellingen (€ 0 zonder kortingscode) worden overgeslagen.
 */
async function stuurHerinneringen(
  supabase: ReturnType<typeof adminClient>,
): Promise<{ verstuurd: number; mislukt: string[] }> {
  const mislukt: string[] = [];
  let verstuurd = 0;
  const nu = new Date();
  const grens = new Date(nu.getTime() - HERINNERING_NA_DAGEN * 24 * 60 * 60 * 1000);

  const { data: orders, error } = await supabase
    .from("orders")
    .select("id, klantnaam, email, testtoken, token_verloopt_op, bedrag_cent, kortingscode")
    .eq("status", "betaald")
    .is("herinnering_verzonden_op", null)
    .lt("betaald_op", grens.toISOString())
    .gt("token_verloopt_op", nu.toISOString())
    .not("testtoken", "is", null)
    .limit(200);
  if (error) {
    return { verstuurd, mislukt: [`Orders ophalen mislukt: ${error.message}`] };
  }

  for (const o of orders ?? []) {
    if (!o.bedrag_cent && !o.kortingscode) continue; // gratis testbestelling
    try {
      await stuurHerinneringMail({
        naam: o.klantnaam,
        email: o.email,
        token: o.testtoken,
        verlooptOp: o.token_verloopt_op,
      });
      const { error: e } = await supabase
        .from("orders")
        .update({ herinnering_verzonden_op: new Date().toISOString() })
        .eq("id", o.id);
      if (e) mislukt.push(`${o.id}: verstuurd, maar niet gemarkeerd (${e.message})`);
      verstuurd++;
    } catch (e) {
      console.error("Herinnering mislukt", o.id, e);
      mislukt.push(`${o.id} (${o.email}): ${foutTekst(e)}`);
    }
  }
  return { verstuurd, mislukt };
}
