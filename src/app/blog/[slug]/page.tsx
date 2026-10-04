import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogBeeld, BlogKaart, berichtBeeld } from "@/components/blog/BlogKaart";
import { KopieerLink } from "@/components/blog/KopieerLink";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { Opmaak } from "@/components/Opmaak";
import { haalBericht, haalGerelateerd } from "@/lib/blog/publiek";
import { leestijdMinuten, metaOmschrijving } from "@/lib/blog/regels";
import { blogHref, formatteerDatum } from "@/lib/blog/lijst";
import { deelLinks } from "@/lib/blog/delen";
import { blogPostingJsonLd, veiligeJson } from "@/lib/blog/structuur";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_ARTIKEL } from "@/lib/inhoud/groepen/blog";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { siteUrl } from "@/lib/site";

// ISR: elk bericht wordt bij het eerste bezoek gerenderd en daarna maximaal
// 5 minuten uit de cache geserveerd. Opslaan in het beheer ververst de pagina
// direct (revalidatePath). Ook een "nog niet gepubliceerd" (404) voor een
// ingepland bericht blijft dus hooguit 5 minuten staan. generateStaticParams
// geeft bewust een lege lijst: niets wordt tijdens de build gerenderd (de
// database is dan niet nodig), maar elke pagina valt wel onder ISR.
export const revalidate = 300;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const b = await haalBericht(slug);
  if (!b) return { title: "Bericht niet gevonden", robots: { index: false } };
  const titel = b.seo_titel.trim() || b.titel;
  const omschrijving = metaOmschrijving(b);
  const beeld = berichtBeeld(b);
  const afbeeldingen = beeld ? [{ url: beeld.url, alt: beeld.alt }] : undefined;
  return {
    title: titel,
    description: omschrijving,
    authors: [{ name: b.auteur || "Lida Thiry" }],
    keywords: b.tags.length ? b.tags : undefined,
    alternates: {
      canonical: `/blog/${b.slug}`,
      types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "Blog · Lida Thiry" }] },
    },
    openGraph: {
      type: "article",
      locale: "nl_NL",
      siteName: "Lida Thiry Imago & Kledingadvies",
      url: `/blog/${b.slug}`,
      title: titel,
      description: omschrijving,
      publishedTime: b.gepubliceerd_op ?? undefined,
      modifiedTime: b.bijgewerkt_op,
      authors: [b.auteur || "Lida Thiry"],
      section: b.categorie ?? undefined,
      tags: b.tags,
      ...(afbeeldingen ? { images: afbeeldingen } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titel,
      description: omschrijving,
      ...(afbeeldingen ? { images: afbeeldingen.map((a) => a.url) } : {}),
    },
  };
}

const DEEL_KNOP =
  "inline-flex items-center rounded-full bg-kaart px-4 py-2 text-sm text-foreground/70 ring-1 ring-foreground/10 transition-colors hover:text-accent hover:ring-accent/40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";

// Typografie voor de berichttekst (de elementen uit <Opmaak> hebben geen eigen klassen).
const PROZA = [
  "flex flex-col gap-5 text-[1.0625rem] leading-[1.8] text-foreground/85 [overflow-wrap:anywhere]",
  "[&_h2]:mt-8 [&_h2]:font-serif [&_h2]:text-2xl [&_h2]:leading-snug [&_h2]:font-semibold [&_h2]:text-foreground sm:[&_h2]:text-3xl",
  "[&_h3]:mt-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:text-foreground",
  "[&_a]:text-accent [&_a]:underline [&_a]:decoration-accent/40 [&_a]:underline-offset-4 [&_a:hover]:decoration-accent",
  "[&_strong]:font-semibold [&_strong]:text-foreground",
  "[&_ul]:flex [&_ul]:list-disc [&_ul]:flex-col [&_ul]:gap-2 [&_ul]:pl-6 [&_li]:marker:text-accent",
  "[&_img]:my-3 [&_img]:h-auto [&_img]:w-full [&_img]:rounded-2xl [&_img]:shadow-sm",
  "[&>p:first-child]:text-xl [&>p:first-child]:leading-relaxed [&>p:first-child]:text-foreground",
].join(" ");

export default async function BlogBerichtPagina({ params }: { params: Params }) {
  const { slug } = await params;
  const b = await haalBericht(slug);
  if (!b) notFound();

  const [t, nieuwsbrief, gerelateerd] = await Promise.all([
    leesSectie(BLOG_ARTIKEL),
    leesSectie(NIEUWSBRIEF_AANMELDEN),
    haalGerelateerd(b, 3),
  ]);

  const basis = siteUrl();
  const url = `${basis}/blog/${b.slug}`;
  const beeld = berichtBeeld(b);
  const jsonLd = blogPostingJsonLd({
    titel: b.seo_titel.trim() || b.titel,
    omschrijving: metaOmschrijving(b),
    url,
    afbeelding: beeld?.url,
    gepubliceerdOp: b.gepubliceerd_op ?? b.aangemaakt_op,
    bijgewerktOp: b.bijgewerkt_op,
    auteur: b.auteur,
    tags: b.tags,
    categorie: b.categorie,
    siteUrl: basis,
  });
  const breadcrumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${basis}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${basis}/blog` },
      { "@type": "ListItem", position: 3, name: b.titel, item: url },
    ],
  };

  return (
    <main className="flex w-full flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: veiligeJson([jsonLd, breadcrumbs]) }} />

      <article>
        <header className="mx-auto flex w-full max-w-3xl flex-col gap-5 px-6 pt-10 sm:pt-14">
          <nav aria-label="Kruimelpad" className="text-sm text-foreground/50">
            <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <li>
                <Link href="/" className="hover:text-accent">
                  Home
                </Link>
              </li>
              <li aria-hidden="true">/</li>
              <li>
                <Link href="/blog" className="hover:text-accent">
                  Blog
                </Link>
              </li>
              {b.categorie && (
                <>
                  <li aria-hidden="true">/</li>
                  <li>
                    <Link href={blogHref({ categorie: b.categorie })} className="hover:text-accent">
                      {b.categorie}
                    </Link>
                  </li>
                </>
              )}
            </ol>
          </nav>

          {b.categorie && (
            <p className="text-xs font-medium tracking-widest text-accent uppercase">{b.categorie}</p>
          )}
          <h1 className="font-serif text-4xl leading-[1.15] font-semibold tracking-tight text-balance break-words hyphens-auto sm:text-5xl">
            {b.titel}
          </h1>
          {b.samenvatting && <p className="text-lg text-balance text-foreground/70">{b.samenvatting}</p>}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-y border-foreground/10 py-3 text-sm text-foreground/60">
            <span className="flex items-center gap-2">
              <span
                className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-zacht font-serif text-sm text-accent"
                aria-hidden="true"
              >
                {(b.auteur || "Lida Thiry")
                  .split(/\s+/)
                  .map((w) => w.charAt(0))
                  .slice(0, 2)
                  .join("")}
              </span>
              <span className="font-medium text-foreground/80">{b.auteur || "Lida Thiry"}</span>
            </span>
            <span aria-hidden="true">·</span>
            {b.gepubliceerd_op && <time dateTime={b.gepubliceerd_op}>{formatteerDatum(b.gepubliceerd_op)}</time>}
            <span aria-hidden="true">·</span>
            <span>{leestijdMinuten(b.inhoud)} min lezen</span>
          </div>
        </header>

        {b.omslag_url && (
          <figure className="mx-auto mt-8 w-full max-w-5xl px-0 sm:px-6">
            <BlogBeeld bericht={b} prioriteit className="aspect-[16/9] w-full sm:rounded-3xl" />
          </figure>
        )}

        <div className="mx-auto mt-10 w-full max-w-[68ch] px-6">
          <div className={PROZA}>
            <Opmaak tekst={b.inhoud} />
          </div>

          {b.tags.length > 0 && (
            <ul className="mt-10 flex flex-wrap gap-2" aria-label="Tags">
              {b.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={blogHref({ tag })}
                    className="inline-block rounded-full bg-accent-zacht/70 px-3 py-1 text-xs text-foreground/70 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="delen" className="mt-8 flex flex-col gap-3 border-t border-foreground/10 pt-6">
            <p id="delen" className="text-sm font-medium text-foreground/60">
              {t.delen_label}
            </p>
            <div className="flex flex-wrap gap-2">
              <KopieerLink url={url} className={DEEL_KNOP} />
              {deelLinks(url, b.titel).map((d) => (
                <a
                  key={d.id}
                  href={d.href}
                  className={DEEL_KNOP}
                  {...(d.id === "email" ? {} : { target: "_blank", rel: "noopener noreferrer" })}
                >
                  {d.label}
                  {d.id !== "email" && <span className="sr-only"> (opent in nieuw venster)</span>}
                </a>
              ))}
            </div>
          </section>
        </div>
      </article>

      {/* Oproep tot de test */}
      <aside className="mx-auto mt-14 w-full max-w-3xl px-6">
        <div className="relative overflow-hidden rounded-3xl bg-accent-zacht/70 px-6 py-10 text-center ring-1 ring-accent/15 sm:px-12">
          <span className="absolute -top-10 -right-10 h-40 w-40 rounded-full border border-accent/20" aria-hidden="true" />
          <h2 className="font-serif text-2xl font-semibold text-balance sm:text-3xl">{t.cta_titel}</h2>
          <p className="mx-auto mt-3 max-w-xl text-foreground/70">{t.cta_tekst}</p>
          <Link
            href="/bestellen"
            className="mt-6 inline-block rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t.cta_knop}
          </Link>
        </div>
      </aside>

      {gerelateerd.length > 0 && (
        <section aria-labelledby="lees-ook" className="mx-auto mt-16 w-full max-w-5xl px-6">
          <h2 id="lees-ook" className="text-center text-3xl font-semibold tracking-tight">
            {t.lees_ook}
          </h2>
          <ul className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {gerelateerd.map((g) => (
              <li key={g.id}>
                <BlogKaart bericht={g} />
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="mt-16 bg-kaart">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <NieuwsbriefAanmelden
            teksten={{ ...nieuwsbrief, titel: t.nieuwsbrief_titel || nieuwsbrief.titel }}
            toestemming={<Opmaak tekst={nieuwsbrief.toestemming_tekst} />}
          />
        </div>
      </section>
    </main>
  );
}
