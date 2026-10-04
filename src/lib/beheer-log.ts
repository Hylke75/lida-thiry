import "server-only";
import { adminClient } from "./supabase/admin";
import { createClient } from "./supabase/server";
import {
  bewaarGrens,
  datumGrenzen,
  schoonDetails,
  schoonOmschrijving,
  zoekPatroon,
  type LogFilter,
  type LogRij,
} from "./beheer-log-regels";

export interface LogInvoer {
  /** Soort actie, als "categorie.werkwoord", bijv. "order.verwijderen". */
  actie: string;
  /** Soort onderwerp, bijv. "order", "pagina", "relatie". */
  onderwerpSoort?: string | null;
  onderwerpId?: string | number | null;
  /** Leesbare zin voor in het logboek. */
  omschrijving?: string;
  /** Extra gegevens (geheimen en grote waarden worden eruit gehaald). */
  details?: unknown;
  /** De gebruiker, als die al bekend is (scheelt een opvraging). */
  gebruiker?: { id: string; email?: string | null } | null;
}

async function haalGebruiker(): Promise<{ id: string; email: string | null } | null> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user ? { id: user.id, email: user.email ?? null } : null;
  } catch {
    return null;
  }
}

/**
 * Schrijft een regel in het logboek van beheeracties. Gooit nooit: een fout bij
 * het loggen mag de actie zelf niet laten mislukken (die is al gedaan).
 */
export async function logActie(invoer: LogInvoer): Promise<void> {
  try {
    const gebruiker = invoer.gebruiker ?? (await haalGebruiker());
    const { error } = await adminClient()
      .from("beheer_log")
      .insert({
        gebruiker_id: gebruiker?.id ?? null,
        email: gebruiker?.email ?? null,
        actie: String(invoer.actie).slice(0, 80),
        onderwerp_soort: invoer.onderwerpSoort ? String(invoer.onderwerpSoort).slice(0, 40) : null,
        onderwerp_id: invoer.onderwerpId == null ? null : String(invoer.onderwerpId).slice(0, 200),
        omschrijving: schoonOmschrijving(invoer.omschrijving),
        details: schoonDetails(invoer.details),
      });
    if (error) console.error("logboek: schrijven mislukt", invoer.actie, error.message);
  } catch (e) {
    console.error("logboek: schrijven mislukt", invoer.actie, e);
  }
}

/** Verwijdert logregels ouder dan de bewaartermijn (2 jaar). Gooit nooit; geeft het aantal terug (of null). */
export async function ruimLogboekOp(nu: Date = new Date()): Promise<number | null> {
  try {
    const { count, error } = await adminClient()
      .from("beheer_log")
      .delete({ count: "exact" })
      .lt("op", bewaarGrens(nu).toISOString());
    if (error) {
      console.error("logboek: opruimen mislukt", error.message);
      return null;
    }
    return count ?? 0;
  } catch (e) {
    console.error("logboek: opruimen mislukt", e);
    return null;
  }
}

/** Logregels volgens een filter (nieuwste eerst), met het totaal aantal. */
export async function zoekLogboek(
  filter: LogFilter,
  opties: { aantal: number; vanaf: number },
): Promise<{ rijen: LogRij[]; totaal: number }> {
  let q = adminClient()
    .from("beheer_log")
    .select("id, gebruiker_id, email, actie, onderwerp_soort, onderwerp_id, omschrijving, details, op", { count: "exact" })
    .order("op", { ascending: false })
    .order("id", { ascending: false });
  if (filter.gebruiker) q = q.eq("gebruiker_id", filter.gebruiker);
  if (filter.categorie) q = q.like("actie", `${filter.categorie}.%`);
  if (filter.soort) q = q.eq("onderwerp_soort", filter.soort);
  const { vanaf, totVoor } = datumGrenzen(filter);
  if (vanaf) q = q.gte("op", vanaf);
  if (totVoor) q = q.lt("op", totVoor);
  if (filter.q) {
    const p = zoekPatroon(filter.q);
    if (p) q = q.or(`omschrijving.ilike.${p},onderwerp_id.ilike.${p},email.ilike.${p},actie.ilike.${p}`);
  }
  const { data, error, count } = await q.range(opties.vanaf, opties.vanaf + opties.aantal - 1);
  if (error) throw new Error(`logboek lezen: ${error.message}`);
  return { rijen: (data ?? []) as LogRij[], totaal: count ?? 0 };
}

/** De beheerders (voor het filter op persoon). */
export async function logPersonen(): Promise<{ id: string; email: string }[]> {
  const { data } = await adminClient().from("beheerders").select("gebruiker_id, email").order("email");
  return ((data ?? []) as { gebruiker_id: string; email: string | null }[]).map((r) => ({
    id: r.gebruiker_id,
    email: r.email ?? r.gebruiker_id,
  }));
}
