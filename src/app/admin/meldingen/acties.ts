"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { apparaatNaam, schoneSoorten, valideerAbonnement } from "@/lib/push/regels";
import { stuurTestMelding } from "@/lib/push/versturen";

export interface ActieUitkomst {
  ok: boolean;
  bericht: string;
}

const PAD = "/admin/meldingen";

/** Slaat het pushabonnement van dit apparaat op (of werkt het bij) met de gekozen soorten. */
export async function meldApparaatAan(abonnement: unknown, soorten: unknown): Promise<ActieUitkomst> {
  const gebruiker = await vereisBeheerder();
  const v = valideerAbonnement(abonnement);
  if (!v.ok) return { ok: false, bericht: v.fout };
  const gekozen = schoneSoorten(soorten);
  const { error } = await adminClient()
    .from("push_abonnementen")
    .upsert(
      {
        gebruiker_id: gebruiker.id,
        endpoint: v.abonnement.endpoint,
        p256dh: v.abonnement.p256dh,
        auth: v.abonnement.auth,
        apparaat: apparaatNaam((await headers()).get("user-agent")),
        meldingen: gekozen,
      },
      { onConflict: "endpoint" },
    );
  if (error) return { ok: false, bericht: `Opslaan mislukt: ${error.message}` };
  revalidatePath(PAD);
  return { ok: true, bericht: "Pushmeldingen staan aan op dit apparaat." };
}

/** Zet push uit voor dit apparaat (op adres van het abonnement). */
export async function meldApparaatAf(endpoint: unknown): Promise<ActieUitkomst> {
  const gebruiker = await vereisBeheerder();
  if (typeof endpoint !== "string" || !endpoint) return { ok: false, bericht: "Geen apparaat opgegeven." };
  const { error } = await adminClient()
    .from("push_abonnementen")
    .delete()
    .eq("endpoint", endpoint)
    .eq("gebruiker_id", gebruiker.id);
  if (error) return { ok: false, bericht: `Uitzetten mislukt: ${error.message}` };
  revalidatePath(PAD);
  return { ok: true, bericht: "Pushmeldingen staan uit op dit apparaat." };
}

/** Welke meldingen dit apparaat krijgt. */
export async function bewaarSoorten(endpoint: unknown, soorten: unknown): Promise<ActieUitkomst> {
  const gebruiker = await vereisBeheerder();
  if (typeof endpoint !== "string" || !endpoint) return { ok: false, bericht: "Geen apparaat opgegeven." };
  const { data, error } = await adminClient()
    .from("push_abonnementen")
    .update({ meldingen: schoneSoorten(soorten) })
    .eq("endpoint", endpoint)
    .eq("gebruiker_id", gebruiker.id)
    .select("id");
  if (error) return { ok: false, bericht: `Opslaan mislukt: ${error.message}` };
  if (!data?.length) return { ok: false, bericht: "Dit apparaat is niet (meer) aangemeld. Zet push opnieuw aan." };
  revalidatePath(PAD);
  return { ok: true, bericht: "Keuze opgeslagen." };
}

/** Verwijdert een van je eigen apparaten uit de lijst. */
export async function verwijderApparaat(id: unknown): Promise<ActieUitkomst> {
  const gebruiker = await vereisBeheerder();
  if (typeof id !== "string" || !/^[0-9a-f-]{36}$/i.test(id)) return { ok: false, bericht: "Onbekend apparaat." };
  const { error } = await adminClient().from("push_abonnementen").delete().eq("id", id).eq("gebruiker_id", gebruiker.id);
  if (error) return { ok: false, bericht: `Verwijderen mislukt: ${error.message}` };
  revalidatePath(PAD);
  return { ok: true, bericht: "Apparaat verwijderd." };
}

/** Stuurt een testmelding naar al je apparaten. */
export async function stuurTest(): Promise<ActieUitkomst> {
  const gebruiker = await vereisBeheerder();
  const r = await stuurTestMelding(gebruiker.id);
  revalidatePath(PAD);
  if (r.verstuurd > 0) {
    return {
      ok: true,
      bericht: `Testmelding verstuurd naar ${r.verstuurd} ${r.verstuurd === 1 ? "apparaat" : "apparaten"}.${
        r.verwijderd ? ` ${r.verwijderd} verlopen ${r.verwijderd === 1 ? "apparaat is" : "apparaten zijn"} opgeruimd.` : ""
      }`,
    };
  }
  if (r.verwijderd > 0) return { ok: false, bericht: "Je aanmelding was verlopen en is opgeruimd. Zet push opnieuw aan." };
  if (r.mislukt > 0) return { ok: false, bericht: "Versturen is mislukt. Probeer het later opnieuw." };
  return { ok: false, bericht: "Geen apparaten aangemeld (of push is niet ingesteld)." };
}
