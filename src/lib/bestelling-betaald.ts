import "server-only";
import { adminClient } from "./supabase/admin";
import { maakFactuur, type Factuur } from "./factuur";
import { stuurTestlinkMail } from "./resend";
import { stuurBeheerMelding, foutTekst } from "./beheermelding";

/**
 * Afhandeling direct na de (eerste) overgang naar 'betaald': kortingscode-gebruik
 * tellen, factuur maken (alleen bij een bedrag > 0) en de bevestigingsmail met
 * testlink en factuur sturen. Gooit nooit; fouten gaan als beheermelding uit.
 */
export async function naBetaling(opts: {
  orderId: string;
  token: string;
  geldigDagen: number;
  /** true als het kortingsgebruik al bij het aanmaken is geclaimd (gratis bestelling). */
  kortingAlGeteld?: boolean;
}): Promise<void> {
  try {
    const supabase = adminClient();
    const { data: order, error } = await supabase
      .from("orders")
      .select("id, klantnaam, email, bedrag_cent, korting_cent, kortingscode, valuta")
      .eq("id", opts.orderId)
      .single();
    if (error || !order) {
      await stuurBeheerMelding(
        "Betaalde order niet gevonden",
        `Order ${opts.orderId}: ${error?.message ?? "onbekend"}`,
      );
      return;
    }

    if (order.kortingscode && !opts.kortingAlGeteld) {
      const { error: rpcFout } = await supabase.rpc("gebruik_kortingscode", {
        p_code: order.kortingscode,
        p_afdwingen: false,
      });
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
    try {
      await stuurTestlinkMail({
        naam: order.klantnaam,
        email: order.email,
        token: opts.token,
        geldigDagen: opts.geldigDagen,
        overzicht: {
          prijsCent: (order.bedrag_cent ?? 0) + korting,
          kortingCent: korting,
          kortingscode: order.kortingscode,
          totaalCent: order.bedrag_cent ?? 0,
          valuta: order.valuta || "EUR",
          factuurnummer: factuur?.factuurnummer ?? null,
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
  } catch (e) {
    console.error("Afhandeling na betaling mislukt", opts.orderId, e);
    await stuurBeheerMelding("Afhandeling na betaling mislukt", `Order ${opts.orderId}: ${foutTekst(e)}`);
  }
}
