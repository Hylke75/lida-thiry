"use server";

import { randomUUID } from "node:crypto";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { aiBeschikbaar, bewerkMetAi, stelVoor, type Suggesties } from "@/lib/blog/ai";
import { BEWERKINGEN, type Bewerking } from "@/lib/blog/ai-prompt";
import {
  BLOG_AFBEELDING_MAX_BYTES,
  BLOG_AFBEELDING_TYPES,
  BLOG_BUCKET,
  campagneBlokkenUitBericht,
  type UploadMap,
} from "@/lib/blog/beheer";
import { BERICHT_VELDEN, publicatieProblemen, valideerBericht, zichtbaarheid, type BlogBericht, type Zichtbaarheid } from "@/lib/blog/regels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { amsterdamNaarUtc, controleerInplanmoment, toonDatumTijd } from "@/lib/nieuwsbrief/tijd";
import { siteUrl } from "@/lib/site";
import { registreerSlugWijziging } from "@/lib/doorverwijzingen/beheer";
import { bewaarVersie } from "@/lib/versies/beheer";
import { blogSnapshot, omschrijvingVoor } from "@/lib/versies/regels";
import {
  aiFoutmelding,
  aiLimietFout,
  BLOG_PAD,
  haalBericht,
  isDubbel,
  SLUG_BEZET,
  vernieuwBlog,
  vrijeSlug,
} from "./_editor/server";

type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fouten: string[] };

function leesId(formData: FormData): string {
  const id = String(formData.get("id") ?? "");
  return UUID_PATROON.test(id) ? id : "";
}

// Overzicht ---------------------------------------------------------------------------

export async function nieuwBericht() {
  await vereisBeheerder();
  const slug = await vrijeSlug("nieuw-bericht");
  const { data, error } = await adminClient()
    .from("blog_berichten")
    .insert({ titel: "Nieuw bericht", slug })
    .select("id")
    .single();
  if (error || !data) redirect(`${BLOG_PAD}?fout=aanmaken`);
  revalidatePath(BLOG_PAD);
  redirect(`${BLOG_PAD}/${data.id}?nieuw=1`);
}

export async function dupliceerBericht(formData: FormData) {
  await vereisBeheerder();
  const b = await haalBericht(leesId(formData));
  if (!b) redirect(`${BLOG_PAD}?fout=onbekend`);
  // Een kopie van een AI-bericht moet opnieuw gecontroleerd worden.
  const opdracht = b.ai_opdracht ? Object.fromEntries(Object.entries(b.ai_opdracht).filter(([k]) => k !== "gecontroleerd_op")) : null;
  const { data, error } = await adminClient()
    .from("blog_berichten")
    .insert({
      titel: `Kopie van ${b.titel}`.slice(0, 200),
      slug: await vrijeSlug(`${b.slug.slice(0, 80)}-kopie`),
      samenvatting: b.samenvatting,
      inhoud: b.inhoud,
      omslag_url: b.omslag_url,
      omslag_alt: b.omslag_alt,
      categorie: b.categorie,
      tags: b.tags,
      seo_titel: b.seo_titel,
      seo_omschrijving: b.seo_omschrijving,
      auteur: b.auteur,
      ai_gegenereerd: b.ai_gegenereerd,
      ai_opdracht: opdracht,
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${BLOG_PAD}?fout=dupliceren`);
  revalidatePath(BLOG_PAD);
  redirect(`${BLOG_PAD}/${data.id}?gekopieerd=1`);
}

export async function verwijderBericht(formData: FormData) {
  const user = await vereisBeheerder();
  const id = leesId(formData);
  if (!id) redirect(`${BLOG_PAD}?fout=onbekend`);
  // Eerst een momentopname, zodat het bericht via de prullenbak terug kan.
  const weg = await haalBericht(id);
  if (weg) await bewaarVersie({ soort: "blog", ref: id, inhoud: blogSnapshot(weg), omschrijving: "Verwijderd", door: user.email, forceer: true });
  const { data } = await adminClient().from("blog_berichten").delete().eq("id", id).select("slug");
  if (!data?.length) redirect(`${BLOG_PAD}?fout=verwijderen`);
  vernieuwBlog(data[0].slug as string);
  redirect(`${BLOG_PAD}?verwijderd=1`);
}

// Editor ------------------------------------------------------------------------------

export type BerichtUitkomst = Uitkomst<{ bericht: BlogBericht; zichtbaar: Zichtbaarheid; melding: string }>;

const fout = (...fouten: string[]): { ok: false; fouten: string[] } => ({ ok: false, fouten });

/** Bewaart de inhoud zoals die nu is opgeslagen in de geschiedenis (vóór het overschrijven). */
function bewaarHuidig(huidig: BlogBericht, door: string | undefined) {
  const inhoud = blogSnapshot(huidig);
  return bewaarVersie({ soort: "blog", ref: huidig.id, inhoud, omschrijving: omschrijvingVoor(inhoud), door });
}

/** Slaat de velden op; een bericht dat online staat of is ingepland, moet daarbij publiceerbaar blijven. */
export async function slaBerichtOp(id: string, ruw: unknown): Promise<BerichtUitkomst> {
  const user = await vereisBeheerder();
  const huidig = await haalBericht(id);
  if (!huidig) return fout("Dit bericht bestaat niet (meer).");
  const v = valideerBericht(ruw);
  if (!v.ok) return fout(...v.fouten);
  if (huidig.status === "gepubliceerd") {
    const problemen = publicatieProblemen(v.waarde);
    if (problemen.length) {
      return fout(
        `Dit bericht staat ${zichtbaarheid(huidig) === "online" ? "online" : "ingepland"}, dus het moet compleet blijven. Los dit eerst op, of zet het bericht terug naar concept:`,
        ...problemen,
      );
    }
  }
  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient()
    .from("blog_berichten")
    .update(v.waarde)
    .eq("id", id)
    .select(BERICHT_VELDEN)
    .single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Opslaan is niet gelukt (${error?.message ?? "onbekend"}).`);
  if (zichtbaarheid(huidig) === "online" && huidig.slug !== v.waarde.slug) {
    await registreerSlugWijziging(`/blog/${huidig.slug}`, `/blog/${v.waarde.slug}`);
  }
  vernieuwBlog(huidig.slug, v.waarde.slug);
  revalidatePath(`${BLOG_PAD}/${id}`);
  return { ok: true, bericht: data as BlogBericht, zichtbaar: zichtbaarheid(data as BlogBericht), melding: "Opgeslagen." };
}

/**
 * Slaat op en publiceert: direct (`moment` null) of ingepland (`moment` is een
 * datetime-local-waarde in Nederlandse tijd). Een door AI geschreven bericht
 * vereist bij de eerste publicatie dat de tekst is gecontroleerd.
 */
export async function publiceer(
  id: string,
  ruw: unknown,
  opties: { moment: string | null; gecontroleerd: boolean },
): Promise<BerichtUitkomst> {
  const user = await vereisBeheerder();
  const huidig = await haalBericht(id);
  if (!huidig) return fout("Dit bericht bestaat niet (meer).");
  const v = valideerBericht(ruw);
  if (!v.ok) return fout(...v.fouten);
  const problemen = publicatieProblemen(v.waarde);
  if (problemen.length) return fout("Het bericht is nog niet klaar om te publiceren:", ...problemen);

  const nogTeControleren = huidig.ai_gegenereerd && !huidig.ai_opdracht?.gecontroleerd_op;
  if (nogTeControleren && !opties.gecontroleerd) {
    return fout("Dit bericht is door AI geschreven. Vink aan dat je de tekst hebt gelezen en gecontroleerd.");
  }

  let moment = new Date();
  if (opties.moment !== null) {
    const tijd = amsterdamNaarUtc(String(opties.moment));
    const tijdFout = controleerInplanmoment(tijd);
    if (tijdFout || !tijd) return fout(tijdFout ?? "Kies een geldige datum en tijd.");
    moment = tijd;
  }

  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient()
    .from("blog_berichten")
    .update({
      ...v.waarde,
      status: "gepubliceerd",
      gepubliceerd_op: moment.toISOString(),
      ...(nogTeControleren ? { ai_opdracht: { ...huidig.ai_opdracht, gecontroleerd_op: new Date().toISOString() } } : {}),
    })
    .eq("id", id)
    .select(BERICHT_VELDEN)
    .single();
  if (isDubbel(error)) return fout(SLUG_BEZET);
  if (error || !data) return fout(`Publiceren is niet gelukt (${error?.message ?? "onbekend"}).`);
  if (zichtbaarheid(huidig) === "online" && huidig.slug !== v.waarde.slug) {
    await registreerSlugWijziging(`/blog/${huidig.slug}`, `/blog/${v.waarde.slug}`);
  }
  vernieuwBlog(huidig.slug, v.waarde.slug);
  revalidatePath(`${BLOG_PAD}/${id}`);
  return {
    ok: true,
    bericht: data as BlogBericht,
    zichtbaar: zichtbaarheid(data as BlogBericht),
    melding:
      opties.moment === null
        ? "Gepubliceerd! Het bericht staat nu online."
        : `Ingepland: het bericht verschijnt op ${toonDatumTijd(moment)}.`,
  };
}

/** Haalt een bericht offline (of annuleert de planning); de tekst blijft bewaard. */
export async function naarConcept(id: string): Promise<BerichtUitkomst> {
  const user = await vereisBeheerder();
  const huidig = await haalBericht(id);
  if (!huidig) return fout("Dit bericht bestaat niet (meer).");
  await bewaarHuidig(huidig, user.email);
  const { data, error } = await adminClient()
    .from("blog_berichten")
    .update({ status: "concept", gepubliceerd_op: null })
    .eq("id", id)
    .select(BERICHT_VELDEN)
    .single();
  if (error || !data) return fout(`Dat is niet gelukt (${error?.message ?? "onbekend"}).`);
  vernieuwBlog(huidig.slug);
  revalidatePath(`${BLOG_PAD}/${id}`);
  return { ok: true, bericht: data as BlogBericht, zichtbaar: "concept", melding: "Het bericht is weer een concept en niet meer zichtbaar op de site." };
}

/** Maakt een conceptcampagne in de nieuwsbrief die naar dit (online of ingeplande) bericht verwijst. */
export async function alsNieuwsbrief(formData: FormData) {
  await vereisBeheerder();
  const id = leesId(formData);
  const b = await haalBericht(id);
  if (!b) redirect(`${BLOG_PAD}?fout=onbekend`);
  if (zichtbaarheid(b) === "concept") redirect(`${BLOG_PAD}/${id}?fout=nieuwsbrief-concept`);
  const { data, error } = await adminClient()
    .from("nb_campagnes")
    .insert({
      soort: "campagne",
      naam: `Blog: ${b.titel}`.slice(0, 120),
      onderwerp: b.titel.slice(0, 150),
      preheader: b.samenvatting.replace(/\s+/g, " ").trim().slice(0, 200),
      blokken: campagneBlokkenUitBericht(b, siteUrl()),
    })
    .select("id")
    .single();
  if (error || !data) redirect(`${BLOG_PAD}/${id}?fout=nieuwsbrief`);
  revalidatePath("/admin/nieuwsbrief", "layout");
  redirect(`/admin/nieuwsbrief/campagnes/${data.id}`);
}

/**
 * Stap 1 van een foto uploaden: een eenmalige upload-URL in de openbare bucket
 * "blog" (map omslag/ of afbeeldingen/). De browser uploadt daarna zelf.
 */
export async function maakBlogUpload(
  type: string,
  grootte: number,
  map: UploadMap,
): Promise<Uitkomst<{ pad: string; token: string; url: string }>> {
  await vereisBeheerder();
  const ext = BLOG_AFBEELDING_TYPES[type];
  if (!ext) return fout("Kies een afbeelding van het type JPG, PNG, GIF of WebP.");
  if (!(grootte > 0) || grootte > BLOG_AFBEELDING_MAX_BYTES) return fout("De afbeelding is te groot. Kies een bestand van maximaal 5 MB.");
  const pad = `${map === "omslag" ? "omslag" : "afbeeldingen"}/${randomUUID()}.${ext}`;
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(BLOG_BUCKET).createSignedUploadUrl(pad);
  if (error || !data) return fout(`Uploaden is niet gelukt (${error?.message ?? "onbekend"}).`);
  const url = supabase.storage.from(BLOG_BUCKET).getPublicUrl(pad).data.publicUrl;
  return { ok: true, pad, token: data.token, url };
}

// AI ----------------------------------------------------------------------------------

/** Herschrijft een stuk tekst met de AI. Het resultaat wordt alleen getoond, niet opgeslagen. */
export async function aiBewerk(id: string, bewerking: string, tekst: string): Promise<Uitkomst<{ tekst: string }>> {
  await vereisBeheerder();
  if (!aiBeschikbaar()) return fout("De AI-schrijfhulp is nog niet ingesteld.");
  if (!(bewerking in BEWERKINGEN)) return fout("Onbekende bewerking.");
  const limiet = await aiLimietFout();
  if (limiet) return fout(limiet);
  try {
    const nieuw = await bewerkMetAi(bewerking as Bewerking, String(tekst ?? ""), UUID_PATROON.test(id) ? id : null);
    return { ok: true, tekst: nieuw };
  } catch (e) {
    return fout(aiFoutmelding(e));
  }
}

/** Voorstellen voor titels, samenvatting, SEO-teksten en tags. */
export async function aiVoorstel(id: string, titel: string, inhoud: string): Promise<Uitkomst<{ suggesties: Suggesties }>> {
  await vereisBeheerder();
  if (!aiBeschikbaar()) return fout("De AI-schrijfhulp is nog niet ingesteld.");
  const limiet = await aiLimietFout();
  if (limiet) return fout(limiet);
  try {
    const suggesties = await stelVoor(String(titel ?? "").slice(0, 200), String(inhoud ?? "").slice(0, 60_000), UUID_PATROON.test(id) ? id : null);
    return { ok: true, suggesties };
  } catch (e) {
    return fout(aiFoutmelding(e));
  }
}
