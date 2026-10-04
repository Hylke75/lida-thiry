import "server-only";
import { cache } from "react";
import { adminClient } from "../supabase/admin";
import { bouwMenu, PAGINA_VELDEN, type MenuItem, type MenuRij, type Pagina } from "./beheer";
import { geldigePaginaSlug } from "./regels";

// Gepubliceerde pagina's lezen voor de publieke site (pagina, menu, footer, sitemap).
// Alles faalt zacht: is de database niet bereikbaar (of ontbreken de sleutels,
// bijv. tijdens de build), dan loggen we de fout en geven we een leeg resultaat.

function meld(wat: string, e: unknown) {
  console.error(`Pagina's: ${wat} mislukt; leeg resultaat gebruikt.`, e);
}

/** Eén gepubliceerde pagina, of null (ook voor concepten en gereserveerde slugs). */
export const haalPagina = cache(async (slug: string): Promise<Pagina | null> => {
  if (!geldigePaginaSlug(slug)) return null;
  try {
    const { data, error } = await adminClient()
      .from("paginas")
      .select(PAGINA_VELDEN)
      .eq("slug", slug)
      .eq("status", "gepubliceerd")
      .maybeSingle();
    if (error) throw error;
    return (data as Pagina | null) ?? null;
  } catch (e) {
    meld(`pagina ${slug} lezen`, e);
    return null;
  }
});

/** Lichte lijst van alle gepubliceerde pagina's (voor menu, footer en sitemap). */
const haalIndex = cache(async (): Promise<(MenuRij & Pick<Pagina, "niet_indexeren" | "bijgewerkt_op">)[]> => {
  try {
    const { data, error } = await adminClient()
      .from("paginas")
      .select("slug, titel, menu_label, volgorde, in_menu, in_footer, status, niet_indexeren, bijgewerkt_op")
      .eq("status", "gepubliceerd")
      .order("volgorde")
      .limit(500);
    if (error) throw error;
    return (data ?? []) as Awaited<ReturnType<typeof haalIndex>>;
  } catch (e) {
    meld("menu lezen", e);
    return [];
  }
});

/** Links voor het menu bovenaan en de footer. */
export async function haalMenu(): Promise<{ menu: MenuItem[]; footer: MenuItem[] }> {
  return bouwMenu(await haalIndex());
}

/** Gepubliceerde, indexeerbare pagina's voor de sitemap. */
export async function haalSitemapPaginas(): Promise<{ slug: string; bijgewerkt_op: string }[]> {
  return (await haalIndex())
    .filter((p) => !p.niet_indexeren && geldigePaginaSlug(p.slug))
    .map((p) => ({ slug: p.slug, bijgewerkt_op: p.bijgewerkt_op }));
}
