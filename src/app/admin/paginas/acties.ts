"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { logActie } from "@/lib/beheer-log";
import { adminClient } from "@/lib/supabase/admin";
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
import { metWaarschuwing } from "@/lib/doorverwijzingen/beheer";
import { bewaarVersie } from "@/lib/versies/beheer";
import { omschrijvingVoor, paginaSnapshot } from "@/lib/versies/regels";
import { doorverwijzingenNaOpslaan, haalPaginaBeheer, isDubbel, PAGINAS_PAD, SLUG_BEZET, vernieuwPaginas, vrijePaginaSlug } from "./_editor/server";

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
  await vereisBeheerder("paginas");
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
  await vereisBeheerder("paginas");
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
  await vereisBeheerder("paginas");
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
  const user = await vereisBeheerder("paginas");
  const id = leesId(formData);
  if (!id) redirect(`${PAGINAS_PAD}?fout=onbekend`);
  // Eerst een momentopname, zodat de pagina via de prullenbak terug kan.
  const weg = await haalPaginaBeheer(id);
  if (weg) await bewaarVersie({ soort: "pagina", ref: id, inhoud: paginaSnapshot(weg), omschrijving: "Verwijderd", door: user.email, forceer: true });
  const { data } = await adminClient().from("paginas").delete().eq("id", id).select("slug");
  if (!data?.length) redirect(`${PAGINAS_PAD}?fout=verwijderen`);
  await logActie({
    actie: "pagina.verwijderen",
    onderwerpSoort: "pagina",
    onderwerpId: id,
    omschrijving: `Pagina ‘${weg?.titel ?? data[0].slug}’ verwijderd (naar de prullenbak)`,
    details: { slug: data[0].slug },
    gebruiker: user,
  });
  vernieuwPaginas(data[0].slug as string);
  redirect(`${PAGINAS_PAD}?verwijderd=1`);
}

/** Zet een pagina één plek hoger of lager in de volgorde (menu en footer). */
export async function verplaatsPagina(formData: FormData) {
  await vereisBeheerder("paginas");
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

/** Bewaart de inhoud zoals die nu is opgeslagen in de geschiedenis (vóór het overschrijven). */
function bewaarHuidig(huidig: Pagina, door: string | undefined) {
  const inhoud = paginaSnapshot(huidig);
  return bewaarVersie({ soort: "pagina", ref: huidig.id, inhoud, omschrijving: omschrijvingVoor(inhoud), door });
}

export type PaginaUitkomst = Uitkomst<{ pagina: Pagina; melding: string }>;

/** Slaat de velden op; een gepubliceerde pagina moet daarbij publiceerbaar blijven. */
export async function slaPaginaOp(id: string, ruw: unknown): Promise<PaginaUitkomst> {
  const user = await vereisBeheerder("paginas");
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
  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient().from("paginas").update(v.waarde).eq("id", id).select(PAGINA_VELDEN).single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Opslaan is niet gelukt (${error?.message ?? "onbekend"}).`);
  const waarschuwing = await doorverwijzingenNaOpslaan(huidig, data as Pagina);
  vernieuwPaginas(huidig.slug, v.waarde.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: metWaarschuwing("Opgeslagen.", waarschuwing) };
}

/** Slaat op en zet de pagina online. */
export async function publiceerPagina(id: string, ruw: unknown): Promise<PaginaUitkomst> {
  const user = await vereisBeheerder("paginas");
  const huidig = await haalPaginaBeheer(id);
  if (!huidig) return fout("Deze pagina bestaat niet (meer).");
  const v = valideerPagina(ruw);
  if (!v.ok) return fout(...v.fouten);
  const problemen = publicatieProblemen(v.waarde);
  if (problemen.length) return fout("De pagina is nog niet klaar om te publiceren:", ...problemen);
  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient()
    .from("paginas")
    .update({ ...v.waarde, status: "gepubliceerd" })
    .eq("id", id)
    .select(PAGINA_VELDEN)
    .single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Publiceren is niet gelukt (${error?.message ?? "onbekend"}).`);
  const waarschuwing = await doorverwijzingenNaOpslaan(huidig, data as Pagina);
  await logActie({
    actie: "pagina.publiceren",
    onderwerpSoort: "pagina",
    onderwerpId: id,
    omschrijving: `Pagina ‘${v.waarde.titel}’ gepubliceerd (/${v.waarde.slug})`,
    details: { slug: v.waarde.slug, was: huidig.status },
    gebruiker: user,
  });
  vernieuwPaginas(huidig.slug, v.waarde.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: metWaarschuwing("Gepubliceerd! De pagina staat nu online.", waarschuwing) };
}

/** Haalt een pagina offline; de tekst blijft bewaard. */
export async function paginaNaarConcept(id: string): Promise<PaginaUitkomst> {
  const user = await vereisBeheerder("paginas");
  const huidig = await haalPaginaBeheer(id);
  if (!huidig) return fout("Deze pagina bestaat niet (meer).");
  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient().from("paginas").update({ status: "concept" }).eq("id", id).select(PAGINA_VELDEN).single();
  if (error || !data) return fout(`Dat is niet gelukt (${error?.message ?? "onbekend"}).`);
  await logActie({
    actie: "pagina.naar_concept",
    onderwerpSoort: "pagina",
    onderwerpId: id,
    omschrijving: `Pagina ‘${huidig.titel}’ offline gehaald (concept)`,
    gebruiker: user,
  });
  vernieuwPaginas(huidig.slug);
  revalidatePath(`${PAGINAS_PAD}/${id}`);
  return { ok: true, pagina: data as Pagina, melding: "De pagina is weer een concept en niet meer zichtbaar op de site." };
}
