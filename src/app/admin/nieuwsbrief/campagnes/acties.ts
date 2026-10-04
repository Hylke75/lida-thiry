"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { haalCampagne, probeerMisluktOpnieuw, startCampagne, verwerkWachtrij, verzendProblemen } from "@/lib/nieuwsbrief/verzenden";
import { amsterdamNaarUtc, controleerInplanmoment, toonDatumTijd } from "@/lib/nieuwsbrief/tijd";

const PAD = "/admin/nieuwsbrief/campagnes";

type Uitkomst = { ok: true; bericht: string } | { ok: false; fouten: string[] };

/** Eerste ronde verzenden ná het antwoord, zodat de knop direct reageert. */
const EERSTE_RONDE = 100;

function verwerkStraks() {
  after(async () => {
    try {
      await verwerkWachtrij({ max: EERSTE_RONDE });
    } catch (e) {
      console.error("nieuwsbrief: eerste verzendronde mislukt", e);
    }
  });
}

function vernieuw(id?: string) {
  revalidatePath(PAD);
  revalidatePath("/admin/nieuwsbrief");
  if (id) revalidatePath(`${PAD}/${id}`);
}

function leesId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  return UUID_PATROON.test(id) ? id : "";
}

// Overzicht ---------------------------------------------------------------------------

export async function nieuweCampagne() {
  await vereisBeheerder();
  const datum = new Date().toLocaleDateString("nl-NL", { timeZone: "Europe/Amsterdam", day: "numeric", month: "long", year: "numeric" });
  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .insert({
      soort: "campagne",
      naam: `Nieuwsbrief ${datum}`,
      blokken: [
        { id: "kop", soort: "kop", tekst: "" },
        { id: "tekst", soort: "tekst", tekst: "Hoi {voornaam},\n\n" },
      ],
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAD}?fout=aanmaken`);
  vernieuw();
  redirect(`${PAD}/${data.id}`);
}

export async function dupliceerCampagne(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  const c = id ? await haalCampagne(id) : null;
  if (!c || c.soort !== "campagne") redirect(`${PAD}?fout=onbekend`);
  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .insert({
      soort: "campagne",
      naam: `Kopie van ${c.naam}`.slice(0, 120),
      onderwerp: c.onderwerp,
      preheader: c.preheader,
      blokken: c.blokken,
      doelgroep: c.doelgroep,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAD}?fout=dupliceren`);
  vernieuw();
  redirect(`${PAD}/${data.id}?gekopieerd=1`);
}

export async function verwijderCampagne(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  if (!id) redirect(`${PAD}?fout=onbekend`);
  const { data } = await adminClient()
    .from("nb_campagnes")
    .delete()
    .eq("id", id)
    .eq("soort", "campagne")
    .eq("status", "concept")
    .select("id");
  vernieuw();
  redirect(data?.length ? `${PAD}?verwijderd=1` : `${PAD}?fout=verwijderen`);
}

// Verzenden ---------------------------------------------------------------------------

export async function verzendNu(id: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const r = await startCampagne(id);
  if (!r.ok) return { ok: false, fouten: r.fouten };
  if (r.aantal > 0) verwerkStraks();
  vernieuw(id);
  return {
    ok: true,
    bericht:
      r.aantal === 0
        ? "Er waren geen ontvangers in deze doelgroep; er is niets verstuurd."
        : `De campagne wordt nu verstuurd naar ${r.aantal.toLocaleString("nl-NL")} ${r.aantal === 1 ? "ontvanger" : "ontvangers"}.`,
  };
}

export async function planIn(id: string, moment: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const tijd = amsterdamNaarUtc(String(moment ?? ""));
  const fout = controleerInplanmoment(tijd);
  if (fout || !tijd) return { ok: false, fouten: [fout ?? "Kies een geldige datum en tijd."] };
  const c = await haalCampagne(id);
  if (!c || c.soort !== "campagne") return { ok: false, fouten: ["Onbekende campagne."] };
  const problemen = verzendProblemen(c);
  if (problemen.length) return { ok: false, fouten: problemen };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "ingepland", ingepland_op: tijd.toISOString() })
    .eq("id", id)
    .in("status", ["concept", "ingepland"])
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Deze campagne wordt al verzonden."] };
  vernieuw(id);
  return { ok: true, bericht: `Ingepland voor ${toonDatumTijd(tijd)}.` };
}

export async function annuleerPlanning(id: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "concept", ingepland_op: null })
    .eq("id", id)
    .eq("status", "ingepland")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Deze campagne was niet (meer) ingepland. Mogelijk wordt hij al verzonden."] };
  vernieuw(id);
  return { ok: true, bericht: "De planning is geannuleerd. De campagne is weer een concept." };
}

export async function pauzeer(id: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "gepauzeerd" })
    .eq("id", id)
    .eq("status", "bezig")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Pauzeren kan alleen terwijl de campagne wordt verstuurd."] };
  vernieuw(id);
  return { ok: true, bericht: "Gepauzeerd. Mails die al onderweg waren, worden nog afgemaakt." };
}

export async function hervat(id: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "bezig" })
    .eq("id", id)
    .eq("status", "gepauzeerd")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Deze campagne was niet gepauzeerd."] };
  verwerkStraks();
  vernieuw(id);
  return { ok: true, bericht: "Het verzenden gaat weer verder." };
}

export async function probeerOpnieuw(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  if (!id) redirect(`${PAD}?fout=onbekend`);
  const n = await probeerMisluktOpnieuw(id);
  if (n > 0) verwerkStraks();
  vernieuw(id);
  redirect(`${PAD}/${id}/rapport?opnieuw=${n}`);
}
