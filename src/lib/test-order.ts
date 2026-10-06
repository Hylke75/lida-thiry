import "server-only";
import { adminClient } from "./supabase/admin";
import { adviesDownloadbaar, tokenVerlopen } from "./advies-toegang";
import { AFGERONDE_STATUSSEN, isOpen } from "./order-status";

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
  // Niet (meer) betaald: aangemaakt, betaling mislukt of betaling verlopen.
  if (isOpen(order.status)) return { toestand: "niet_betaald", order };
  if ((AFGERONDE_STATUSSEN as readonly string[]).includes(order.status)) {
    return { toestand: "al_afgerond", order };
  }
  // Alleen 'betaald' geeft toegang tot de test; een onbekende status nooit.
  return order.status === "betaald" ? { toestand: "geldig", order } : { toestand: "onbekend" };
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
