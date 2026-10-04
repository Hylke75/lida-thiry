import "server-only";
import { revalidatePath } from "next/cache";
import { adminClient } from "@/lib/supabase/admin";
import { AiFout } from "@/lib/blog/ai";
import { AI_LIMIET_PER_UUR, uniekeSlug } from "@/lib/blog/beheer";
import { BERICHT_VELDEN, type BlogBericht } from "@/lib/blog/regels";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";

export const BLOG_PAD = "/admin/blog";

export async function haalBericht(id: string): Promise<BlogBericht | null> {
  if (!UUID_PATROON.test(id)) return null;
  const { data, error } = await adminClient().from("blog_berichten").select(BERICHT_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`Blogbericht lezen: ${error.message}`);
  return (data as BlogBericht | null) ?? null;
}

/** Een slug op basis van `basis` die nog door geen enkel bericht gebruikt wordt. */
export async function vrijeSlug(basis: string, behalveId?: string): Promise<string> {
  const kandidaat = uniekeSlug(basis, []);
  let q = adminClient().from("blog_berichten").select("slug").like("slug", `${kandidaat.slice(0, 90)}%`).limit(1000);
  if (behalveId) q = q.neq("id", behalveId);
  const { data } = await q;
  return uniekeSlug(kandidaat, (data ?? []).map((r) => r.slug as string));
}

/** Postgres-fout voor een dubbele waarde (de slug is uniek). */
export function isDubbel(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export const SLUG_BEZET = "Dit webadres wordt al gebruikt door een ander bericht. Kies een ander webadres (of pas de titel aan).";

/** Ververs de openbare blogpagina's (en het oude adres als de slug is veranderd). */
export function vernieuwBlog(...slugs: (string | null | undefined)[]) {
  revalidatePath(BLOG_PAD);
  revalidatePath("/blog");
  for (const s of new Set(slugs.filter(Boolean))) revalidatePath(`/blog/${s}`);
  revalidatePath("/");
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
