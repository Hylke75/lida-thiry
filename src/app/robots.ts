import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site";
import { leesWebsite } from "@/lib/website/lees";
import { robotsRegels } from "@/lib/website/seo";

// Gecachet; de schakelaar "niet indexeren" (Beheer → Website → Instellingen) zit
// in de datacache onder de tag "instellingen", dus opslaan vernieuwt dit bestand.
export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const site = await leesWebsite();
  return robotsRegels(site.nietIndexeren, siteUrl());
}
