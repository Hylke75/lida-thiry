"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import {
  haalCampagne,
  kiesAbWinnaar,
  probeerMisluktOpnieuw,
  startCampagne,
  verwerkWachtrij,
  verzendProblemen,
} from "@/lib/nieuwsbrief/verzenden";
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
  await vereisBeheerder("nieuwsbrief");
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
  await vereisBeheerder("nieuwsbrief");
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
      onderwerp_b: c.onderwerp_b,
      ab_percentage: c.ab_percentage,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAD}?fout=dupliceren`);
  vernieuw();
  redirect(`${PAD}/${data.id}?gekopieerd=1`);
}

export async function verwijderCampagne(formData: FormData) {
  await vereisBeheerder("nieuwsbrief");
  const id = leesId(formData);
  if (!id) redirect(`${PAD}?fout=onbekend`);
  const { data } = await adminClient()
    .from("nb_campagnes")
    .delete()
    .eq("id", id)
    .eq("soort", "campagne")
    .eq("status", "concept")
    .select("id");
  if (data?.length) await logActie({ actie: "campagne.verwijderen", onderwerpSoort: "campagne", onderwerpId: id, omschrijving: "Conceptcampagne verwijderd" });
  vernieuw();
  redirect(data?.length ? `${PAD}?verwijderd=1` : `${PAD}?fout=verwijderen`);
}

// Verzenden ---------------------------------------------------------------------------

export async function verzendNu(id: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const r = await startCampagne(id);
  if (!r.ok) return { ok: false, fouten: r.fouten };
  if (r.aantal > 0) verwerkStraks();
  await logActie({
    actie: "campagne.verzenden",
    onderwerpSoort: "campagne",
    onderwerpId: id,
    omschrijving: r.testgroep
      ? `A/B-test gestart (${r.testgroep} van ${r.aantal} ontvangers)`
      : `Campagne verzonden naar ${r.aantal} ontvanger(s)`,
    details: { aantal: r.aantal, testgroep: r.testgroep ?? null },
  });
  vernieuw(id);
  return {
    ok: true,
    bericht:
      r.aantal === 0
        ? "Er waren geen ontvangers in deze doelgroep; er is niets verstuurd."
        : r.testgroep
          ? `De A/B-test is gestart: ${r.testgroep.toLocaleString("nl-NL")} van de ${r.aantal.toLocaleString("nl-NL")} ontvangers krijgen nu onderwerp A of B. Na de wachttijd krijgt de rest het winnende onderwerp.`
          : `De campagne wordt nu verstuurd naar ${r.aantal.toLocaleString("nl-NL")} ${r.aantal === 1 ? "ontvanger" : "ontvangers"}.`,
  };
}

/** A/B-test: kies nu de winnaar (op basis van de cijfers tot nu toe) en verstuur naar de rest. */
export async function kiesWinnaarNu(id: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  let r;
  try {
    r = await kiesAbWinnaar(id, { direct: true });
  } catch (e) {
    return { ok: false, fouten: [`De rest van de doelgroep kon niet worden ingepland (${e instanceof Error ? e.message : "onbekend"}).`] };
  }
  if (!r.ok) return { ok: false, fouten: [r.fout] };
  await logActie({
    actie: "campagne.winnaar_kiezen",
    onderwerpSoort: "campagne",
    onderwerpId: id,
    omschrijving: `A/B-test: onderwerp ${r.winnaar.toUpperCase()} gekozen; rest van de doelgroep ingepland`,
  });
  verwerkStraks();
  vernieuw(id);
  revalidatePath(`${PAD}/${id}/rapport`);
  const reden = r.reden === "open" ? "meer geopend" : r.reden === "klik" ? "evenveel geopend, meer geklikt" : "gelijke cijfers; dan wint A";
  return {
    ok: true,
    bericht: `Onderwerp ${r.winnaar.toUpperCase()} wint (${reden}). De rest van de doelgroep krijgt nu dit onderwerp.`,
  };
}

/** Formulierversie van kiesWinnaarNu (voor het rapport). */
export async function kiesWinnaarNuFormulier(formData: FormData) {
  await vereisBeheerder("nieuwsbrief");
  const id = leesId(formData);
  if (!id) redirect(`${PAD}?fout=onbekend`);
  const r = await kiesWinnaarNu(id);
  redirect(`${PAD}/${id}/rapport?${r.ok ? "winnaar=1" : "winnaar=0"}`);
}

export async function planIn(id: string, moment: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
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
  await logActie({
    actie: "campagne.inplannen",
    onderwerpSoort: "campagne",
    onderwerpId: id,
    omschrijving: `Campagne ‘${c.naam ?? c.onderwerp ?? ""}’ ingepland voor ${toonDatumTijd(tijd)}`,
    details: { moment: tijd.toISOString() },
  });
  vernieuw(id);
  return { ok: true, bericht: `Ingepland voor ${toonDatumTijd(tijd)}.` };
}

export async function annuleerPlanning(id: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "concept", ingepland_op: null })
    .eq("id", id)
    .eq("status", "ingepland")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Deze campagne was niet (meer) ingepland. Mogelijk wordt hij al verzonden."] };
  await logActie({ actie: "campagne.planning_annuleren", onderwerpSoort: "campagne", onderwerpId: id, omschrijving: "Planning geannuleerd (weer concept)" });
  vernieuw(id);
  return { ok: true, bericht: "De planning is geannuleerd. De campagne is weer een concept." };
}

export async function pauzeer(id: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "gepauzeerd" })
    .eq("id", id)
    .eq("status", "bezig")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Pauzeren kan alleen terwijl de campagne wordt verstuurd."] };
  await logActie({ actie: "campagne.pauzeren", onderwerpSoort: "campagne", onderwerpId: id, omschrijving: "Verzenden gepauzeerd" });
  vernieuw(id);
  return { ok: true, bericht: "Gepauzeerd. Mails die al onderweg waren, worden nog afgemaakt." };
}

export async function hervat(id: string): Promise<Uitkomst> {
  await vereisBeheerder("nieuwsbrief");
  if (!UUID_PATROON.test(id)) return { ok: false, fouten: ["Onbekende campagne."] };
  const { data } = await adminClient()
    .from("nb_campagnes")
    .update({ status: "bezig" })
    .eq("id", id)
    .eq("status", "gepauzeerd")
    .select("id")
    .maybeSingle();
  if (!data) return { ok: false, fouten: ["Deze campagne was niet gepauzeerd."] };
  await logActie({ actie: "campagne.hervatten", onderwerpSoort: "campagne", onderwerpId: id, omschrijving: "Verzenden hervat" });
  verwerkStraks();
  vernieuw(id);
  return { ok: true, bericht: "Het verzenden gaat weer verder." };
}

export async function probeerOpnieuw(formData: FormData) {
  await vereisBeheerder("nieuwsbrief");
  const id = leesId(formData);
  if (!id) redirect(`${PAD}?fout=onbekend`);
  const n = await probeerMisluktOpnieuw(id);
  if (n > 0) verwerkStraks();
  if (n > 0) await logActie({ actie: "campagne.opnieuw_proberen", onderwerpSoort: "campagne", onderwerpId: id, omschrijving: `${n} mislukte mail(s) opnieuw ingepland` });
  vernieuw(id);
  redirect(`${PAD}/${id}/rapport?opnieuw=${n}`);
}
