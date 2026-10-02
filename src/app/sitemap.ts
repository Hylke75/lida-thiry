import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const basis = siteUrl();
  return [
    { url: `${basis}/`, changeFrequency: "monthly", priority: 1 },
    { url: `${basis}/bestellen`, changeFrequency: "monthly", priority: 0.8 },
    { url: `${basis}/voorwaarden`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${basis}/privacy`, changeFrequency: "yearly", priority: 0.3 },
  ];
}
