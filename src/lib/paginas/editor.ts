import "server-only";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { werkDoorverwijzingenBij } from "@/lib/doorverwijzingen/beheer";
import { vrijeSlugIn } from "@/lib/paginas/vrije-slug";

export { isDubbel } from "@/lib/paginas/vrije-slug";
import { PAGINA_VELDEN, uniekePaginaSlug, type FormulierKeuze, type Pagina } from "@/lib/paginas/beheer";

export const PAGINAS_PAD = "/admin/paginas";

export async function haalPaginaBeheer(id: string): Promise<Pagina | null> {
  if (!UUID_PATROON.test(id)) return null;
  const { data, error } = await adminClient().from("paginas").select(PAGINA_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`Pagina lezen: ${error.message}`);
  return (data as Pagina | null) ?? null;
}

/** Een slug op basis van `basis` die nog door geen enkele pagina gebruikt wordt (en niet gereserveerd is). */
export function vrijePaginaSlug(basis: string, behalveId?: string): Promise<string> {
  return vrijeSlugIn("paginas", uniekePaginaSlug, 70, basis, behalveId);
}

/** Actieve nieuwsbriefformulieren (voor "Blok invoegen" en het voorbeeld). Faalt zacht. */
export async function haalFormulieren(): Promise<FormulierKeuze[]> {
  try {
    const { data, error } = await adminClient().from("nb_formulieren").select("slug, naam").eq("actief", true).order("naam").limit(200);
    if (error) throw error;
    return (data ?? []) as FormulierKeuze[];
  } catch (e) {
    console.error("Pagina's: nieuwsbriefformulieren lezen mislukt.", e);
    return [];
  }
}

export const SLUG_BEZET = "Dit webadres wordt al gebruikt door een andere pagina. Kies een ander webadres (of pas de titel aan).";

/**
 * Na opslaan: staat de pagina (nu) online, dan verwijst een oud online adres door
 * naar het nieuwe en vervalt een doorverwijzing vanaf het eigen adres (anders
 * blijft de pagina verborgen). Geeft een waarschuwing of null.
 */
export async function doorverwijzingenNaOpslaan(oud: Pagina, nieuw: Pagina): Promise<string | null> {
  if (nieuw.status !== "gepubliceerd") return null;
  return werkDoorverwijzingenBij(`/${nieuw.slug}`, oud.status === "gepubliceerd" ? `/${oud.slug}` : null);
}

/**
 * Ververst de site na een wijziging. Het menu en de footer staan op elke
 * pagina, dus de hele site (layout) wordt opnieuw opgebouwd; daarnaast de
 * pagina zelf (ook het oude adres als de slug is veranderd) en de sitemap.
 */
export function vernieuwPaginas(...slugs: (string | null | undefined)[]) {
  vernieuwPubliekeData("paginas");
  revalidatePath(PAGINAS_PAD);
  revalidatePath("/", "layout");
  for (const s of new Set(slugs.filter(Boolean))) revalidatePath(`/${s}`);
  revalidatePath("/sitemap.xml");
}
