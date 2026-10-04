"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { datumTijd, ontleedTags } from "@/lib/nieuwsbrief/contactregels";
import { normaliseerTag } from "@/lib/nieuwsbrief/doelgroep";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { RELATIE_VELDEN, schoonGegevens, type Relatie } from "@/lib/relaties/regels";
import { controleerRelatieInvoer, type VeldFouten } from "@/lib/relaties/formulier";
import { planSamenvoeging, SAMENVOEG_VELDEN, voegNotitieToe, type Keuzes } from "@/lib/relaties/dubbel";
import type { RelatieImportRij } from "@/lib/relaties/csv";
import { weergaveNaam } from "@/lib/relaties/zoeken";
import {
  importeerRelaties,
  relatieMetEmail,
  relatieOpId,
  vergeetRelatie,
  verwijderRelaties,
  voerSamenvoegingUit,
  voorbeeldImportRelaties,
  wijzigTagRelaties,
  type ImportTelling,
} from "@/lib/relaties/beheer";
import { PAD, terugUrl } from "./ui";

const foutTekst = (e: unknown) => (e instanceof Error ? e.message : String(e));

function terug(naar: string, melding: string, soort: "ok" | "fout" = "ok"): never {
  redirect(terugUrl(naar, melding, soort));
}

function ids(fd: FormData): string[] {
  return [...new Set(fd.getAll("id").map(String).filter((id) => UUID_PATROON.test(id)))].slice(0, 1000);
}

function relatieId(fd: FormData, veld = "id"): string {
  const id = String(fd.get(veld) ?? "");
  if (!UUID_PATROON.test(id)) terug(PAD, "Onbekende relatie.", "fout");
  return id;
}

// Lijst ------------------------------------------------------------------------------

export async function bulkActie(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const terugNaar = String(fd.get("terug") ?? PAD);
  const gekozen = ids(fd);
  const actie = String(fd.get("actie") ?? "");
  const tag = normaliseerTag(String(fd.get("tag") ?? ""));
  if (!gekozen.length) terug(terugNaar, "Selecteer eerst een of meer relaties.", "fout");
  if (!["tag_toevoegen", "tag_verwijderen", "verwijderen"].includes(actie)) {
    terug(terugNaar, "Kies wat je met de selectie wilt doen.", "fout");
  }
  if (actie.startsWith("tag_") && !tag) terug(terugNaar, "Vul een tag in.", "fout");

  let melding: string;
  try {
    if (actie === "tag_toevoegen") {
      melding = `Tag ‘${tag}’ toegevoegd bij ${await wijzigTagRelaties(gekozen, tag, "toevoegen")} relatie(s).`;
    } else if (actie === "tag_verwijderen") {
      melding = `Tag ‘${tag}’ weggehaald bij ${await wijzigTagRelaties(gekozen, tag, "verwijderen")} relatie(s).`;
    } else {
      melding = `${await verwijderRelaties(gekozen)} relatie(s) uit het adresboek verwijderd.`;
    }
  } catch (e) {
    terug(terugNaar, `Mislukt: ${foutTekst(e)}`, "fout");
  }
  revalidatePath(PAD);
  terug(terugNaar, melding);
}

// Nieuw / bewerken -------------------------------------------------------------------

export interface FormulierStatus {
  fout?: string;
  veldFouten?: VeldFouten;
  /** Een andere relatie heeft dit e-mailadres al. */
  bestaand?: { id: string; naam: string };
}

export async function bewaarRelatie(_vorige: FormulierStatus, fd: FormData): Promise<FormulierStatus> {
  await vereisBeheerder();
  const idRuw = String(fd.get("id") ?? "");
  const id = UUID_PATROON.test(idRuw) ? idRuw : null;
  const { invoer, fouten } = controleerRelatieInvoer(Object.fromEntries(fd));
  if (Object.keys(fouten).length) return { fout: "Controleer de gemarkeerde velden.", veldFouten: fouten };

  if (invoer.email) {
    const ander = await relatieMetEmail(invoer.email, id ?? undefined);
    if (ander) {
      return {
        fout: "Er staat al een relatie met dit e-mailadres in het adresboek.",
        veldFouten: { email: "Dit e-mailadres is al in gebruik." },
        bestaand: { id: ander.id, naam: weergaveNaam(ander) },
      };
    }
  }

  const supabase = adminClient();
  const { data, error } = id
    ? await supabase.from("relaties").update(invoer).eq("id", id).select("id").maybeSingle()
    : await supabase.from("relaties").insert({ ...invoer, bron: "handmatig" }).select("id").single();
  if (error) {
    if (error.code === "23505") return { fout: "Er staat al een relatie met dit e-mailadres in het adresboek.", veldFouten: { email: "Dit e-mailadres is al in gebruik." } };
    return { fout: `Opslaan mislukt: ${error.message}` };
  }
  if (!data) return { fout: "Deze relatie bestaat niet (meer)." };
  revalidatePath(PAD);
  terug(`${PAD}/${data.id}`, id ? "Opgeslagen." : "Relatie toegevoegd.");
}

export async function voegNotitieToeActie(fd: FormData): Promise<void> {
  const user = await vereisBeheerder();
  const id = relatieId(fd);
  const tekst = String(fd.get("notitie") ?? "").slice(0, 5000);
  if (!tekst.trim()) terug(`${PAD}/${id}`, "Schrijf eerst een notitie.", "fout");
  const r = await relatieOpId(id);
  if (!r) terug(PAD, "Deze relatie bestaat niet (meer).", "fout");
  const notities = voegNotitieToe(r.notities, tekst, datumTijd(new Date()), user.email ?? null);
  const { error } = await adminClient().from("relaties").update({ notities }).eq("id", id);
  if (error) terug(`${PAD}/${id}`, `Notitie opslaan mislukt: ${error.message}`, "fout");
  revalidatePath(`${PAD}/${id}`);
  terug(`${PAD}/${id}`, "Notitie toegevoegd.");
}

// AVG --------------------------------------------------------------------------------

export async function vergeetActie(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const id = relatieId(fd);
  const r = await relatieOpId(id);
  if (!r) terug(PAD, "Deze relatie bestond niet (meer).", "fout");
  let uitkomst;
  try {
    uitkomst = await vergeetRelatie(r, { nieuwsbrief: fd.get("nieuwsbrief") === "on", berichten: fd.get("berichten") === "on" });
  } catch (e) {
    terug(`${PAD}/${id}`, `Verwijderen mislukt: ${foutTekst(e)}`, "fout");
  }
  const extra = [
    uitkomst.nieuwsbrief ? "het nieuwsbriefcontact" : "",
    uitkomst.berichten ? `${uitkomst.berichten} contactbericht(en)` : "",
  ].filter(Boolean);
  revalidatePath(PAD);
  terug(PAD, `${weergaveNaam(r)} is uit het adresboek verwijderd${extra.length ? `, net als ${extra.join(" en ")}` : ""}.`);
}

// Samenvoegen ------------------------------------------------------------------------

export async function voegSamenActie(fd: FormData): Promise<void> {
  await vereisBeheerder();
  const blijftId = relatieId(fd, "blijft");
  const wegId = relatieId(fd, "weg");
  const terugNaar = `${PAD}/dubbel?a=${blijftId}&b=${wegId}`;
  if (blijftId === wegId) terug(terugNaar, "Kies twee verschillende relaties.", "fout");
  const { data, error } = await adminClient().from("relaties").select(RELATIE_VELDEN).in("id", [blijftId, wegId]);
  if (error) terug(terugNaar, `Laden mislukt: ${error.message}`, "fout");
  const rijen = (data ?? []) as Relatie[];
  const blijft = rijen.find((r) => r.id === blijftId);
  const weg = rijen.find((r) => r.id === wegId);
  if (!blijft || !weg) terug(`${PAD}/dubbel`, "Een van beide relaties bestaat niet meer.", "fout");

  const keuzes: Partial<Keuzes> = {};
  for (const v of SAMENVOEG_VELDEN) {
    const k = fd.get(`veld_${v}`);
    if (k === "blijft" || k === "weg") keuzes[v] = k;
  }
  const plan = planSamenvoeging(blijft, weg, keuzes, datumTijd(new Date()));
  try {
    await voerSamenvoegingUit(plan);
  } catch (e) {
    terug(terugNaar, `Samenvoegen mislukt: ${foutTekst(e)}`, "fout");
  }
  revalidatePath(PAD);
  terug(`${PAD}/${blijftId}`, "Samengevoegd. De andere relatie is verwijderd en de notities en tags zijn overgenomen.");
}

// Import -----------------------------------------------------------------------------

/** Maximaal aantal rijen per aanroep (de browser stuurt grote bestanden in delen). */
const PER_DEEL = 1000;

/** Controleert rijen uit de browser opnieuw: de server vertrouwt de invoer niet. */
function schoneRijen(ruw: unknown): Pick<RelatieImportRij, "gegevens" | "tags">[] {
  if (!Array.isArray(ruw)) return [];
  const gezien = new Set<string>();
  const uit: Pick<RelatieImportRij, "gegevens" | "tags">[] = [];
  for (const r of ruw.slice(0, PER_DEEL)) {
    if (!r || typeof r !== "object") continue;
    const o = r as { gegevens?: unknown; tags?: unknown };
    const gegevens = schoonGegevens(o.gegevens && typeof o.gegevens === "object" ? (o.gegevens as Record<string, unknown>) : {});
    if (!gegevens.email || gezien.has(gegevens.email)) continue;
    gezien.add(gegevens.email);
    const tags = Array.isArray(o.tags) ? ontleedTags(o.tags.filter((t): t is string => typeof t === "string").join("|")) : [];
    uit.push({ gegevens: gegevens as RelatieImportRij["gegevens"], tags });
  }
  return uit;
}

type ImportAntwoord = { ok: true; telling: ImportTelling } | { ok: false; fout: string };

const extraTag = (t: unknown) => (typeof t === "string" && t.trim() ? t : null);

export async function controleerRelatieImport(rijen: unknown, tag?: string): Promise<ImportAntwoord> {
  await vereisBeheerder();
  try {
    return { ok: true, telling: await voorbeeldImportRelaties(schoneRijen(rijen), extraTag(tag)) };
  } catch (e) {
    return { ok: false, fout: `Controleren mislukt: ${foutTekst(e)}` };
  }
}

export async function voerRelatieImportUit(rijen: unknown, tag?: string): Promise<ImportAntwoord> {
  await vereisBeheerder();
  const schoon = schoneRijen(rijen);
  if (!schoon.length) return { ok: false, fout: "Er staan geen geldige rijen in dit deel." };
  try {
    const telling = await importeerRelaties(schoon, extraTag(tag));
    revalidatePath(PAD);
    return { ok: true, telling };
  } catch (e) {
    return { ok: false, fout: `Importeren mislukt: ${foutTekst(e)}` };
  }
}
