import "server-only";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { adminClient } from "@/lib/supabase/admin";
import { AiFout } from "@/lib/blog/ai";
import { AI_LIMIET_PER_UUR, uniekeSlug } from "@/lib/blog/beheer";
import { BERICHT_VELDEN, zichtbaarheid, type BlogBericht } from "@/lib/blog/regels";
import { werkDoorverwijzingenBij } from "@/lib/doorverwijzingen/beheer";
import { vrijeSlugIn } from "@/lib/paginas/vrije-slug";

export { isDubbel } from "@/lib/paginas/vrije-slug";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const BLOG_PAD = "/admin/blog";

export async function haalBericht(id: string): Promise<BlogBericht | null> {
  if (!UUID_PATROON.test(id)) return null;
  const { data, error } = await adminClient().from("blog_berichten").select(BERICHT_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`Blogbericht lezen: ${error.message}`);
  return (data as BlogBericht | null) ?? null;
}

/** Een slug op basis van `basis` die nog door geen enkel bericht gebruikt wordt. */
export function vrijeSlug(basis: string, behalveId?: string): Promise<string> {
  return vrijeSlugIn("blog_berichten", uniekeSlug, 90, basis, behalveId);
}

export const SLUG_BEZET = "Dit webadres wordt al gebruikt door een ander bericht. Kies een ander webadres (of pas de titel aan).";

/**
 * Na opslaan: staat het bericht (nu) gepubliceerd of ingepland, dan verwijst een
 * oud online adres door naar het nieuwe en vervalt een doorverwijzing vanaf het
 * eigen adres (anders blijft het bericht verborgen). Geeft een waarschuwing of null.
 */
export async function doorverwijzingenNaOpslaan(oud: BlogBericht, nieuw: BlogBericht): Promise<string | null> {
  if (nieuw.status !== "gepubliceerd") return null;
  return werkDoorverwijzingenBij(`/blog/${nieuw.slug}`, zichtbaarheid(oud) === "online" ? `/blog/${oud.slug}` : null);
}

/** Ververs de openbare blogpagina's (en het oude adres als de slug is veranderd). */
export function vernieuwBlog(...slugs: (string | null | undefined)[]) {
  vernieuwPubliekeData("blog_berichten");
  revalidatePath(BLOG_PAD);
  revalidatePath("/blog");
  for (const s of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${s}`);
  revalidatePath("/");
  revalidatePath("/blog/rss.xml");
  revalidatePath("/sitemap.xml");
}

/**
 * Geeft een foutmelding als het maximum aantal AI-aanroepen van het afgelopen uur
 * bereikt is (bescherming tegen onverwachte kosten). Bij twijfel: niet doorgaan.
 */
export async function aiLimietFout(): Promise<string | null> {
  const sinds = new Date(Date.now() - 3_600_000).toISOString();
  const { count, error } = await adminClient()
    .from("blog_ai_gebruik")
    .select("id", { count: "exact", head: true })
    .gte("op", sinds);
  if (error) return "Het AI-gebruik kon niet worden gecontroleerd. Probeer het later opnieuw.";
  if ((count ?? 0) >= AI_LIMIET_PER_UUR) {
    return `De AI is het afgelopen uur al ${count} keer gebruikt (maximaal ${AI_LIMIET_PER_UUR} per uur, om onverwachte kosten te voorkomen). Probeer het later opnieuw.`;
  }
  return null;
}

/** Zet een fout uit de AI-aanroep om in een begrijpelijke melding. */
export function aiFoutmelding(e: unknown): string {
  if (e instanceof AiFout) return e.message;
  console.error("blog: AI-aanroep mislukt", e);
  return "Er ging iets mis bij de AI. Probeer het opnieuw.";
}
