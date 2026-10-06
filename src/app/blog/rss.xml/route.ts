import { haalLaatste } from "@/lib/blog/publiek";
import { metaOmschrijving } from "@/lib/blog/regels";
import { bouwRss } from "@/lib/blog/rss";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_OVERZICHT } from "@/lib/inhoud/groepen/blog";
import { siteUrl } from "@/lib/site";
import { leesWebsite } from "@/lib/website/lees";
import { rssTitel } from "@/lib/website/seo";

// Gecachet en elke 5 minuten ververst (ingeplande berichten verschijnen vanzelf);
// opslaan in het beheer ververst /blog-paden ook direct.
export const revalidate = 300;

export async function GET() {
  const basis = siteUrl();
  const [berichten, t, site] = await Promise.all([haalLaatste(20), leesSectie(BLOG_OVERZICHT), leesWebsite()]);
  const xml = bouwRss({
    titel: rssTitel(t.titel, site.korteNaam),
    link: `${basis}/blog`,
    feedUrl: `${basis}/blog/rss.xml`,
    omschrijving: t.intro,
    items: berichten.map((b) => ({
      titel: b.titel,
      url: `${basis}/blog/${b.slug}`,
      datum: b.gepubliceerd_op ?? b.aangemaakt_op,
      omschrijving: b.samenvatting.trim() || metaOmschrijving(b),
      auteur: b.auteur || site.standaardAuteur,
      categorieen: [...(b.categorie ? [b.categorie] : []), ...b.tags],
    })),
  });
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=300, s-maxage=300, stale-while-revalidate=3600",
    },
  });
}
