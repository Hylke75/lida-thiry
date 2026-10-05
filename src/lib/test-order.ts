import "server-only";
import { adminClient } from "./supabase/admin";
import { adviesDownloadbaar, tokenVerlopen } from "./advies-toegang";

interface TestOrder {
  id: string;
  klantnaam: string;
  email: string;
  status: string;
  token_verloopt_op: string | null;
  toegekend_type: string | null;
  afgerond_op: string | null;
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
    .select("id, klantnaam, email, status, token_verloopt_op, toegekend_type, afgerond_op")
    .eq("testtoken", token)
    .single();

  if (!data) return { toestand: "onbekend" };
  const order = data as TestOrder;

  if (tokenVerlopen(order)) {
    // Een afgeronde test blijft na het verlopen van de link nog een jaar
    // bereikbaar, zodat de klant haar advies kan blijven downloaden.
    return adviesDownloadbaar(order) ? { toestand: "al_afgerond", order } : { toestand: "verlopen" };
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

/** Titel van een adviestype (bijv. "6A"), of null als het type (nog) niet bestaat. */
export async function haalTypeTitel(sleutel: string): Promise<string | null> {
  const { data } = await adminClient()
    .from("adviestypes")
    .select("titel")
    .eq("sleutel", sleutel)
    .maybeSingle();
  return (data?.titel as string | undefined) ?? null;
}
