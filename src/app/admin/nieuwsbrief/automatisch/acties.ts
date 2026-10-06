"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { siteUrl } from "@/lib/site";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { vindSjabloon } from "@/lib/nieuwsbrief/sjablonen";
import { haalCampagne, verzendProblemen } from "@/lib/nieuwsbrief/verzenden";

const PAD = "/admin/nieuwsbrief/automatisch";

function vernieuw(id?: string) {
  revalidatePath(PAD);
  revalidatePath("/admin/nieuwsbrief");
  if (id) revalidatePath(`${PAD}/${id}`);
}

/** Maakt een nieuwe automatische mail (uit een sjabloon of leeg); staat nog uit. */
export async function maakAutomatisering(formData: FormData) {
  await vereisBeheerder("nieuwsbrief");
  const s = vindSjabloon(formData.get("sjabloon"));
  const rij = s
    ? {
        naam: s.naam,
        onderwerp: s.onderwerp,
        preheader: s.preheader,
        trigger: s.trigger,
        vertraging_dagen: s.vertraging_dagen,
        blokken: s.blokken(siteUrl()),
      }
    : { naam: "Nieuwe automatische mail", trigger: "aanmelding", vertraging_dagen: 0, blokken: [] };
  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .insert({ ...rij, soort: "automatisch", actief: false })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAD}?fout=aanmaken`);
  vernieuw();
  redirect(`${PAD}/${data.id}?nieuw=1`);
}

export async function verwijderAutomatisering(formData: FormData) {
  await vereisBeheerder("nieuwsbrief");
  const id = String(formData.get("id") ?? "");
  if (!UUID_PATROON.test(id)) redirect(`${PAD}?fout=onbekend`);
  const { data } = await adminClient()
    .from("nb_campagnes")
    .delete()
    .eq("id", id)
    .eq("soort", "automatisch")
    .eq("actief", false)
    .select("id");
  vernieuw();
  redirect(data?.length ? `${PAD}?verwijderd=1` : `${PAD}?fout=verwijderen`);
}

/** Zet een automatische mail aan of uit. Aanzetten kan alleen als de opgeslagen mail compleet is. */
export async function zetActief(id: string, aan: boolean): Promise<{ ok: true; bericht: string } | { ok: false; fouten: string[] }> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende automatische mail."] };
  const c = await haalCampagne(id);
  if (!c || c.soort !== "automatisch") return { ok: false, fouten: ["Onbekende automatische mail."] };
  if (aan) {
    const problemen = verzendProblemen(c);
    if (!c.trigger) problemen.push("Kies wanneer deze mail verstuurd wordt.");
    if (problemen.length) return { ok: false, fouten: problemen };
  }
  const { error } = await adminClient().from("nb_campagnes").update({ actief: Boolean(aan) }).eq("id", id).eq("soort", "automatisch");
  if (error) return { ok: false, fouten: [`Opslaan is niet gelukt (${error.message}).`] };
  vernieuw(id);
  return {
    ok: true,
    bericht: aan
      ? "De automatische mail staat aan. Nieuwe aanmeldingen of adviezen krijgen hem vanaf nu op het ingestelde moment."
      : "De automatische mail staat uit. Er worden geen nieuwe mails meer ingepland.",
  };
}
