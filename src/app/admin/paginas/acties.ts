"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BLOG_AFBEELDING_MAX_BYTES, BLOG_AFBEELDING_TYPES, BLOG_BUCKET, type UploadMap } from "@/lib/blog/beheer";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import {
  PAGINA_VELDEN,
  publicatieProblemen,
  sorteerPaginas,
  valideerPagina,
  verschuif,
  volgordeWijzigingen,
  type Pagina,
} from "@/lib/paginas/beheer";
import { vindStartpagina } from "@/lib/paginas/sjablonen";
import { haalPaginaBeheer, isDubbel, PAGINAS_PAD, SLUG_BEZET, vernieuwPaginas, vrijePaginaSlug } from "./_editor/server";

type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fouten: string[] };

const fout = (...fouten: string[]): { ok: false; fouten: string[] } => ({ ok: false, fouten });

function leesId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  return UUID_PATROON.test(id) ? id : "";
}

/** Volgordenummer achteraan de lijst. */
async function laatsteVolgorde(): Promise<number> {
  const { data } = await adminClient().from("paginas").select("volgorde").order("volgorde", { ascending: false }).limit(1);
  const hoogste = Number(data?.[0]?.volgorde ?? 0);
  return (Number.isFinite(hoogste) ? hoogste : 0) + 10;
}

// Overzicht ---------------------------------------------------------------------------

export async function nieuwePagina() {
  await vereisBeheerder();
  const slug = await vrijePaginaSlug("nieuwe-pagina");
  const { data, error } = await adminClient()
    .from("paginas")
    .insert({ titel: "Nieuwe pagina", slug, volgorde: await laatsteVolgorde() })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAGINAS_PAD}?fout=aanmaken`);
  revalidatePath(PAGINAS_PAD);
  redirect(`${PAGINAS_PAD}/${data.id}?nieuw=1`);
}

/** Maakt een conceptpagina van een startsjabloon ("Over mij", "Contact", …). */
export async function maakStartpagina(formData: FormData) {
  await vereisBeheerder();
  const sjabloon = vindStartpagina(String(formData.get("sjabloon") ?? ""));
  if (!sjabloon) redirect(`${PAGINAS_PAD}?fout=sjabloon`);
  const { data, error } = await adminClient()
    .from("paginas")
    .insert({ ...sjabloon.pagina, slug: await vrijePaginaSlug(sjabloon.pagina.slug), status: "concept" })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAGINAS_PAD}?fout=aanmaken`);
  revalidatePath(PAGINAS_PAD);
  redirect(`${PAGINAS_PAD}/${data.id}?sjabloon=1`);
}

export async function dupliceerPagina(formData: FormData) {
  await vereisBeheerder();
  const p = await haalPaginaBeheer(leesId(formData));
  if (!p) redirect(`${PAGINAS_PAD}?fout=onbekend`);
  const { data, error } = await adminClient()
    .from("paginas")
    .insert({
      titel: `Kopie van ${p.titel}`.slice(0, 200),
      slug: await vrijePaginaSlug(`${p.slug.slice(0, 70)}-kopie`),
      intro: p.intro,
      inhoud: p.inhoud,
      omslag_url: p.omslag_url,
      omslag_alt: p.omslag_alt,
      // Een kopie is een concept en staat (nog) niet in het menu of de footer.
      in_menu: false,
      in_footer: false,
      menu_label: p.menu_label,
      volgorde: await laatsteVolgorde(),
      seo_titel: p.seo_titel,
      seo_omschrijving: p.seo_omschrijving,
      niet_indexeren: p.niet_indexeren,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${PAGINAS_PAD}?fout=dupliceren`);
  revalidatePath(PAGINAS_PAD);
  redirect(`${PAGINAS_PAD}/${data.id}?gekopieerd=1`);
}

export async function verwijderPagina(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  if (!id) redirect(`${PAGINAS_PAD}?fout=onbekend`);
  const { data } = await adminClient().from("paginas").delete().eq("id", id).select("slug");
  if (!data?.length) redirect(`${PAGINAS_PAD}?fout=verwijderen`);
  vernieuwPaginas(data[0].slug as string);
  redirect(`${PAGINAS_PAD}?verwijderd=1`);
}

/** Zet een pagina één plek hoger of lager in de volgorde (menu en footer). */
export async function verplaatsPagina(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  const richting = formData.get("richting") === "omhoog" ? "omhoog" : "omlaag";
  const supabase = adminClient();
  const { data, error } = await supabase.from("paginas").select("id, titel, menu_label, volgorde").limit(500);
  if (error || !data) redirect(`${PAGINAS_PAD}?fout=volgorde`);
  const rijen = sorteerPaginas(data as Pick<Pagina, "id" | "titel" | "menu_label" | "volgorde">[]);
  const wijzigingen = volgordeWijzigingen(rijen, verschuif(rijen.map((r) => r.id), id, richting));
  const resultaten = await Promise.all(wijzigingen.map((w) => supabase.from("paginas").update({ volgorde: w.volgorde }).eq("id", w.id)));
  if (resultaten.some((r) => r.error)) redirect(`${PAGINAS_PAD}?fout=volgorde`);
  vernieuwPaginas();
  redirect(PAGINAS_PAD);
}

// Editor ------------------------------------------------------------------------------

export type PaginaUitkomst = Uitkomst<{ pagina: Pagina; melding: string }>;

/** Slaat de velden op; een gepubliceerde pagina moet daarbij publiceerbaar blijven. */
export async function slaPaginaOp(id: string, ruw: unknown): Promise<PaginaUitkomst> {
  await vereisBeheerder();
  const huidig = await haalPaginaBeheer(id);
  if (!huidig) return fout("Deze pagina bestaat niet (meer).");
  const v = valideerPagina(ruw);
  if (!v.ok) return fout(...v.fouten);
  if (huidig.status === "gepubliceerd") {
    const problemen = publicatieProblemen(v.waarde);
    if (problemen.length) {
      return fout("Deze pagina staat online, dus hij moet compleet blijven. Los dit eerst op, of zet de pagina terug naar concept:", ...problemen);
    }
  }
  const { data, error } = await adminClient().from("paginas").update(v.waarde).eq("id", id).select(PAGINA_VELDEN).single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Opslaan is niet gelukt (${error?.message ?? "onbekend"}).`);
  vernieuwPaginas(huidig.slug, v.waarde.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: "Opgeslagen." };
}

/** Slaat op en zet de pagina online. */
export async function publiceerPagina(id: string, ruw: unknown): Promise<PaginaUitkomst> {
  await vereisBeheerder();
  const huidig = await haalPaginaBeheer(id);
  if (!huidig) return fout("Deze pagina bestaat niet (meer).");
  const v = valideerPagina(ruw);
  if (!v.ok) return fout(...v.fouten);
  const problemen = publicatieProblemen(v.waarde);
  if (problemen.length) return fout("De pagina is nog niet klaar om te publiceren:", ...problemen);
  const { data, error } = await adminClient()
    .from("paginas")
    .update({ ...v.waarde, status: "gepubliceerd" })
    .eq("id", id)
    .select(PAGINA_VELDEN)
    .single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Publiceren is niet gelukt (${error?.message ?? "onbekend"}).`);
  vernieuwPaginas(huidig.slug, v.waarde.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: "Gepubliceerd! De pagina staat nu online." };
}

/** Haalt een pagina offline; de tekst blijft bewaard. */
export async function paginaNaarConcept(id: string): Promise<PaginaUitkomst> {
  await vereisBeheerder();
  const huidig = await haalPaginaBeheer(id);
  if (!huidig) return fout("Deze pagina bestaat niet (meer).");
  const { data, error } = await adminClient().from("paginas").update({ status: "concept" }).eq("id", id).select(PAGINA_VELDEN).single();
  if (error || !data) return fout(`Dat is niet gelukt (${error?.message ?? "onbekend"}).`);
  vernieuwPaginas(huidig.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: "De pagina is weer een concept en niet meer zichtbaar op de site." };
}

/**
 * Stap 1 van een foto uploaden: een eenmalige upload-URL in de openbare bucket
 * "blog", onder paginas/omslag/ of paginas/afbeeldingen/. De browser uploadt daarna zelf.
 */
export async function maakPaginaUpload(
  type: string,
  grootte: number,
  map: UploadMap,
): Promise<Uitkomst<{ pad: string; token: string; url: string }>> {
  await vereisBeheerder();
  const ext = BLOG_AFBEELDING_TYPES[type];
  if (!ext) return fout("Kies een afbeelding van het type JPG, PNG, GIF of WebP.");
  if (!(grootte > 0) || grootte > BLOG_AFBEELDING_MAX_BYTES) return fout("De afbeelding is te groot. Kies een bestand van maximaal 5 MB.");
  const pad = `paginas/${map === "omslag" ? "omslag" : "afbeeldingen"}/${randomUUID()}.${ext}`;
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(BLOG_BUCKET).createSignedUploadUrl(pad);
  if (error || !data) return fout(`Uploaden is niet gelukt (${error?.message ?? "onbekend"}).`);
  const url = supabase.storage.from(BLOG_BUCKET).getPublicUrl(pad).data.publicUrl;
  return { ok: true, pad, token: data.token, url };
}
