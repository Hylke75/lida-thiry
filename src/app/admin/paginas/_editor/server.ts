import "server-only";
import { revalidatePath } from "next/cache";
import { vernieuwPubliekeData } from "@/lib/cache/vernieuw";
import { adminClient } from "@/lib/supabase/admin";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { PAGINA_VELDEN, uniekePaginaSlug, type FormulierKeuze, type Pagina } from "@/lib/paginas/beheer";

export const PAGINAS_PAD = "/admin/paginas";

export async function haalPaginaBeheer(id: string): Promise<Pagina | null> {
  if (!UUID_PATROON.test(id)) return null;
  const { data, error } = await adminClient().from("paginas").select(PAGINA_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`Pagina lezen: ${error.message}`);
  return (data as Pagina | null) ?? null;
}

/** Een slug op basis van `basis` die nog door geen enkele pagina gebruikt wordt (en niet gereserveerd is). */
export async function vrijePaginaSlug(basis: string, behalveId?: string): Promise<string> {
  const kandidaat = uniekePaginaSlug(basis, []);
  let q = adminClient().from("paginas").select("slug").like("slug", `${kandidaat.slice(0, 70)}%`).limit(1000);
  if (behalveId) q = q.neq("id", behalveId);
  const { data } = await q;
  return uniekePaginaSlug(kandidaat, (data ?? []).map((r) => r.slug as string));
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

/** Postgres-fout voor een dubbele waarde (de slug is uniek). */
export function isDubbel(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

export const SLUG_BEZET = "Dit webadres wordt al gebruikt door een andere pagina. Kies een ander webadres (of pas de titel aan).";

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
