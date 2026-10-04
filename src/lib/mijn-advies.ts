import "server-only";
import { adminClient } from "./supabase/admin";
import { stuurMijnAdviesMail } from "./resend";
import { siteUrl } from "./site";
import { mijnAdviesLinks, type MijnAdviesOrder } from "./mijn-advies-regels";

/**
 * Zoekt de bestellingen op een e-mailadres en mailt (alleen naar dat adres) nieuwe
 * links naar de afgeronde adviezen en de nog niet afgeronde tests. Zonder links
 * gaat er niets uit. De aanroeper toont altijd dezelfde neutrale bevestiging.
 * Gooit bij fouten.
 */
export async function stuurMijnAdvies(email: string): Promise<boolean> {
  const { data, error } = await adminClient()
    .from("orders")
    .select("klantnaam, email, status, testtoken, toegekend_type, afgerond_op, betaald_op, aangemaakt_op, token_verloopt_op")
    .eq("email", email)
    .not("testtoken", "is", null)
    .order("aangemaakt_op", { ascending: false })
    .limit(50);
  if (error) throw new Error(`Orders ophalen: ${error.message}`);
  const { naam, adviezen, tests } = mijnAdviesLinks((data ?? []) as MijnAdviesOrder[], siteUrl());
  if (!adviezen.length && !tests.length) return false;
  await stuurMijnAdviesMail({ email, naam, adviezen, tests });
  return true;
}
