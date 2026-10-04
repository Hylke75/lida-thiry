"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
import { meldAan, normaliseerEmail } from "@/lib/nieuwsbrief/contacten";
import {
  importeer,
  meldContactenAf,
  verwijderContacten,
  voorbeeldImport,
  wijzigTag,
  type ImportResultaat,
  type ImportVoorbeeld,
} from "@/lib/nieuwsbrief/beheer";
import { handmatigeToestemming, ontleedTags } from "@/lib/nieuwsbrief/contactregels";
import { MAX_IMPORT_RIJEN, type ImportRij } from "@/lib/nieuwsbrief/csv";
import { normaliseerTag } from "@/lib/nieuwsbrief/doelgroep";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

const PAD = "/admin/nieuwsbrief/contacten";

const foutTekst = (e: unknown) => (e instanceof Error ? e.message : String(e));

/** Terug naar een pagina binnen het contactbeheer, met een melding. */
function terug(naar: string, melding: string, soort: "ok" | "fout" = "ok"): never {
  const basis = naar.startsWith(PAD) && !naar.includes("//") ? naar : PAD;
  const url = new URL(basis, "http://x");
  url.searchParams.delete("ok");
  url.searchParams.delete("fout");
  url.searchParams.set(soort, melding);
  redirect(`${url.pathname}${url.search}`);
}

function beheerderNaam(user: { email?: string | null }): string {
  return user.email ?? "onbekend";
}

function ids(fd: FormData): string[] {
  return [...new Set(fd.getAll("id").map(String).filter((id) => UUID_PATROON.test(id)))].slice(0, 1000);
}

// Lijst ---------------------------------------------------------------------------

export async function voegContactToe(fd: FormData): Promise<void> {
  const user = await vereisBeheerder("nieuwsbrief_contacten");
  const email = normaliseerEmail(String(fd.get("email") ?? ""));
  if (!email) terug(PAD, "Vul een geldig e-mailadres in.", "fout");
  if (fd.get("toestemming") !== "on") {
    terug(PAD, "Vink aan dat deze persoon toestemming heeft gegeven; zonder toestemming mag je niet mailen.", "fout");
  }
  let uitkomst;
  try {
    uitkomst = await meldAan({
      email,
      naam: String(fd.get("naam") ?? "").trim() || null,
      tags: ontleedTags(String(fd.get("tags") ?? "")),
      bron: "handmatig",
      dubbeleOptIn: false,
      toestemmingTekst: handmatigeToestemming("toegevoegd", beheerderNaam(user)),
    });
  } catch (e) {
    terug(PAD, `Toevoegen mislukt: ${foutTekst(e)}`, "fout");
  }
  revalidatePath(PAD);
  if (uitkomst.soort === "aangemeld") terug(`${PAD}/${uitkomst.contact.id}`, `${email} is aangemeld.`);
  if (uitkomst.soort === "al_aangemeld" && uitkomst.contact.status === "klacht") {
    terug(`${PAD}/${uitkomst.contact.id}`, `${email} heeft de nieuwsbrief als spam gemeld en is daarom niet aangemeld.`, "fout");
  }
  if (uitkomst.soort === "al_aangemeld") {
    terug(`${PAD}/${uitkomst.contact.id}`, `${email} was al aangemeld; eventuele nieuwe tags en naam zijn toegevoegd.`);
  }
  terug(PAD, "Er ging iets mis bij het toevoegen.", "fout");
}

export async function bulkActie(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief_contacten");
  const terugNaar = String(fd.get("terug") ?? PAD);
  const gekozen = ids(fd);
  const actie = String(fd.get("actie") ?? "");
  const tag = normaliseerTag(String(fd.get("tag") ?? ""));
  if (!gekozen.length) terug(terugNaar, "Selecteer eerst een of meer contacten.", "fout");
  if (!["tag_toevoegen", "tag_verwijderen", "afmelden", "verwijderen"].includes(actie)) {
    terug(terugNaar, "Kies wat je met de selectie wilt doen.", "fout");
  }
  if (actie.startsWith("tag_") && !tag) terug(terugNaar, "Vul een tag in.", "fout");

  let melding: string;
  try {
    if (actie === "tag_toevoegen") {
      melding = `Tag ‘${tag}’ toegevoegd bij ${await wijzigTag(gekozen, tag, "toevoegen")} contact(en).`;
    } else if (actie === "tag_verwijderen") {
      melding = `Tag ‘${tag}’ weggehaald bij ${await wijzigTag(gekozen, tag, "verwijderen")} contact(en).`;
    } else if (actie === "afmelden") {
      melding = `${await meldContactenAf(gekozen)} contact(en) afgemeld.`;
    } else {
      melding = `${await verwijderContacten(gekozen)} contact(en) definitief verwijderd.`;
    }
  } catch (e) {
    terug(terugNaar, `Mislukt: ${foutTekst(e)}`, "fout");
  }
  await logActie({
    actie: `contact.bulk_${actie}`,
    onderwerpSoort: "contact",
    omschrijving: melding,
    details: { aantal_gekozen: gekozen.length, tag: tag || undefined, ids: gekozen },
  });
  revalidatePath(PAD);
  terug(terugNaar, melding);
}

// Eén contact -----------------------------------------------------------------------

function contactId(fd: FormData): string {
  const id = String(fd.get("id") ?? "");
  if (!UUID_PATROON.test(id)) terug(PAD, "Onbekend contact.", "fout");
  return id;
}

export async function bewaarContact(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief_contacten");
  const id = contactId(fd);
  const naam = String(fd.get("naam") ?? "").trim().slice(0, 120) || null;
  const tags = ontleedTags(String(fd.get("tags") ?? ""));
  const { error } = await adminClient().from("nb_contacten").update({ naam, tags }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, "Opgeslagen.");
}

export async function meldContactAf(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief_contacten");
  const id = contactId(fd);
  try {
    await meldContactenAf([id]);
  } catch (e) {
    terug(`${PAD}/${id}`, `Afmelden mislukt: ${foutTekst(e)}`, "fout");
  }
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, "Afgemeld. Deze persoon ontvangt geen nieuwsbrieven meer.");
}

export async function meldContactOpnieuwAan(fd: FormData): Promise<void> {
  const user = await vereisBeheerder("nieuwsbrief_contacten");
  const id = contactId(fd);
  if (fd.get("toestemming") !== "on") {
    terug(`${PAD}/${id}`, "Vink aan dat deze persoon opnieuw toestemming heeft gegeven.", "fout");
  }
  const nu = new Date();
  const { data, error } = await adminClient()
    .from("nb_contacten")
    .update({
      status: "aangemeld",
      toestemming_op: nu.toISOString(),
      toestemming_tekst: handmatigeToestemming("opnieuw aangemeld", beheerderNaam(user), nu),
      bevestigd_op: nu.toISOString(),
      afgemeld_op: null,
    })
    .eq("id", id)
    .neq("status", "aangemeld")
    .select("id");
  if (error) terug(`${PAD}/${id}`, `Aanmelden mislukt: ${error.message}`, "fout");
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, data?.length ? "Opnieuw aangemeld." : "Dit contact was al aangemeld.");
}

export async function verwijderContact(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief_contacten");
  const id = contactId(fd);
  let n = 0;
  try {
    n = await verwijderContacten([id]);
  } catch (e) {
    terug(`${PAD}/${id}`, `Verwijderen mislukt: ${foutTekst(e)}`, "fout");
  }
  if (n) await logActie({ actie: "contact.verwijderen", onderwerpSoort: "contact", onderwerpId: id, omschrijving: "Nieuwsbriefcontact definitief verwijderd" });
  revalidatePath(PAD);
  terug(PAD, n ? "Contact en e-mailadres definitief verwijderd." : "Dit contact bestond niet (meer).");
}

// Import ----------------------------------------------------------------------------

/** Controleert rijen uit de browser opnieuw: de server vertrouwt de invoer niet. */
function schoneRijen(ruw: unknown): ImportRij[] {
  if (!Array.isArray(ruw)) return [];
  const gezien = new Set<string>();
  const uit: ImportRij[] = [];
  for (const r of ruw.slice(0, MAX_IMPORT_RIJEN)) {
    if (!r || typeof r !== "object") continue;
    const o = r as Record<string, unknown>;
    const email = normaliseerEmail(typeof o.email === "string" ? o.email : "");
    if (!email || gezien.has(email)) continue;
    gezien.add(email);
    uit.push({
      regel: typeof o.regel === "number" ? o.regel : 0,
      email,
      naam: typeof o.naam === "string" ? o.naam.trim().slice(0, 120) || null : null,
      tags: Array.isArray(o.tags) ? ontleedTags(o.tags.filter((t) => typeof t === "string").join(",")) : [],
    });
  }
  return uit;
}

export async function controleerImport(emails: string[]): Promise<{ ok: true; voorbeeld: ImportVoorbeeld } | { ok: false; fout: string }> {
  await vereisBeheerder("nieuwsbrief_contacten");
  const schoon = schoneRijen(Array.isArray(emails) ? emails.map((email) => ({ email })) : []).map((r) => r.email);
  try {
    return { ok: true, voorbeeld: await voorbeeldImport(schoon) };
  } catch (e) {
    return { ok: false, fout: `Controleren mislukt: ${foutTekst(e)}` };
  }
}

export async function voerImportUit(invoer: {
  rijen: unknown;
  tag?: string;
  toestemming: boolean;
}): Promise<{ ok: true; resultaat: ImportResultaat } | { ok: false; fout: string }> {
  const user = await vereisBeheerder("nieuwsbrief_contacten");
  if (invoer.toestemming !== true) {
    return { ok: false, fout: "Bevestig dat iedereen in het bestand toestemming heeft gegeven." };
  }
  const rijen = schoneRijen(invoer.rijen);
  if (!rijen.length) return { ok: false, fout: "Er staan geen geldige e-mailadressen in het bestand." };
  try {
    const resultaat = await importeer(
      rijen,
      typeof invoer.tag === "string" ? invoer.tag : null,
      handmatigeToestemming("geïmporteerd", beheerderNaam(user)),
    );
    await logActie({
      actie: "contact.importeren",
      onderwerpSoort: "contact",
      omschrijving: `Contacten geïmporteerd: ${resultaat.toegevoegd} nieuw, ${resultaat.bijgewerkt} bijgewerkt, ${resultaat.overgeslagen.length} overgeslagen`,
      details: { rijen: rijen.length, tag: invoer.tag || undefined, toegevoegd: resultaat.toegevoegd, bijgewerkt: resultaat.bijgewerkt, overgeslagen: resultaat.overgeslagen.length },
      gebruiker: user,
    });
    revalidatePath(PAD);
    return { ok: true, resultaat };
  } catch (e) {
    return { ok: false, fout: `Importeren mislukt: ${foutTekst(e)}` };
  }
}
