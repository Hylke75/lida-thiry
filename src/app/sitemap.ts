import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { haalSitemapItems } from "@/lib/blog/publiek";

// Elke 5 minuten opnieuw opgebouwd, zodat ingeplande blogberichten vanzelf
// verschijnen. Is de database niet bereikbaar, dan blijven de vaste pagina's staan.
export const revalidate = 300;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const basis = siteUrl();
  const berichten = await haalSitemapItems().catch(() => []);
  const nieuwste = berichten.reduce<string | undefined>((max, b) => (!max || b.bijgewerkt_op > max ? b.bijgewerkt_op : max), undefined);
  return [
    { url: `${basis}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${basis}/bestellen`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${basis}/blog`, changeFrequency: "weekly", priority: 0.7, ...(nieuwste ? { lastModified: nieuwste } : {}) },
    ...berichten.map((b) => ({
      url: `${basis}/blog/${b.slug}`,
      lastModified: b.bijgewerkt_op,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    { url: `${basis}/voorwaarden`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${basis}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
