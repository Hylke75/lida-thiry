"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { foutTekst } from "@/lib/beheermelding";
import { BERICHT_VELDEN, verstuurAntwoord, type ContactBericht } from "@/lib/contact/berichten";
import { MAX, valideerAntwoord, type BerichtStatus } from "@/lib/contact/regels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

const PAD = "/admin/berichten";

/** Terug naar een pagina binnen Berichten, met een melding. */
function terug(naar: string, melding: string, soort: "ok" | "fout" = "ok"): never {
  const basis = naar.startsWith(PAD) && !naar.includes("//") ? naar : PAD;
  const url = new URL(basis, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("fout");
  url.searchParams.set(soort, melding);
  redirect(`${url.pathname}${url.search}`);
}

function berichtId(fd: FormData): string {
  const id = String(fd.get("id") ?? "");
  if (!UUID_PATROON.test(id)) terug(PAD, "Onbekend bericht.", "fout");
  return id;
}

const STATUS_ACTIES: Record<string, { status: BerichtStatus; melding: string }> = {
  ongelezen: { status: "nieuw", melding: "Gemarkeerd als ongelezen." },
  gelezen: { status: "gelezen", melding: "Gemarkeerd als gelezen." },
  archiveren: { status: "gearchiveerd", melding: "Bericht gearchiveerd." },
  terugzetten: { status: "gelezen", melding: "Bericht teruggezet naar de inbox." },
  spam: { status: "spam", melding: "Gemarkeerd als spam." },
  geen_spam: { status: "gelezen", melding: "Gemarkeerd als geen spam; het bericht staat weer in de inbox." },
};

export async function wijzigStatus(fd: FormData): Promise<void> {
  await vereisBeheerder("berichten");
  const id = berichtId(fd);
  const actie = STATUS_ACTIES[String(fd.get("actie") ?? "")];
  if (!actie) terug(`${PAD}/${id}`, "Onbekende actie.", "fout");
  const supabase = adminClient();
  let status = actie.status;
  // Terug uit archief of spam: was er al geantwoord, dan weer ‘beantwoord’.
  if (status === "gelezen") {
    const { count } = await supabase.from("contact_antwoorden").select("id", { count: "exact", head: true }).eq("bericht_id", id);
    if (count) status = "beantwoord";
  }
  const { error } = await supabase.from("contact_berichten").update({ status }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(PAD);
  // Na archiveren, spam of ongelezen terug naar de lijst; anders blijven we op het bericht.
  if (status === "gearchiveerd" || status === "spam" || status === "nieuw") terug(PAD, actie.melding);
  terug(`${PAD}/${id}`, actie.melding);
}

export async function bewaarNotitie(fd: FormData): Promise<void> {
  await vereisBeheerder("berichten");
  const id = berichtId(fd);
  const notitie = String(fd.get("notitie") ?? "").replace(/\r\n?/g, "\n").trim().slice(0, 5_000);
  const { error } = await adminClient().from("contact_berichten").update({ notitie }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Notitie opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, "Notitie opgeslagen.");
}

export async function verwijderBericht(fd: FormData): Promise<void> {
  const ik = await vereisBeheerder("berichten");
  const id = berichtId(fd);
  const { data: weg, error } = await adminClient().from("contact_berichten").delete().eq("id", id).select("email").maybeSingle();
  if (error) terug(`${PAD}/${id}`, `Verwijderen mislukt: ${error.message}`, "fout");
  await logActie({
    actie: "bericht.verwijderen",
    onderwerpSoort: "bericht",
    onderwerpId: id,
    omschrijving: `Contactbericht verwijderd${weg?.email ? ` (van ${weg.email})` : ""}`,
    gebruiker: ik,
  });
  revalidatePath(PAD);
  terug(PAD, "Bericht verwijderd.");
}

export async function beantwoord(fd: FormData): Promise<void> {
  const user = await vereisBeheerder("berichten");
  const id = berichtId(fd);
  const v = valideerAntwoord(String(fd.get("tekst") ?? "").slice(0, MAX.antwoord + 1));
  if (!v.ok) terug(`${PAD}/${id}`, v.fout, "fout");

  const supabase = adminClient();
  const { data, error } = await supabase.from("contact_berichten").select(BERICHT_VELDEN).eq("id", id).maybeSingle();
  if (error || !data) terug(PAD, "Bericht niet gevonden.", "fout");
  const bericht = data as ContactBericht;

  let resendId: string | null;
  try {
    resendId = await verstuurAntwoord(bericht, v.tekst);
  } catch (e) {
    console.error("Antwoord versturen mislukt", e);
    terug(`${PAD}/${id}`, `Het antwoord is niet verstuurd: ${foutTekst(e)}`, "fout");
  }

  const [opslaan, status] = await Promise.all([
    supabase.from("contact_antwoorden").insert({
      bericht_id: id,
      tekst: v.tekst,
      verzonden_door: user.email ?? null,
      resend_id: resendId,
    }),
    supabase.from("contact_berichten").update({ status: "beantwoord" }).eq("id", id),
  ]);
  await logActie({
    actie: "bericht.beantwoorden",
    onderwerpSoort: "bericht",
    onderwerpId: id,
    omschrijving: `Antwoord gestuurd naar ${bericht.email}`,
    details: { lengte: v.tekst.length },
    gebruiker: user,
  });
  revalidatePath(PAD);
  if (opslaan.error || status.error) {
    terug(
      `${PAD}/${id}`,
      `Het antwoord is verstuurd naar ${bericht.email}, maar niet (helemaal) opgeslagen: ${opslaan.error?.message ?? status.error?.message}`,
      "fout",
    );
  }
  terug(`${PAD}/${id}`, `Antwoord verstuurd naar ${bericht.email}.`);
}
