import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstelling } from "./instellingen";
import { isMappingCompleet, ontbrekendeLetters } from "@/rekenkern/letter";

export interface CheckItem {
  label: string;
  ok: boolean;
  detail?: string;
}

/**
 * Productie-gereedheid: de app mag niet live zolang de FFIT->letter-mapping niet
 * compleet is en niet alle 60 adviestypes zijn geïmporteerd.
 */
export async function productieCheck(): Promise<{ gereed: boolean; items: CheckItem[] }> {
  const supabase = adminClient();
  const { count } = await supabase
    .from("adviestypes")
    .select("*", { count: "exact", head: true });

  const prijs = await leesInstelling("prijs_cent");
  const adviseur = await leesInstelling("adviseur_email");

  const items: CheckItem[] = [
    {
      label: "FFIT → letter-mapping compleet",
      ok: isMappingCompleet(),
      detail: isMappingCompleet() ? undefined : `Ontbreekt: ${ontbrekendeLetters().join(", ")}`,
    },
    {
      label: "Alle 60 adviestypes geïmporteerd",
      ok: (count ?? 0) >= 60,
      detail: `${count ?? 0}/60`,
    },
    { label: "Prijs ingesteld", ok: Boolean(prijs) },
    { label: "Adviseur-e-mail ingesteld", ok: Boolean(adviseur) },
    { label: "Mollie-sleutel aanwezig", ok: Boolean(process.env.MOLLIE_API_KEY) },
    { label: "Resend-sleutel aanwezig", ok: Boolean(process.env.RESEND_API_KEY) },
  ];

  return { gereed: items.every((i) => i.ok), items };
}
