"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { foutTekst } from "@/lib/beheermelding";
import { koppelRelatie } from "@/lib/relaties/koppel";
import { AFSPRAAK_VELDEN, haalBezetting, haalBlokkades, haalSoort, type AfspraakRij } from "@/lib/afspraken/data";
import { stuurAnnulering, stuurBevestiging } from "@/lib/afspraken/mails";
import { conflicten } from "@/lib/afspraken/slots";
import { leesDatum, tijdNaarMinuten, vanAmsterdam } from "@/lib/afspraken/tijd";
import {
  geldigeUuid,
  INSTELLING_SLEUTELS,
  isAfspraakStatus,
  MAX,
  STATUS_LABEL,
  toegestaneOvergangen,
  valideerBeschikbaarheid,
  valideerBlokkade,
  valideerBoeking,
  valideerSoort,
} from "@/lib/afspraken/regels";

const PAD = "/admin/afspraken";
const INSTELLINGEN = `${PAD}/instellingen`;

/** Terug naar een pagina binnen Afspraken, met een melding. */
function terug(naar: string, melding: string, soort: "ok" | "fout" = "ok"): never {
  const basis = naar.startsWith(PAD) && !naar.includes("//") ? naar : PAD;
  const url = new URL(basis, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("fout");
  url.searchParams.set(soort, melding);
  redirect(`${url.pathname}${url.search}`);
}

function afspraakId(fd: FormData): string {
  const id = String(fd.get("id") ?? "");
  if (!geldigeUuid(id)) terug(PAD, "Onbekende afspraak.", "fout");
  return id;
}

async function haal(id: string): Promise<AfspraakRij> {
  const { data, error } = await adminClient().from("afspraken").select(AFSPRAAK_VELDEN).eq("id", id).maybeSingle();
  if (error) terug(`${PAD}/${id}`, `Laden mislukt: ${error.message}`, "fout");
  if (!data) terug(PAD, "Deze afspraak bestaat niet (meer).", "fout");
  return data as AfspraakRij;
}

// Afspraak ------------------------------------------------------------------------------

export async function wijzigStatus(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = afspraakId(fd);
  const nieuw = String(fd.get("status") ?? "");
  const mailen = fd.get("mail") === "on";
  const reden = String(fd.get("reden") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, MAX.reden);
  const a = await haal(id);
  if (!isAfspraakStatus(nieuw)) terug(`${PAD}/${id}`, "Onbekende status.", "fout");
  const gestart = Date.parse(a.start_op) <= Date.now();
  if (!toegestaneOvergangen(a.status, gestart).includes(nieuw)) {
    terug(`${PAD}/${id}`, `Van ‘${STATUS_LABEL[a.status]}’ naar ‘${STATUS_LABEL[nieuw]}’ kan niet.`, "fout");
  }
  const notitie =
    nieuw === "geannuleerd" && reden ? `${a.notitie ? `${a.notitie}\n` : ""}Geannuleerd door de beheerder: ${reden}` : a.notitie;
  const { data, error } = await adminClient()
    .from("afspraken")
    .update({ status: nieuw, notitie })
    .eq("id", id)
    .eq("status", a.status)
    .select(AFSPRAAK_VELDEN);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  const rij = (data as AfspraakRij[] | null)?.[0];
  if (!rij) terug(`${PAD}/${id}`, "De afspraak is intussen gewijzigd. Bekijk hem opnieuw.", "fout");
  await logActie({
    actie: "afspraak.status",
    onderwerpSoort: "afspraak",
    onderwerpId: id,
    omschrijving: `Afspraak van ${a.naam ?? a.email}: ${STATUS_LABEL[a.status]} → ${STATUS_LABEL[nieuw]}${mailen ? " (met mail)" : ""}`,
    details: { van: a.status, naar: nieuw, mail: mailen, reden: reden || undefined },
  });
  revalidatePath(PAD);

  let melding = `Status gewijzigd naar ‘${STATUS_LABEL[nieuw]}’.`;
  if (mailen && (nieuw === "bevestigd" || nieuw === "geannuleerd")) {
    try {
      if (nieuw === "bevestigd") await stuurBevestiging(rij);
      else await stuurAnnulering(rij, reden || null);
      melding += ` De klant heeft een mail gekregen.`;
    } catch (e) {
      terug(`${PAD}/${id}`, `${melding} Maar de mail kon niet worden verstuurd: ${foutTekst(e)}`, "fout");
    }
  }
  terug(`${PAD}/${id}`, melding);
}

export async function stuurBevestigingOpnieuw(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = afspraakId(fd);
  const a = await haal(id);
  if (a.status !== "bevestigd") terug(`${PAD}/${id}`, "Alleen een bevestigde afspraak kan opnieuw worden bevestigd.", "fout");
  try {
    await stuurBevestiging(a);
  } catch (e) {
    terug(`${PAD}/${id}`, `Versturen mislukt: ${foutTekst(e)}`, "fout");
  }
  terug(`${PAD}/${id}`, `Bevestiging opnieuw verstuurd naar ${a.email}.`);
}

export async function bewaarNotitie(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = afspraakId(fd);
  const notitie = String(fd.get("notitie") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, MAX.notitie);
  const { error } = await adminClient().from("afspraken").update({ notitie }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Notitie opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, "Notitie opgeslagen.");
}

export async function koppelAanAdresboek(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = afspraakId(fd);
  const a = await haal(id);
  const relatie = await koppelRelatie({ email: a.email, naam: a.naam, telefoon: a.telefoon, bron: "handmatig", tags: ["afspraak"] });
  if (!relatie) terug(`${PAD}/${id}`, "Koppelen aan het adresboek is niet gelukt.", "fout");
  const { error } = await adminClient().from("afspraken").update({ relatie_id: relatie.id }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  terug(`${PAD}/${id}`, "Gekoppeld aan het adresboek.");
}

export async function verwijderAfspraak(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("afspraken");
  const id = afspraakId(fd);
  const { data: weg, error } = await adminClient().from("afspraken").delete().eq("id", id).select("email, start_op").maybeSingle();
  if (error) terug(`${PAD}/${id}`, `Verwijderen mislukt: ${error.message}`, "fout");
  if (weg) {
    await logActie({
      actie: "afspraak.verwijderen",
      onderwerpSoort: "afspraak",
      onderwerpId: id,
      omschrijving: `Afspraak van ${weg.email} (${weg.start_op}) verwijderd`,
      gebruiker: ik,
    });
  }
  revalidatePath(PAD);
  terug(PAD, "Afspraak verwijderd.");
}

/**
 * Handmatig inplannen (bijv. na een telefoontje). Los van de beschikbaarheid,
 * maar overlap met andere afspraken of blokkades moet bewust worden bevestigd.
 */
export async function maakAfspraak(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const NIEUW = `${PAD}/nieuw`;
  const soortId = String(fd.get("soort") ?? "");
  const soort = geldigeUuid(soortId) ? await haalSoort(soortId) : null;
  if (!soort) terug(NIEUW, "Kies een soort afspraak.", "fout");
  const datum = String(fd.get("datum") ?? "");
  const tijd = tijdNaarMinuten(String(fd.get("tijd") ?? ""));
  if (!leesDatum(datum) || tijd === null || tijd >= 1440) terug(NIEUW, "Vul een geldige datum en tijd in.", "fout");
  const duurInvoer = Number(String(fd.get("duur") ?? "").trim() || soort.duur_minuten);
  if (!Number.isInteger(duurInvoer) || duurInvoer < 5 || duurInvoer > 720) terug(NIEUW, "De duur ligt tussen 5 en 720 minuten.", "fout");
  const start = vanAmsterdam(datum, tijd);
  const eind = new Date(start.getTime() + duurInvoer * 60_000);

  const v = valideerBoeking({
    soort: soortId,
    start: start.toISOString(),
    naam: fd.get("naam"),
    email: fd.get("email"),
    telefoon: fd.get("telefoon"),
    opmerking: fd.get("opmerking"),
    privacy: true,
  });
  if (!v.ok) terug(NIEUW, Object.values(v.fouten).join(" "), "fout");
  const status = fd.get("status") === "aangevraagd" ? "aangevraagd" : "bevestigd";

  if (fd.get("toch") !== "on") {
    const ruim = { van: new Date(start.getTime() - 86_400_000), tot: new Date(eind.getTime() + 86_400_000) };
    const [afspraken, blokkades] = await Promise.all([haalBezetting(ruim.van, ruim.tot), haalBlokkades(ruim.van, ruim.tot)]);
    const c = conflicten({ afspraken, blokkades, bufferMinuten: soort.buffer_minuten, nu: new Date() }, start, eind);
    if (c.afspraken.length || c.blokkades.length) {
      terug(
        NIEUW,
        `Deze tijd overlapt met ${c.afspraken.length} afspraak/afspraken en ${c.blokkades.length} blokkade(s) (incl. buffer). Vink ‘Toch inplannen’ aan als dat de bedoeling is.`,
        "fout",
      );
    }
  }

  const relatie = await koppelRelatie({ email: v.waarde.email, naam: v.waarde.naam, telefoon: v.waarde.telefoon, bron: "handmatig", tags: ["afspraak"] });
  const { data, error } = await adminClient()
    .from("afspraken")
    .insert({
      soort_id: soort.id,
      relatie_id: relatie?.id ?? null,
      naam: v.waarde.naam,
      email: v.waarde.email,
      telefoon: v.waarde.telefoon,
      opmerking: v.waarde.opmerking,
      start_op: start.toISOString(),
      eind_op: eind.toISOString(),
      status,
      aanbetaling_cent: 0,
      notitie: "Handmatig ingepland in het beheer.",
    })
    .select(AFSPRAAK_VELDEN)
    .single();
  if (error || !data) terug(NIEUW, `Opslaan mislukt: ${error?.message ?? "geen rij"}`, "fout");
  const rij = data as AfspraakRij;
  revalidatePath(PAD);
  if (status === "bevestigd" && fd.get("mail") === "on") {
    try {
      await stuurBevestiging(rij);
    } catch (e) {
      terug(`${PAD}/${rij.id}`, `Afspraak ingepland, maar de bevestiging kon niet worden verstuurd: ${foutTekst(e)}`, "fout");
    }
    terug(`${PAD}/${rij.id}`, "Afspraak ingepland en bevestiging verstuurd.");
  }
  terug(`${PAD}/${rij.id}`, "Afspraak ingepland.");
}

// Instellingen: soorten ----------------------------------------------------------------

export async function bewaarSoort(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = String(fd.get("id") ?? "");
  const v = valideerSoort(Object.fromEntries(fd.entries()));
  if (!v.ok) terug(INSTELLINGEN, v.fouten.join(" "), "fout");
  const supabase = adminClient();
  const { error } = geldigeUuid(id)
    ? await supabase.from("afspraak_soorten").update(v.waarde).eq("id", id)
    : await supabase.from("afspraak_soorten").insert(v.waarde);
  if (error) terug(INSTELLINGEN, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(INSTELLINGEN);
  revalidatePath("/afspraak");
  terug(INSTELLINGEN, geldigeUuid(id) ? `‘${v.waarde.naam}’ opgeslagen.` : `‘${v.waarde.naam}’ toegevoegd.`);
}

export async function verwijderSoort(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = String(fd.get("id") ?? "");
  if (!geldigeUuid(id)) terug(INSTELLINGEN, "Onbekende soort.", "fout");
  const supabase = adminClient();
  const { count } = await supabase.from("afspraken").select("id", { count: "exact", head: true }).eq("soort_id", id);
  if (count) {
    terug(INSTELLINGEN, `Er zijn ${count} afspraak/afspraken van deze soort. Zet de soort op inactief in plaats van hem te verwijderen.`, "fout");
  }
  const { error } = await supabase.from("afspraak_soorten").delete().eq("id", id);
  if (error) terug(INSTELLINGEN, `Verwijderen mislukt: ${error.message}`, "fout");
  revalidatePath(INSTELLINGEN);
  terug(INSTELLINGEN, "Soort verwijderd.");
}

// Instellingen: beschikbaarheid, blokkades en algemeen ----------------------------------

export async function bewaarBeschikbaarheid(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  let blokken: unknown;
  try {
    blokken = JSON.parse(String(fd.get("blokken") ?? "[]"));
  } catch {
    terug(INSTELLINGEN, "De planning kon niet worden gelezen.", "fout");
  }
  if (!Array.isArray(blokken)) terug(INSTELLINGEN, "De planning kon niet worden gelezen.", "fout");
  const v = valideerBeschikbaarheid(blokken as { weekdag: unknown; van: unknown; tot: unknown }[]);
  if (!v.ok) terug(INSTELLINGEN, v.fouten.join(" "), "fout");
  const supabase = adminClient();
  // Eerst de nieuwe blokken toevoegen en dan pas de oude weghalen: mislukt er
  // iets, dan is de planning nooit ineens leeg.
  const { data: oud, error: leesFout } = await supabase.from("beschikbaarheid").select("id");
  if (leesFout) terug(INSTELLINGEN, `Opslaan mislukt: ${leesFout.message}`, "fout");
  if (v.waarde.length) {
    const { error } = await supabase.from("beschikbaarheid").insert(v.waarde);
    if (error) terug(INSTELLINGEN, `Opslaan mislukt: ${error.message}`, "fout");
  }
  const oudeIds = (oud ?? []).map((r) => r.id as string);
  if (oudeIds.length) {
    const { error } = await supabase.from("beschikbaarheid").delete().in("id", oudeIds);
    if (error) terug(INSTELLINGEN, `Oude planning opruimen mislukt: ${error.message}`, "fout");
  }
  revalidatePath(INSTELLINGEN);
  terug(INSTELLINGEN, "Beschikbaarheid opgeslagen.");
}

export async function voegBlokkadeToe(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const v = valideerBlokkade(Object.fromEntries(fd.entries()));
  if (!v.ok) terug(INSTELLINGEN, v.fout, "fout");
  const { error } = await adminClient().from("afspraak_blokkades").insert(v.waarde);
  if (error) terug(INSTELLINGEN, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(INSTELLINGEN);
  terug(INSTELLINGEN, "Blokkade toegevoegd.");
}

export async function verwijderBlokkade(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const id = String(fd.get("id") ?? "");
  if (!geldigeUuid(id)) terug(INSTELLINGEN, "Onbekende blokkade.", "fout");
  const { error } = await adminClient().from("afspraak_blokkades").delete().eq("id", id);
  if (error) terug(INSTELLINGEN, `Verwijderen mislukt: ${error.message}`, "fout");
  revalidatePath(INSTELLINGEN);
  terug(INSTELLINGEN, "Blokkade verwijderd.");
}

export async function bewaarAlgemeen(fd: FormData): Promise<void> {
  await vereisBeheerder("afspraken");
  const min = Number(String(fd.get("min_vooraf_uren") ?? ""));
  const max = Number(String(fd.get("max_vooruit_dagen") ?? ""));
  if (!Number.isInteger(min) || min < 0 || min > 24 * 60) terug(INSTELLINGEN, "‘Minimaal vooraf’ ligt tussen 0 en 1440 uur.", "fout");
  if (!Number.isInteger(max) || max < 1 || max > 730) terug(INSTELLINGEN, "‘Maximaal vooruit’ ligt tussen 1 en 730 dagen.", "fout");
  const handmatig = fd.get("handmatig") === "on" ? "ja" : "nee";
  const supabase = adminClient();
  // Twee aanroepen: zo blijft de omschrijving van de bestaande rijen staan.
  const [a, b] = await Promise.all([
    supabase.from("instellingen").upsert(
      [
        { sleutel: INSTELLING_SLEUTELS.minVoorafUren, waarde: String(min) },
        { sleutel: INSTELLING_SLEUTELS.maxVooruitDagen, waarde: String(max) },
      ],
      { onConflict: "sleutel" },
    ),
    supabase.from("instellingen").upsert(
      {
        sleutel: INSTELLING_SLEUTELS.handmatigBevestigen,
        waarde: handmatig,
        omschrijving: "Afspraken zonder aanbetaling eerst als aanvraag ontvangen en zelf bevestigen (ja/nee).",
      },
      { onConflict: "sleutel" },
    ),
  ]);
  const error = a.error ?? b.error;
  if (error) terug(INSTELLINGEN, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(INSTELLINGEN);
  terug(INSTELLINGEN, "Instellingen opgeslagen.");
}
