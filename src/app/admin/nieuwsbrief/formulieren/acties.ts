"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { registreerSlugWijziging } from "@/lib/doorverwijzingen/beheer";
import { FORMULIER_VELDEN, kopieSlug, valideerFormulier, type Formulier } from "@/lib/nieuwsbrief/formulierregels";

const PAD = "/admin/nieuwsbrief/formulieren";

export type BewaarStaat = { fouten: string[] } | null;

function melding(naar: string, tekst: string, soort: "ok" | "fout" = "ok"): never {
  redirect(`${naar}?${soort}=${encodeURIComponent(tekst)}`);
}

function formulierId(fd: FormData): string {
  const id = String(fd.get("id") ?? "");
  if (!UUID_PATROON.test(id)) melding(PAD, "Onbekend formulier.", "fout");
  return id;
}

/** Of een slug al door een ander formulier wordt gebruikt. */
async function slugBezet(slug: string, behalveId: string | null): Promise<boolean> {
  let q = adminClient().from("nb_formulieren").select("id").eq("slug", slug);
  if (behalveId) q = q.neq("id", behalveId);
  const { data } = await q.limit(1);
  return Boolean(data?.length);
}

function ververs(slug?: string) {
  vernieuwPubliekeData("nb_formulieren");
  revalidatePath(PAD);
  if (slug) revalidatePath(`/nieuwsbrief/${slug}`);
}

/** Maakt een formulier aan of slaat een bestaand op (useActionState). */
export async function bewaarFormulier(_vorige: BewaarStaat, fd: FormData): Promise<BewaarStaat> {
  await vereisBeheerder("nieuwsbrief");
  const ruwId = String(fd.get("id") ?? "");
  const id = UUID_PATROON.test(ruwId) ? ruwId : null;
  const ruw: Record<string, unknown> = Object.fromEntries(
    ["naam", "slug", "titel", "tekst", "knop", "succes_tekst", "toestemming_tekst", "naam_veld", "tags", "dubbele_opt_in", "eigen_pagina", "actief"].map(
      (k) => [k, fd.get(k)],
    ),
  );
  const v = valideerFormulier(ruw);
  if (!v.ok) return { fouten: v.fouten };
  if (await slugBezet(v.waarden.slug, id)) {
    return { fouten: [`De slug ‘${v.waarden.slug}’ wordt al door een ander formulier gebruikt. Kies een andere.`] };
  }

  const supabase = adminClient();
  let nieuwId = id;
  let oudeSlug: string | undefined;
  if (id) {
    const { data: oud } = await supabase.from("nb_formulieren").select("slug, eigen_pagina, actief").eq("id", id).maybeSingle();
    if (!oud) return { fouten: ["Dit formulier bestaat niet (meer)."] };
    oudeSlug = oud.slug as string;
    const { error } = await supabase.from("nb_formulieren").update(v.waarden).eq("id", id);
    if (error) return { fouten: [error.code === "23505" ? "Deze slug is al in gebruik." : `Opslaan mislukt: ${error.message}`] };
    // Stond de eigen pagina online, dan verwijst het oude adres voortaan naar het nieuwe.
    if (oud.eigen_pagina && oud.actief && v.waarden.eigen_pagina && v.waarden.actief && oudeSlug !== v.waarden.slug) {
      await registreerSlugWijziging(`/nieuwsbrief/${oudeSlug}`, `/nieuwsbrief/${v.waarden.slug}`);
    }
  } else {
    const { data, error } = await supabase.from("nb_formulieren").insert(v.waarden).select("id").single();
    if (error || !data) {
      return { fouten: [error?.code === "23505" ? "Deze slug is al in gebruik." : `Aanmaken mislukt: ${error?.message ?? "onbekende fout"}`] };
    }
    nieuwId = data.id as string;
  }
  ververs(v.waarden.slug);
  if (oudeSlug && oudeSlug !== v.waarden.slug) ververs(oudeSlug);
  melding(`${PAD}/${nieuwId}`, id ? "Opgeslagen." : "Formulier aangemaakt.");
}

/** Maakt een kopie (uitgeschakeld) en opent die. */
export async function dupliceerFormulier(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief");
  const id = formulierId(fd);
  const supabase = adminClient();
  const { data } = await supabase.from("nb_formulieren").select(FORMULIER_VELDEN).eq("id", id).maybeSingle();
  const f = data as Formulier | null;
  if (!f) melding(PAD, "Dit formulier bestaat niet (meer).", "fout");
  const { data: slugs } = await supabase.from("nb_formulieren").select("slug").like("slug", `${f.slug.slice(0, 40)}%`);
  const { data: kopie, error } = await supabase
    .from("nb_formulieren")
    .insert({
      naam: `${f.naam} (kopie)`.slice(0, 100),
      slug: kopieSlug(f.slug, ((slugs ?? []) as { slug: string }[]).map((s) => s.slug)),
      titel: f.titel,
      tekst: f.tekst,
      knop: f.knop,
      succes_tekst: f.succes_tekst,
      toestemming_tekst: f.toestemming_tekst,
      naam_veld: f.naam_veld,
      tags: f.tags,
      dubbele_opt_in: f.dubbele_opt_in,
      eigen_pagina: f.eigen_pagina,
      actief: false,
    })
    .select("id")
    .single();
  if (error || !kopie) melding(PAD, `Kopiëren mislukt: ${error?.message ?? "onbekende fout"}`, "fout");
  ververs();
  melding(`${PAD}/${kopie.id}`, "Kopie gemaakt. De kopie staat nog uit: pas hem aan en zet hem daarna aan.");
}

/** Verwijdert een formulier. Contacten blijven bestaan; hun koppeling (formulier_id) wordt leeg. */
export async function verwijderFormulier(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief");
  const id = formulierId(fd);
  const { data, error } = await adminClient().from("nb_formulieren").delete().eq("id", id).select("slug, naam");
  if (error) melding(`${PAD}/${id}`, `Verwijderen mislukt: ${error.message}`, "fout");
  const weg = (data ?? [])[0] as { slug: string; naam: string } | undefined;
  ververs(weg?.slug);
  melding(
    PAD,
    weg
      ? `Formulier ‘${weg.naam}’ verwijderd. De contacten die zich ermee aanmeldden blijven gewoon aangemeld.`
      : "Dit formulier bestond niet (meer).",
  );
}

/** Zet een formulier aan of uit. */
export async function zetFormulierActief(fd: FormData): Promise<void> {
  await vereisBeheerder("nieuwsbrief");
  const id = formulierId(fd);
  const actief = fd.get("actief") === "true";
  const terug = fd.get("terug") === "lijst" ? PAD : `${PAD}/${id}`;
  const { data, error } = await adminClient().from("nb_formulieren").update({ actief }).eq("id", id).select("slug");
  if (error) melding(terug, `Wijzigen mislukt: ${error.message}`, "fout");
  ververs((data ?? [])[0]?.slug as string | undefined);
  melding(terug, actief ? "Formulier staat aan." : "Formulier staat uit: het verschijnt niet meer op de website.");
}

/** Formulieren om een campagne-doelgroep op te filteren (Beheer → Campagnes → Ontvangers). */
export async function formulierKeuzes(): Promise<{ id: string; naam: string; actief: boolean }[]> {
  await vereisBeheerder("nieuwsbrief");
  const { data } = await adminClient().from("nb_formulieren").select("id, naam, actief").order("naam");
  return (data ?? []) as { id: string; naam: string; actief: boolean }[];
}
