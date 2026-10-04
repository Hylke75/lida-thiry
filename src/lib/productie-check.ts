import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstelling } from "./instellingen";
import { isMappingCompleet, ontbrekendeLetters } from "@/rekenkern/letter";
import { haalFfitToewijzing, haalLichaamstypes } from "./lichaamstypes";

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
  const toewijzing = await haalFfitToewijzing();
  const verwacht = 12 * (await haalLichaamstypes()).length;

  const items: CheckItem[] = [
    {
      label: "Elke uitkomst van de berekening hoort bij een lichaamstype",
      ok: isMappingCompleet(toewijzing),
      detail: isMappingCompleet(toewijzing) ? undefined : `Ontbreekt: ${ontbrekendeLetters(toewijzing).join(", ")}`,
    },
    {
      label: `Alle ${verwacht} adviestypes aanwezig (12 categorieën × lichaamstypes)`,
      ok: (count ?? 0) >= verwacht,
      detail: `${count ?? 0}/${verwacht}`,
    },
    { label: "Prijs ingesteld", ok: Boolean(prijs) },
    { label: "Mollie-sleutel aanwezig", ok: Boolean(process.env.MOLLIE_API_KEY) },
    { label: "Resend-sleutel aanwezig", ok: Boolean(process.env.RESEND_API_KEY) },
    { label: "Eigen afzenderadres (RESEND_VAN) ingesteld", ok: Boolean(process.env.RESEND_VAN) },
    { label: "Website-adres (NEXT_PUBLIC_SITE_URL) ingesteld", ok: Boolean(process.env.NEXT_PUBLIC_SITE_URL) },
    { label: "Gratis testmodus uit (GRATIS_TEST)", ok: !process.env.GRATIS_TEST },
  ];

  return { gereed: items.every((i) => i.ok), items };
}
