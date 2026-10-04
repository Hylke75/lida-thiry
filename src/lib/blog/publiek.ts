import "server-only";
import { cache } from "react";
import { publiekClient, publiekGecached } from "../cache/publiek";
import { BERICHT_VELDEN, type BlogBericht } from "./regels";
import { kiesGerelateerd, telWaarden } from "./lijst";

// Gepubliceerde blogberichten lezen voor de publieke site.
//
// Zichtbaar = status 'gepubliceerd' én gepubliceerd_op <= nu. "Nu" wordt bij
// elke databasequery opnieuw bepaald. De resultaten staan in de datacache onder
// de tag "blog" met een levensduur van 120 s (LEVENSDUUR in lib/cache/tags.ts);
// pagina's die ze gebruiken (homepage, /blog/[slug], RSS, sitemap) nemen die
// kortste levensduur over. Een ingepland bericht verschijnt dus uiterlijk
// ~4 minuten na het tijdstip (datacache + pagina), binnen de 5 minuten.
// Opslaan in het beheer vernieuwt de tag én de paden direct.
//
// Alles faalt zacht: is de database niet bereikbaar (of ontbreken de sleutels,
// bijv. tijdens de build), dan loggen we de fout en geven we een leeg resultaat,
// zodat de rest van de site gewoon werkt. Fouten worden niet gecachet.

/** Velden voor overzichten: alles behalve de AI-opdracht (alleen voor het beheer). */
const LIJST_VELDEN = BERICHT_VELDEN.replace(", ai_opdracht", "");

type Rij = Omit<BlogBericht, "ai_opdracht"> & { ai_opdracht?: null };

function normaliseer(r: Rij): BlogBericht {
  return { ...r, tags: r.tags ?? [], ai_opdracht: null };
}

function zichtbaar() {
  return publiekClient()
    .from("blog_berichten")
    .select(LIJST_VELDEN, { count: "exact" })
    .eq("status", "gepubliceerd")
    .lte("gepubliceerd_op", new Date().toISOString());
}

function meld(wat: string, e: unknown) {
  console.error(`Blog: ${wat} mislukt; leeg resultaat gebruikt.`, e);
}

export interface Lijstresultaat {
  berichten: BlogBericht[];
  totaal: number;
}

interface LijstOpties {
  pagina: number;
  perPagina: number;
  categorie?: string;
  tag?: string;
  zonder?: string;
}

const leesGepubliceerd = publiekGecached("blog-lijst", ["blog"], async (o: LijstOpties): Promise<Lijstresultaat> => {
  const per = Math.max(1, Math.floor(o.perPagina));
  const van = (Math.max(1, Math.floor(o.pagina)) - 1) * per;
  let q = zichtbaar();
  if (o.categorie) q = q.eq("categorie", o.categorie);
  if (o.tag) q = q.contains("tags", [o.tag.toLowerCase()]);
  if (o.zonder) q = q.neq("id", o.zonder);
  const { data, error, count } = await q
    .order("gepubliceerd_op", { ascending: false })
    .order("id")
    .range(van, van + per - 1);
  if (error) throw error;
  return { berichten: ((data ?? []) as unknown as Rij[]).map(normaliseer), totaal: count ?? 0 };
});

/**
 * Een pagina gepubliceerde berichten (nieuwste eerst) met het totale aantal.
 * `zonder` sluit één bericht uit (het uitgelichte bericht bovenaan het overzicht).
 */
export async function haalGepubliceerd(o: LijstOpties): Promise<Lijstresultaat> {
  try {
    // Vaste vorm van het argument: hetzelfde verzoek geeft dezelfde cachesleutel.
    return await leesGepubliceerd({
      pagina: o.pagina,
      perPagina: o.perPagina,
      categorie: o.categorie || undefined,
      tag: o.tag || undefined,
      zonder: o.zonder || undefined,
    });
  } catch (e) {
    meld("berichten lezen", e);
    return { berichten: [], totaal: 0 };
  }
}

const leesBericht = publiekGecached("blog-bericht", ["blog"], async (slug: string): Promise<BlogBericht | null> => {
  const { data, error } = await zichtbaar().eq("slug", slug).maybeSingle();
  if (error) throw error;
  return data ? normaliseer(data as unknown as Rij) : null;
});

/** Eén zichtbaar bericht, of null (ook voor concepten en ingeplande berichten). */
export const haalBericht = cache(async (slug: string): Promise<BlogBericht | null> => {
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) || slug.length > 100) return null;
  try {
    return await leesBericht(slug);
  } catch (e) {
    meld(`bericht ${slug} lezen`, e);
    return null;
  }
});

/** De n nieuwste zichtbare berichten. */
export const haalLaatste = cache(async (n: number): Promise<BlogBericht[]> => {
  return (await haalGepubliceerd({ pagina: 1, perPagina: n })).berichten;
});

const leesUitgelicht = publiekGecached("blog-uitgelicht", ["blog"], async (): Promise<BlogBericht | null> => {
  const { data, error } = await zichtbaar()
    .eq("uitgelicht", true)
    .order("gepubliceerd_op", { ascending: false })
    .limit(1);
  if (error) throw error;
  const rij = (data ?? [])[0] as unknown as Rij | undefined;
  return rij ? normaliseer(rij) : null;
});

/** Het uitgelichte bericht (nieuwste met 'uitgelicht'), anders het nieuwste. */
export const haalUitgelicht = cache(async (): Promise<BlogBericht | null> => {
  try {
    const uitgelicht = await leesUitgelicht();
    if (uitgelicht) return uitgelicht;
  } catch (e) {
    meld("uitgelicht bericht lezen", e);
  }
  return (await haalLaatste(1))[0] ?? null;
});

type IndexRij = Pick<BlogBericht, "id" | "slug" | "categorie" | "tags" | "gepubliceerd_op" | "bijgewerkt_op">;

const leesIndex = publiekGecached("blog-index", ["blog"], async (): Promise<IndexRij[]> => {
  const { data, error } = await publiekClient()
    .from("blog_berichten")
    .select("id, slug, categorie, tags, gepubliceerd_op, bijgewerkt_op")
    .eq("status", "gepubliceerd")
    .lte("gepubliceerd_op", new Date().toISOString())
    .order("gepubliceerd_op", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map((r) => ({ ...r, tags: (r.tags as string[] | null) ?? [] })) as IndexRij[];
});

/** Lichte lijst van alle zichtbare berichten (voor tellingen, sitemap en "Lees ook"). */
const haalIndex = cache(async (): Promise<IndexRij[]> => {
  try {
    return await leesIndex();
  } catch (e) {
    meld("index lezen", e);
    return [];
  }
});

/** Categorieën met het aantal zichtbare berichten, meest gebruikte eerst. */
export async function haalCategorieen(): Promise<{ naam: string; aantal: number }[]> {
  return telWaarden((await haalIndex()).map((b) => b.categorie));
}

/** Tags met het aantal zichtbare berichten, meest gebruikte eerst. */
export async function haalTags(): Promise<{ naam: string; aantal: number }[]> {
  return telWaarden((await haalIndex()).flatMap((b) => b.tags));
}

/** Slugs en wijzigingsdatums van alle zichtbare berichten (voor de sitemap). */
export async function haalSitemapItems(): Promise<{ slug: string; bijgewerkt_op: string }[]> {
  return (await haalIndex()).map((b) => ({ slug: b.slug, bijgewerkt_op: b.bijgewerkt_op }));
}

const leesBerichten = publiekGecached("blog-berichten", ["blog"], async (ids: string[]): Promise<BlogBericht[]> => {
  const { data, error } = await zichtbaar().in("id", ids);
  if (error) throw error;
  return ((data ?? []) as unknown as Rij[]).map(normaliseer);
});

/** "Lees ook": berichten met dezelfde tags of categorie, aangevuld met de nieuwste. */
export async function haalGerelateerd(bericht: BlogBericht, n: number): Promise<BlogBericht[]> {
  if (n <= 0) return [];
  const gekozen = kiesGerelateerd(bericht, await haalIndex(), n);
  if (!gekozen.length) return [];
  try {
    const perId = new Map((await leesBerichten(gekozen.map((g) => g.id))).map((b) => [b.id, b]));
    return gekozen.flatMap((g) => perId.get(g.id) ?? []);
  } catch (e) {
    meld("gerelateerde berichten lezen", e);
    return [];
  }
}
