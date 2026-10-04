"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { vindSectie } from "@/lib/inhoud/register";
import { combineer, standaardWaarden, valideer } from "@/lib/inhoud/schema";

export type SectieResultaat =
  | { ok: true; bericht: string; waarden: Record<string, unknown>; aangepast: boolean }
  | { ok: false; fouten: string[] };

/** Slaat de teksten van één sectie op. */
export async function slaSectieOp(sleutel: string, waarden: unknown): Promise<SectieResultaat> {
  await vereisBeheerder();
  const gevonden = vindSectie(sleutel);
  if (!gevonden) return { ok: false, fouten: ["Onbekend onderdeel."] };

  const uitkomst = valideer(gevonden.sectie, waarden);
  if (!uitkomst.ok) return { ok: false, fouten: uitkomst.fouten };

  const { error } = await adminClient()
    .from("inhoud")
    .upsert({ sleutel, waarde: uitkomst.waarde }, { onConflict: "sleutel" });
  if (error) return { ok: false, fouten: [`Opslaan mislukt: ${error.message}`] };

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
  await vereisBeheerder();
  const gevonden = vindSectie(sleutel);
  if (!gevonden) return { ok: false, fouten: ["Onbekend onderdeel."] };

  const { error } = await adminClient().from("inhoud").delete().eq("sleutel", sleutel);
  if (error) return { ok: false, fouten: [`Terugzetten mislukt: ${error.message}`] };

  revalidatePath("/", "layout");
  return {
    ok: true,
    bericht: "De standaardtekst is teruggezet.",
    waarden: standaardWaarden(gevonden.sectie),
    aangepast: false,
  };
}
