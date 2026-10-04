import { haalLaatste } from "@/lib/blog/publiek";
import { metaOmschrijving } from "@/lib/blog/regels";
import { bouwRss } from "@/lib/blog/rss";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_OVERZICHT } from "@/lib/inhoud/groepen/blog";
import { siteUrl } from "@/lib/site";

// Gecachet en elke 5 minuten ververst (ingeplande berichten verschijnen vanzelf);
// opslaan in het beheer ververst /blog-paden ook direct.
export const revalidate = 300;

export async function GET() {
  const basis = siteUrl();
  const [berichten, t] = await Promise.all([haalLaatste(20), leesSectie(BLOG_OVERZICHT)]);
  const xml = bouwRss({
    titel: `${t.titel} · Lida Thiry`,
    link: `${basis}/blog`,
    feedUrl: `${basis}/blog/rss.xml`,
    omschrijving: t.intro,
    items: berichten.map((b) => ({
      titel: b.titel,
      url: `${basis}/blog/${b.slug}`,
      datum: b.gepubliceerd_op ?? b.aangemaakt_op,
      omschrijving: b.samenvatting.trim() || metaOmschrijving(b),
      auteur: b.auteur,
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
