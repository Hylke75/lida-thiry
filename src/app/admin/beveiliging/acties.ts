"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { geverifieerdeFactoren } from "@/lib/mfa-regels";

/**
 * Legt vast dat de beheerder zelf een authenticator-app heeft gekoppeld of
 * verwijderd (dat gebeurt in de browser, rechtstreeks bij Supabase). Het aantal
 * apps komt van de server, niet uit de browser.
 */
export async function meldTweestapWijziging(soort: "aan" | "uit"): Promise<void> {
  const ik = await vereisBeheerder(undefined, { zonderVerplichteMfa: true });
  const aantal = geverifieerdeFactoren(ik.factors).length;
  await logActie({
    actie: soort === "aan" ? "beveiliging.tweestap_koppelen" : "beveiliging.tweestap_verwijderen",
    onderwerpSoort: "beheerder",
    onderwerpId: ik.id,
    omschrijving:
      soort === "aan"
        ? `Authenticator-app gekoppeld (nu ${aantal})`
        : `Authenticator-app verwijderd (nog ${aantal})`,
    gebruiker: ik,
  });
  revalidatePath("/admin/beveiliging");
}
