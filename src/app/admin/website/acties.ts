"use server";

import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { valideerWebsiteInvoer, WEBSITE_SLEUTELS, type WebsiteSleutel } from "@/lib/website/instellingen";
import { isStandaardIndeling, normaliseerIndeling, type IndelingItem } from "@/lib/website/homepage";

export type WebsiteResultaat =
  | { ok: true; bericht: string; waarden: Record<WebsiteSleutel, string> }
  | { ok: false; fouten: string[] };

async function schrijf(rijen: { sleutel: string; waarde: string | null }[]): Promise<string | null> {
  const { error } = await adminClient().from("instellingen").upsert(rijen, { onConflict: "sleutel" });
  return error ? error.message : null;
}

/** Slaat naam, omschrijving, afbeeldingen en social media op. Leeg = standaard. */
export async function slaWebsiteOp(invoer: Partial<Record<WebsiteSleutel, string>>): Promise<WebsiteResultaat> {
  const ik = await vereisBeheerder("website_instellingen");
  const uitkomst = valideerWebsiteInvoer(invoer ?? {});
  if (!uitkomst.ok) return { ok: false, fouten: uitkomst.fouten };

  const fout = await schrijf(WEBSITE_SLEUTELS.map((sleutel) => ({ sleutel, waarde: uitkomst.waarden[sleutel] })));
  if (fout) return { ok: false, fouten: [`Opslaan mislukt: ${fout}`] };
  await logActie({
    actie: "website.instellingen_wijzigen",
    onderwerpSoort: "website",
    omschrijving: "Website-instellingen opgeslagen",
    details: uitkomst.waarden,
    gebruiker: ik,
  });

  // Naam, logo, favicon en social media staan op elke pagina.
  vernieuwPubliekeData("instellingen");
  revalidatePath("/", "layout");
  const waarden = Object.fromEntries(WEBSITE_SLEUTELS.map((s) => [s, uitkomst.waarden[s] ?? ""])) as Record<WebsiteSleutel, string>;
  return { ok: true, bericht: "Opgeslagen. De wijzigingen zijn direct zichtbaar op de site.", waarden };
}

export type IndelingResultaat = { ok: true; bericht: string; indeling: IndelingItem[] } | { ok: false; fouten: string[] };

/** Slaat volgorde en zichtbaarheid van de homepageblokken op. */
export async function slaIndelingOp(invoer: unknown): Promise<IndelingResultaat> {
  const ik = await vereisBeheerder("homepage");
  if (!Array.isArray(invoer)) return { ok: false, fouten: ["Ongeldige indeling."] };
  const indeling = normaliseerIndeling(invoer);
  // De standaard slaan we op als leeg, zodat nieuwe blokken later vanzelf meekomen.
  const fout = await schrijf([
    { sleutel: "homepage_indeling", waarde: isStandaardIndeling(indeling) ? null : JSON.stringify(indeling) },
  ]);
  if (fout) return { ok: false, fouten: [`Opslaan mislukt: ${fout}`] };
  await logActie({
    actie: "website.homepage_indeling",
    onderwerpSoort: "website",
    omschrijving: "Homepage-indeling opgeslagen",
    details: { indeling },
    gebruiker: ik,
  });

  vernieuwPubliekeData("instellingen");
  revalidatePath("/");
  return { ok: true, bericht: "Opgeslagen. De homepage is bijgewerkt.", indeling };
}
