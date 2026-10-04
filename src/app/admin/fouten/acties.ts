"use server";

import { randomBytes } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { registreerFout } from "@/lib/fouten/registreer";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

const PAD = "/admin/fouten";

/** Terug naar een pagina binnen Fouten, met een melding. */
function terug(naar: string, melding: string, soort: "ok" | "fout" = "ok"): never {
  const basis = naar.startsWith(PAD) && !naar.includes("//") ? naar : PAD;
  const url = new URL(basis, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("fout");
  url.searchParams.set(soort, melding);
  redirect(`${url.pathname}${url.search}`);
}

function foutId(fd: FormData): string {
  const id = String(fd.get("id") ?? "");
  if (!UUID_PATROON.test(id)) terug(PAD, "Onbekende fout.", "fout");
  return id;
}

/** Waarheen na de actie: het meegestuurde adres (lijst met filters) of de detailpagina. */
function terugNaar(fd: FormData, id: string): string {
  const naar = String(fd.get("terug") ?? "");
  return naar.startsWith(PAD) ? naar : `${PAD}/${id}`;
}

export async function markeerOpgelost(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const id = foutId(fd);
  // gemeld_op leeg: komt de fout terug, dan volgt er weer een mail (zie meldReden).
  const { error } = await adminClient().from("fouten_log").update({ opgelost: true, gemeld_op: null }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(PAD);
  terug(terugNaar(fd, id), "Gemarkeerd als opgelost. Komt de fout terug, dan krijg je weer een mail.");
}

export async function heropen(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const id = foutId(fd);
  const { error } = await adminClient().from("fouten_log").update({ opgelost: false }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(PAD);
  terug(terugNaar(fd, id), "De fout staat weer open.");
}

export async function verwijderFout(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const id = foutId(fd);
  const { error } = await adminClient().from("fouten_log").delete().eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Verwijderen mislukt: ${error.message}`, "fout");
  revalidatePath(PAD);
  terug(PAD, "Fout verwijderd.");
}

/**
 * Testfout om de keten te controleren: registreert via de gewone weg een fout
 * met een eigen vingerafdruk (dus elke keer "nieuw", met mail), en gooit daarna
 * een echte fout in deze server action, die via instrumentation.ts (onRequestError)
 * binnenkomt. Zo zijn zowel de foutlog en de mail als de serverkoppeling getest.
 */
export async function veroorzaakTestfout(): Promise<void> {
  const gebruiker = await vereisBeheerder();
  const kenmerk = randomBytes(3).toString("hex");
  await registreerFout({
    bron: "test",
    fout: new Error(`Testfout uit het beheer (kenmerk ${kenmerk})`),
    pad: PAD,
    vingerafdruk: `test-${Date.now()}-${kenmerk}`,
    details: { door: gebruiker.id, toelichting: "Aangemaakt met de knop Testfout veroorzaken." },
  });
  revalidatePath(PAD);
  throw new Error("Testfout uit het beheer (server action). Deze hoort in de foutlog te verschijnen met bron Server.");
}
