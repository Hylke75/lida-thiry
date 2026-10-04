"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { vindSectie } from "@/lib/inhoud/register";
import { combineer, standaardWaarden, valideer } from "@/lib/inhoud/schema";
import { bewaarVersie } from "@/lib/versies/beheer";
import { tekstSnapshot } from "@/lib/versies/regels";

export type SectieResultaat =
  | { ok: true; bericht: string; waarden: Record<string, unknown>; aangepast: boolean }
  | { ok: false; fouten: string[] };

/** Bewaart de tekst zoals die nu is opgeslagen in de geschiedenis (vóór het overschrijven). */
async function bewaarHuidigeTekst(sleutel: string, door: string | undefined, omschrijving: string, forceer = false) {
  const { data, error } = await adminClient().from("inhoud").select("waarde").eq("sleutel", sleutel).maybeSingle();
  if (error) return console.error(`Teksten: ${sleutel} niet gelezen voor de geschiedenis.`, error);
  await bewaarVersie({ soort: "tekst", ref: sleutel, inhoud: tekstSnapshot(data?.waarde ?? null), omschrijving: data?.waarde ? omschrijving : "Standaardtekst", door, forceer });
}

/** Slaat de teksten van één sectie op. */
export async function slaSectieOp(sleutel: string, waarden: unknown): Promise<SectieResultaat> {
  const user = await vereisBeheerder("teksten");
  const gevonden = vindSectie(sleutel);
  if (!gevonden) return { ok: false, fouten: ["Onbekend onderdeel."] };

  const uitkomst = valideer(gevonden.sectie, waarden);
  if (!uitkomst.ok) return { ok: false, fouten: uitkomst.fouten };

  await bewaarHuidigeTekst(sleutel, user.email, "Opgeslagen");
  const { error } = await adminClient()
    .from("inhoud")
    .upsert({ sleutel, waarde: uitkomst.waarde }, { onConflict: "sleutel" });
  if (error) return { ok: false, fouten: [`Opslaan mislukt: ${error.message}`] };
  await logActie({ actie: "tekst.opslaan", onderwerpSoort: "tekst", onderwerpId: sleutel, omschrijving: `Teksten opgeslagen: ${sleutel}`, gebruiker: user });

  // Teksten worden op openbare pagina's, in de test en in e-mails gebruikt.
  revalidatePath("/", "layout");
  return {
    ok: true,
    bericht: "Opgeslagen. De nieuwe tekst is direct zichtbaar op de site.",
    waarden: combineer(gevonden.sectie, uitkomst.waarde),
    aangepast: true,
  };
}

/** Verwijdert de aanpassingen van een sectie, zodat de standaardtekst weer geldt. */
export async function zetSectieTerug(sleutel: string): Promise<SectieResultaat> {
  const user = await vereisBeheerder("teksten");
  const gevonden = vindSectie(sleutel);
  if (!gevonden) return { ok: false, fouten: ["Onbekend onderdeel."] };

  await bewaarHuidigeTekst(sleutel, user.email, "Voor standaardtekst", true);
  const { error } = await adminClient().from("inhoud").delete().eq("sleutel", sleutel);
  if (error) return { ok: false, fouten: [`Terugzetten mislukt: ${error.message}`] };
  await logActie({
    actie: "tekst.standaard_terugzetten",
    onderwerpSoort: "tekst",
    onderwerpId: sleutel,
    omschrijving: `Standaardtekst teruggezet: ${sleutel}`,
    gebruiker: user,
  });

  revalidatePath("/", "layout");
  return {
    ok: true,
    bericht: "De standaardtekst is teruggezet.",
    waarden: standaardWaarden(gevonden.sectie),
    aangepast: false,
  };
}
