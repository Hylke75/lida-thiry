import "server-only";
import { adminClient } from "./supabase/admin";
import { maakFactuur, type Factuur } from "./factuur";
import { stuurTestlinkMail } from "./resend";
import { stuurBeheerMelding, foutTekst } from "./beheermelding";
import { leesSectie } from "./inhoud/lees";
import { NIEUWSBRIEF_BESTELLING } from "./inhoud/groepen/nieuwsbrief";
import { meldAanNaBestelling } from "./nieuwsbrief/beheer";
import { koppelRelatie } from "./relaties/koppel";
import { stuurPushMelding } from "./push/versturen";
import { leesInstelling } from "./instellingen";
import { BETAALDE_STATUSSEN, OPEN_STATUSSEN } from "./order-status";
import { leesProductNaam } from "./verkoop/regels";

/**
 * Meldt de klant aan voor de nieuwsbrief als bij de bestelling het vinkje aan
 * stond. Aparte query, zodat de rest van de afhandeling niet afhangt van deze
 * kolom. Gooit nooit: de betaling mag hier niet op stuklopen.
 */
export async function nieuwsbriefNaBetaling(orderId: string): Promise<void> {
  try {
    const { data: order, error } = await adminClient()
      .from("orders")
      .select("klantnaam, email, nieuwsbrief_akkoord")
      .eq("id", orderId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!order?.nieuwsbrief_akkoord) return;
    const teksten = await leesSectie(NIEUWSBRIEF_BESTELLING);
    await meldAanNaBestelling({ email: order.email, naam: order.klantnaam, toestemmingTekst: teksten.vinkje });
  } catch (e) {
    console.error("Nieuwsbriefaanmelding na betaling mislukt", orderId, e);
  }
}

/** Zo lang geldt een gestarte afhandeling als 'bezig' (daarna mag een herhaling). */
const NABETALING_SLOT_MINUTEN = 10;

/**
 * Claimt (atomair) het recht om de afhandeling na betaling voor deze order
 * (opnieuw) uit te voeren: alleen als die nog niet klaar is en er geen recente
 * poging loopt. Geeft true als deze aanroeper aan de beurt is.
 */
export async function claimNaBetaling(orderId: string): Promise<boolean> {
  const grens = new Date(Date.now() - NABETALING_SLOT_MINUTEN * 60 * 1000).toISOString();
  const { data, error } = await adminClient()
    .from("orders")
    .update({ nabetaling_poging_op: new Date().toISOString() })
    .eq("id", orderId)
    .in("status", [...BETAALDE_STATUSSEN])
    .is("nabetaling_klaar_op", null)
    .or(`nabetaling_poging_op.is.null,nabetaling_poging_op.lt.${grens}`)
    .select("id");
  if (error) throw new Error(`Afhandeling claimen mislukt: ${error.message}`);
  return Boolean(data && data.length > 0);
}

/**
 * Geeft de kortingsclaim van een (niet-betaalde) bestelling weer vrij, bijv. als
 * de betaling mislukt of verloopt of de bestelling wordt verwijderd. Idempotent:
 * alleen de aanroep die de vlag omzet, verlaagt het gebruik. Gooit bij fouten.
 */
export async function geefKortingsclaimVrij(orderId: string): Promise<void> {
  const supabase = adminClient();
  const { data, error } = await supabase
    .from("orders")
    .update({ korting_geclaimd: false })
    .eq("id", orderId)
    .eq("korting_geclaimd", true)
    .in("status", [...OPEN_STATUSSEN])
    .not("kortingscode", "is", null)
    .select("kortingscode");
  if (error) throw new Error(`Kortingsclaim vrijgeven mislukt: ${error.message}`);
  const code = data?.[0]?.kortingscode as string | undefined;
  if (!code) return;
  const { error: e2 } = await supabase.rpc("geef_kortingscode_vrij", { p_code: code });
  if (e2) throw new Error(`Kortingscode ${code} vrijgeven mislukt: ${e2.message}`);
}

/**
 * Afhandeling na de overgang naar 'betaald': kortingscode-gebruik tellen (alleen
 * als de bestelling de code nog niet bij het aanmaken claimde), factuur maken
 * (alleen bij een bedrag > 0), de bevestigingsmail met testlink en factuur sturen
 * en (als aangevinkt) aanmelden voor de nieuwsbrief. Zet aan het eind
 * nabetaling_klaar_op; loopt het eerder vast, dan herhalen de webhook of de
 * nachtelijke cron de afhandeling. Gooit nooit; fouten gaan als beheermelding uit.
 */
export async function naBetaling(opts: { orderId: string; geldigDagen?: number }): Promise<boolean> {
  try {
    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select(
        "id, klantnaam, email, bedrag_cent, korting_cent, kortingscode, korting_geclaimd, valuta, factuurgegevens, testtoken",
      )
      .eq("id", opts.orderId)
      .single();
    if (error || !order) {
      await stuurBeheerMelding(
        "Betaalde order niet gevonden",
        `Order ${opts.orderId}: ${error?.message ?? "onbekend"}`,
      );
      return false;
    }
    const geldigDagen = opts.geldigDagen ?? Number((await leesInstelling("token_geldigheid_dagen")) || "30");

    // Adresboek bijwerken (vult alleen lege velden aan; gooit nooit).
    const adres = (order.factuurgegevens ?? {}) as Record<string, unknown>;
    await koppelRelatie({
      email: order.email,
      naam: order.klantnaam,
      straat: typeof adres.adres === "string" ? adres.adres : null,
      postcode: typeof adres.postcode === "string" ? adres.postcode : null,
      plaats: typeof adres.plaats === "string" ? adres.plaats : null,
      bron: "bestelling",
    });

    // Oudere bestellingen claimden de code niet bij het aanmaken: tel het gebruik
    // dan nu, precies één keer (de vlag wordt eerst atomair omgezet).
    if (order.kortingscode && !order.korting_geclaimd) {
      const { data: omgezet, error: vlagFout } = await supabase
        .from("orders")
        .update({ korting_geclaimd: true })
        .eq("id", order.id)
        .eq("korting_geclaimd", false)
        .select("id");
      const rpcFout = vlagFout
        ? vlagFout
        : omgezet && omgezet.length > 0
          ? (await supabase.rpc("gebruik_kortingscode", { p_code: order.kortingscode, p_afdwingen: false })).error
          : null;
      if (rpcFout) {
        await stuurBeheerMelding(
          "Kortingscode-gebruik niet geteld",
          `Order ${order.id}, code ${order.kortingscode}: ${rpcFout.message}`,
        );
      }
    }

    let factuur: Factuur | null = null;
    try {
      factuur = await maakFactuur(order.id);
    } catch (e) {
      console.error("Factuur maken mislukt", order.id, e);
      await stuurBeheerMelding(
        "Factuur maken mislukt",
        `Order ${order.id} (${order.email}) is betaald, maar de factuur kon niet worden gemaakt. De bevestigingsmail gaat zonder factuur.\n\n${foutTekst(e)}`,
      );
    }

    const korting = order.korting_cent ?? 0;
    if (order.testtoken) {
      try {
        await stuurTestlinkMail({
          naam: order.klantnaam,
          email: order.email,
          token: order.testtoken,
          geldigDagen,
          overzicht: {
            prijsCent: (order.bedrag_cent ?? 0) + korting,
            kortingCent: korting,
            kortingscode: order.kortingscode,
            totaalCent: order.bedrag_cent ?? 0,
            valuta: order.valuta || "EUR",
            factuurnummer: factuur?.factuurnummer ?? null,
            productNaam: leesProductNaam(await leesInstelling("product_naam")),
          },
          factuur: factuur ? { bestandsnaam: factuur.bestandsnaam, pdf: factuur.pdf } : undefined,
        });
      } catch (e) {
        console.error("Bevestigingsmail mislukt", order.id, e);
        await stuurBeheerMelding(
          "Bevestigingsmail met testlink mislukt",
          `Order ${order.id} (${order.klantnaam}, ${order.email}) is betaald, maar de mail met de testlink kon niet worden verstuurd. De klant ziet de startknop wel op de bedankpagina.\n\n${foutTekst(e)}`,
        );
      }
    } else {
      await stuurBeheerMelding("Betaalde order zonder testlink", `Order ${order.id} (${order.email}) heeft geen testtoken.`);
    }

    await stuurPushMelding("bestelling", { titel: "Nieuwe bestelling betaald", tekst: `${order.klantnaam} · € ${((order.bedrag_cent ?? 0) / 100).toFixed(2).replace(".", ",")}${order.kortingscode ? ` · code ${order.kortingscode}` : ""}`, url: `/admin/order/${order.id}` });
    await nieuwsbriefNaBetaling(order.id);

    const { error: klaarFout } = await supabase
      .from("orders")
      .update({ nabetaling_klaar_op: new Date().toISOString() })
      .eq("id", order.id);
    if (klaarFout) throw new Error(`Afhandeling klaar markeren mislukt: ${klaarFout.message}`);
    return true;
  } catch (e) {
    console.error("Afhandeling na betaling mislukt", opts.orderId, e);
    await stuurBeheerMelding("Afhandeling na betaling mislukt", `Order ${opts.orderId}: ${foutTekst(e)}`);
    return false;
  }
}

/**
 * Nachtelijke herstelronde: betaalde orders (ouder dan 15 minuten) waarvan de
 * afhandeling na betaling nooit is afgerond, opnieuw afhandelen. Begrensd per
 * ronde. Gooit bij een databasefout bij het ophalen.
 */
export async function herstelNaBetalingen(max = 20): Promise<{ hersteld: number; mislukt: string[] }> {
  const grens = new Date(Date.now() - 15 * 60 * 1000).toISOString();
  const { data, error } = await adminClient()
    .from("orders")
    .select("id")
    .in("status", [...BETAALDE_STATUSSEN])
    .is("nabetaling_klaar_op", null)
    .lt("betaald_op", grens)
    .order("betaald_op", { ascending: true })
    .limit(max);
  if (error) throw new Error(`Openstaande afhandelingen ophalen mislukt: ${error.message}`);
  let hersteld = 0;
  const mislukt: string[] = [];
  for (const o of data ?? []) {
    try {
      if (!(await claimNaBetaling(o.id))) continue;
      if (await naBetaling({ orderId: o.id })) hersteld++;
      else mislukt.push(`${o.id}: afhandeling na betaling mislukt (zie eerdere melding)`);
    } catch (e) {
      mislukt.push(`${o.id}: ${foutTekst(e)}`);
    }
  }
  return { hersteld, mislukt };
}
