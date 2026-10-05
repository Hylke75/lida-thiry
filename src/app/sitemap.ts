import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { haalSitemapItems } from "@/lib/blog/publiek";
import { haalSitemapPaginas } from "@/lib/paginas/publiek";
import { publiekClient, publiekGecached } from "@/lib/cache/publiek";
import { geldigeFormulierSlug } from "@/lib/nieuwsbrief/formulierregels";

// Elke 5 minuten opnieuw opgebouwd, zodat ingeplande blogberichten vanzelf
// verschijnen. Is de database niet bereikbaar, dan blijven de vaste pagina's staan
// (de leesfuncties geven dan een lege lijst; ze gooien niet).
export const revalidate = 300;

const leesFormulierPaginas = publiekGecached("sitemap-formulieren", ["formulieren"], async () => {
  const { data, error } = await publiekClient()
    .from("nb_formulieren")
    .select("slug, bijgewerkt_op")
    .eq("actief", true)
    .eq("eigen_pagina", true)
    .limit(200);
  if (error) throw error;
  return (data ?? []) as { slug: string; bijgewerkt_op: string }[];
});

/** Actieve aanmeldformulieren met een eigen pagina (/nieuwsbrief/<slug>). Faalt zacht. */
async function haalFormulierPaginas(): Promise<{ slug: string; bijgewerkt_op: string }[]> {
  try {
    return (await leesFormulierPaginas()).filter((f) => geldigeFormulierSlug(f.slug));
  } catch (e) {
    console.error("Sitemap: nieuwsbriefformulieren lezen mislukt; zonder formulierpagina's.", e);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const basis = siteUrl();
  const [berichten, paginas, formulieren] = await Promise.all([haalSitemapItems(), haalSitemapPaginas(), haalFormulierPaginas()]);
  const nieuwste = berichten.reduce<string | undefined>((max, b) => (!max || b.bijgewerkt_op > max ? b.bijgewerkt_op : max), undefined);
  return [
    { url: `${basis}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${basis}/bestellen`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${basis}/afspraak`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${basis}/cadeaubon`, changeFrequency: "monthly", priority: 0.6 },
    ...paginas.map((p) => ({
      url: `${basis}/${p.slug}`,
      lastModified: p.bijgewerkt_op,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${basis}/blog`, changeFrequency: "weekly", priority: 0.7, ...(nieuwste ? { lastModified: nieuwste } : {}) },
    ...berichten.map((b) => ({
      url: `${basis}/blog/${b.slug}`,
      lastModified: b.bijgewerkt_op,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...formulieren.map((f) => ({
      url: `${basis}/nieuwsbrief/${f.slug}`,
      lastModified: f.bijgewerkt_op,
      changeFrequency: "monthly" as const,
      priority: 0.4,
    })),
    { url: `${basis}/voorwaarden`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${basis}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
