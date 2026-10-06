import "server-only";
import { adminClient } from "./supabase/admin";
import { controleerLink } from "./ondertekening";
import { BETAALD_STATUSSEN, OPEN_STATUSSEN } from "./betaalherinnering-regels";
import { HERVAT_DOEL } from "./betaalherinnering";
import { UUID_PATROON } from "./nieuwsbrief/links";
import { controleerKortingscode, zonderEigenClaim, type Kortingscode } from "./prijs";

interface HervatOrder {
  id: string;
  klantnaam: string;
  email: string;
  status: string;
  bedrag_cent: number;
  valuta: string;
  kortingscode: string | null;
  korting_geclaimd: boolean;
  mollie_payment_id: string | null;
  aangemaakt_op: string;
}

export type HervatBeoordeling =
  | { soort: "ongeldig" }
  | { soort: "betaald"; orderId: string }
  | { soort: "open"; order: HervatOrder };

/**
 * Mag deze (via de betaalherinnering ondertekende) bestelling nog worden betaald?
 * Niet als de link niet klopt of verlopen is, de order al betaald is, of er op
 * hetzelfde e-mailadres sindsdien al betaald is. Een gebruikte kortingscode
 * moet ook nog geldig zijn.
 */
export async function beoordeelHervatten(id: string, token: string): Promise<HervatBeoordeling> {
  if (!UUID_PATROON.test(id)) return { soort: "ongeldig" };
  let geldig = false;
  try {
    geldig = controleerLink(HERVAT_DOEL, id, token);
  } catch {
    geldig = false;
  }
  if (!geldig) return { soort: "ongeldig" };

  const supabase = adminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, klantnaam, email, status, bedrag_cent, valuta, kortingscode, korting_geclaimd, mollie_payment_id, aangemaakt_op")
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!order) return { soort: "ongeldig" };
  if ((BETAALD_STATUSSEN as readonly string[]).includes(order.status)) return { soort: "betaald", orderId: order.id };
  if (!(OPEN_STATUSSEN as readonly string[]).includes(order.status) || !(order.bedrag_cent > 0)) {
    return { soort: "ongeldig" };
  }

  const { count, error: e2 } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("email", order.email)
    .in("status", [...BETAALD_STATUSSEN])
    .gte("aangemaakt_op", order.aangemaakt_op);
  if (e2) throw new Error(e2.message);
  if ((count ?? 0) > 0) return { soort: "betaald", orderId: order.id };

  if (order.kortingscode) {
    const { data: code, error: e3 } = await supabase
      .from("kortingscodes")
      .select("code, soort, waarde, geldig_tot, max_gebruik, aantal_gebruikt, actief")
      .eq("code", order.kortingscode)
      .maybeSingle();
    if (e3) throw new Error(e3.message);
    // Heeft deze bestelling de code zelf al geclaimd, dan telt die claim niet als 'gebruikt'.
    const zonderClaim = code ? zonderEigenClaim(code as Kortingscode, Boolean(order.korting_geclaimd)) : null;
    if (controleerKortingscode(zonderClaim)) return { soort: "ongeldig" };
  }
  return { soort: "open", order: order as HervatOrder };
}
