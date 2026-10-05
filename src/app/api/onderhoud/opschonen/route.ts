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
import { registreerFout } from "@/lib/fouten/registreer";
import { ruimLogboekOp } from "@/lib/beheer-log";
import { herstelNaBetalingen } from "@/lib/bestelling-betaald";
import { isGeldigeCron } from "@/lib/cron-auth";

const HERINNERING_NA_DAGEN = 3;

export const runtime = "nodejs";
export const maxDuration = 300;

// Geplande opschoning (Vercel-cron): anonimiseert lichaamsmaten ouder dan de
// bewaartermijn, rondt vastgelopen afhandelingen na betaling af, levert adviezen
// opnieuw waarvan de PDF of mail eerder mislukte en stuurt een herinnering als een
// betaalde test na enkele dagen nog niet is gedaan. Elke stap staat los: een fout
// komt in de foutlog en houdt de rest niet tegen. Blijven er problemen over, dan
// gaat er één samenvattende beheermelding uit.
// Beveiligd met CRON_SECRET (Vercel stuurt Authorization: Bearer ...).
export async function GET(request: Request) {
  const geheim = process.env.CRON_SECRET;
  if (!geheim) {
    return NextResponse.json({ fout: "CRON_SECRET niet ingesteld." }, { status: 503 });
  }
  if (!isGeldigeCron(request, geheim)) {
    return NextResponse.json({ fout: "Niet geautoriseerd." }, { status: 401 });
  }

  const supabase = adminClient();
  const PAD = "/api/onderhoud/opschonen";
  const mislukteStappen: string[] = [];

  /**
   * Voert één stap geïsoleerd uit: een fout komt in de foutlog en de
   * samenvatting, maar houdt de volgende stappen niet tegen.
   */
  async function stap<T>(naam: string, werk: () => Promise<T>, terugval: T): Promise<T> {
    try {
      return await werk();
    } catch (e) {
      console.error(`Nachtelijke stap '${naam}' mislukt`, e);
      mislukteStappen.push(`${naam}: ${foutTekst(e)}`);
      await registreerFout({ bron: "cron", fout: `${naam} mislukt: ${foutTekst(e)}`, pad: PAD });
      return terugval;
    }
  }

  const dagen = await stap(
    "Bewaartermijn lezen",
    async () => Number((await leesInstelling("bewaartermijn_maten_dagen")) || "30"),
    30,
  );
  const geanonimiseerd = await stap(
    "Anonimiseren oude maten",
    async () => {
      const { data, error } = await supabase.rpc("anonimiseer_oude_maten", { dagen });
      if (error) throw new Error(error.message);
      return (data as number | null) ?? 0;
    },
    null as number | null,
  );
  // Oude rate-limitvensters opruimen.
  await stap(
    "Rate-limits opruimen",
    async () => {
      const { error } = await supabase.rpc("opschonen_rate_limits");
      if (error) throw new Error(error.message);
    },
    undefined,
  );
  // Opgeloste fouten na 90 dagen uit de foutlog.
  await stap(
    "Foutlog opruimen",
    async () => {
      const { error } = await supabase
        .from("fouten_log")
        .delete()
        .eq("opgelost", true)
        .lt("laatst_op", new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString());
      if (error) throw new Error(error.message);
    },
    undefined,
  );

  // Betaalde orders waarvan de afhandeling na betaling (factuur, mail) vastliep.
  const naBetaling = await stap("Afhandeling na betaling herstellen", () => herstelNaBetalingen(20), {
    hersteld: 0,
    mislukt: [] as string[],
  });

  // Afgeronde tests zonder verzonden advies (ouder dan 10 minuten) opnieuw leveren.
  const advies = await stap(
    "Adviezen opnieuw leveren",
    async () => {
      const { data: open, error } = await supabase
        .from("orders")
        .select("id")
        .eq("status", "test_afgerond")
        .lt("afgerond_op", new Date(Date.now() - 10 * 60 * 1000).toISOString());
      if (error) throw new Error(error.message);
      let opnieuwGeleverd = 0;
      const problemen: string[] = [];
      for (const o of open ?? []) {
        try {
          if (await leverAdvies(o.id)) opnieuwGeleverd++;
          else problemen.push(`${o.id}: advies (nog) niet te maken (ontbreekt het adviesdocument?)`);
        } catch (e) {
          console.error("Opnieuw leveren mislukt", o.id, e);
          problemen.push(`${o.id}: ${foutTekst(e)}`);
        }
      }
      return { opnieuwGeleverd, nogOpen: (open?.length ?? 0) - opnieuwGeleverd, problemen };
    },
    { opnieuwGeleverd: 0, nogOpen: 0, problemen: [] as string[] },
  );

  const herinnering = await stap("Herinneringen", () => stuurHerinneringen(supabase), {
    verstuurd: 0,
    mislukt: [] as string[],
  });
  // Klanten een paar dagen na hun advies om een review vragen.
  const reviews = await stap("Review-uitnodigingen", () => nodigUitVoorReviews(supabase), {
    verstuurd: 0,
    mislukt: [] as string[],
  });
  // Eigen beheermeldingen bij fouten.
  const betaalherinneringen = await stap("Betaalherinneringen", () => stuurBetaalherinneringen(), null);
  const cadeaubonnen = await stap("Geplande cadeaubonnen", () => verstuurGeplandeCadeaubonnen(), null);
  // Afspraken van morgen: herinnering aan de klant.
  const afspraakHerinnering = await stap("Afspraakherinneringen", () => stuurAfspraakHerinneringen(), {
    verstuurd: 0,
    mislukt: [] as string[],
  });
  herinnering.mislukt.push(...afspraakHerinnering.mislukt);
  // Logboek van beheeracties: regels ouder dan 2 jaar weg.
  const logboekOpgeruimd = await stap("Logboek opruimen", () => ruimLogboekOp(), null);

  const delen: string[] = [];
  if (mislukteStappen.length > 0) {
    delen.push(`${mislukteStappen.length} stap(pen) mislukt:\n${mislukteStappen.map((r) => `- ${r}`).join("\n")}`);
  }
  if (naBetaling.mislukt.length > 0) {
    delen.push(
      `${naBetaling.mislukt.length} betaalde bestelling(en) nog niet afgehandeld (factuur/bevestiging):\n${naBetaling.mislukt.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  if (advies.nogOpen > 0) {
    delen.push(
      `${advies.nogOpen} afgeronde test(s) zonder verzonden advies:\n${advies.problemen.map((r) => `- ${r}`).join("\n")}`,
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
  if (delen.length > 0) await stuurBeheerMelding("Nachtelijke controle: actie nodig", delen.join("\n\n"));

  return NextResponse.json({
    ok: mislukteStappen.length === 0,
    mislukte_stappen: mislukteStappen,
    geanonimiseerd,
    bewaartermijn_dagen: dagen,
    nabetaling_hersteld: naBetaling.hersteld,
    nabetaling_mislukt: naBetaling.mislukt.length,
    opnieuw_geleverd: advies.opnieuwGeleverd,
    nog_open: advies.nogOpen,
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
