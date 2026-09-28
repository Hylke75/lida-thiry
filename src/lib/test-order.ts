import "server-only";
import { adminClient } from "./supabase/admin";

export interface TestOrder {
  id: string;
  klantnaam: string;
  email: string;
  status: string;
  token_verloopt_op: string | null;
  toegekend_type: string | null;
}

export type TokenToestand =
  | { toestand: "geldig"; order: TestOrder }
  | { toestand: "onbekend" }
  | { toestand: "verlopen" }
  | { toestand: "niet_betaald"; order: TestOrder }
  | { toestand: "al_afgerond"; order: TestOrder };

/** Valideert een testtoken en bepaalt of de test gedaan mag worden. */
export async function beoordeelToken(token: string): Promise<TokenToestand> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("orders")
    .select("id, klantnaam, email, status, token_verloopt_op, toegekend_type")
    .eq("testtoken", token)
    .single();

  if (!data) return { toestand: "onbekend" };
  const order = data as TestOrder;

  if (order.token_verloopt_op && new Date(order.token_verloopt_op) < new Date()) {
    return { toestand: "verlopen" };
  }
  if (order.status === "aangemaakt" || order.status === "betaling_mislukt") {
    return { toestand: "niet_betaald", order };
  }
  if (
    order.status === "test_afgerond" ||
    order.status === "handmatige_beoordeling" ||
    order.status === "advies_verzonden"
  ) {
    return { toestand: "al_afgerond", order };
  }
  // status === 'betaald' -> test mag gedaan worden.
  return { toestand: "geldig", order };
}
