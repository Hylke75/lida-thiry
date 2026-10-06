import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogBeeld, berichtBeeld } from "@/components/blog/BlogKaart";
import { KopieerLink } from "@/components/blog/KopieerLink";
import { Opmaak } from "@/components/Opmaak";
import { ArtikelRaster } from "@/components/site/ArtikelKaart";
import { Bovenschrift, Container, KleurLint, knopKlassen, SectieKop, TekstLink } from "@/components/site/Basis";
import { INTRO, KOP_ACHTERGROND } from "@/components/site/InhoudKop";
import { InhoudNieuwsbrief } from "@/components/site/InhoudNieuwsbrief";
import { InhoudOproep } from "@/components/site/InhoudOproep";
import { InhoudProza } from "@/components/site/InhoudProza";
import { BOVENSCHRIFT, CONTAINER, SECTIE } from "@/components/site/stijl";
import { haalBericht, haalGerelateerd } from "@/lib/blog/publiek";
import { leestijdMinuten, metaOmschrijving } from "@/lib/blog/regels";
import { blogHref, formatteerDatum } from "@/lib/blog/lijst";
import { deelLinks } from "@/lib/blog/delen";
import { blogPostingJsonLd } from "@/lib/blog/structuur";
import { deelMetadata } from "@/lib/seo/delen";
import { kruimelpadJsonLd, veiligeJson } from "@/lib/seo/structuur";
import { leesWebsite } from "@/lib/website/lees";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_ARTIKEL } from "@/lib/inhoud/groepen/blog";
import { veiligeLink } from "@/lib/website/weergave";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { afmetingenVoorTekst } from "@/lib/media/publiek";
import { siteUrl } from "@/lib/site";

// ISR: elk bericht wordt bij het eerste bezoek gerenderd en daarna uit de cache
// geserveerd. De gegevens hebben de tag "blog" met een levensduur van 120 s; de
// pagina neemt die kortste levensduur over (onder de 300 hieronder). Opslaan in
// het beheer ververst de pagina direct (tag + revalidatePath). Ook een "nog niet
// gepubliceerd" (404) voor een ingepland bericht blijft dus hooguit ~4 minuten staan. generateStaticParams
// geeft bewust een lege lijst: niets wordt tijdens de build gerenderd (de
// database is dan niet nodig), maar elke pagina valt wel onder ISR.
export const revalidate = 300;

export function generateStaticParams(): { slug: string }[] {
  return [];
}

type Params = Promise<{ slug: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const [b, site] = await Promise.all([haalBericht(slug), leesWebsite()]);
  if (!b) return { title: "Bericht niet gevonden", robots: { index: false } };
  const titel = b.seo_titel.trim() || b.titel;
  const omschrijving = metaOmschrijving(b);
  const beeld = berichtBeeld(b);
  return {
    title: titel,
    description: omschrijving,
    authors: [{ name: b.auteur || "Lida Thiry" }],
    keywords: b.tags.length ? b.tags : undefined,
    alternates: {
      canonical: `/blog/${b.slug}`,
      types: { "application/rss+xml": [{ url: "/blog/rss.xml", title: "Blog · Lida Thiry" }] },
    },
    ...deelMetadata(site, {
      titel,
      omschrijving,
      url: `/blog/${b.slug}`,
      beeld: beeld ? { url: beeld.url, alt: beeld.alt } : null,
      artikel: {
        publishedTime: b.gepubliceerd_op ?? undefined,
        modifiedTime: b.bijgewerkt_op,
        authors: [b.auteur || "Lida Thiry"],
        section: b.categorie ?? undefined,
        tags: b.tags,
      },
    }),
  };
}

/** Deelknoppen: kleine outline-pillen (secundair, naast elkaar). */
const DEEL_KNOP = `${knopKlassen({ variant: "outline", klein: true })} cursor-pointer`;

/** Link in het kruimelpad: ruim genoeg om aan te tikken. */
const KRUIMEL = "inline-flex min-h-8 items-center hover:text-berry hover:underline hover:underline-offset-4";

/** h1 van een bericht: iets kleiner dan op andere pagina's, titels zijn vaak lang. */
const H1_BERICHT =
  "mt-0 mb-0 font-serif text-[38px] leading-[1.06] font-normal tracking-[-0.02em] text-balance break-words hyphens-auto tablet:text-[clamp(40px,4.6vw,56px)]";

/** Breedte van de leeskolom (max. ~720 px). */
const LEESKOLOM = `${CONTAINER} max-w-[720px]`;

export default async function BlogBerichtPagina({ params }: { params: Params }) {
  const { slug } = await params;
  const b = await haalBericht(slug);
  if (!b) notFound();

  const [t, nieuwsbrief, gerelateerd, afmetingen] = await Promise.all([
    leesSectie(BLOG_ARTIKEL),
    leesSectie(NIEUWSBRIEF_AANMELDEN),
    haalGerelateerd(b, 3),
    afmetingenVoorTekst(b.inhoud),
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
  const breadcrumbs = kruimelpadJsonLd(basis, [
    { naam: "Home", pad: "/" },
    { naam: "Blog", pad: "/blog" },
    { naam: b.titel, pad: `/blog/${b.slug}` },
  ]);

  return (
    <main className="flex w-full flex-1 flex-col">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: veiligeJson([jsonLd, breadcrumbs]) }} />

      <article>
        <header className={KOP_ACHTERGROND}>
          <div className={`${LEESKOLOM} flex flex-col gap-5 pt-10 pb-12 tablet:pt-14 tablet:pb-14`}>
            <nav aria-label="Kruimelpad" className="text-[13px] font-semibold text-ink-soft">
              <ol className="m-0 flex list-none flex-wrap items-center gap-x-2 gap-y-1 p-0">
                <li>
                  <Link href="/" className={KRUIMEL}>
                    Home
                  </Link>
                </li>
                <li aria-hidden="true">/</li>
                <li>
                  <Link href="/blog" className={KRUIMEL}>
                    Blog
                  </Link>
                </li>
                {b.categorie && (
                  <>
                    <li aria-hidden="true">/</li>
                    <li>
                      <Link href={blogHref({ categorie: b.categorie })} className={KRUIMEL}>
                        {b.categorie}
                      </Link>
                    </li>
                  </>
                )}
              </ol>
            </nav>

            <div>
              {b.categorie && <Bovenschrift>{b.categorie}</Bovenschrift>}
              <h1 className={H1_BERICHT}>{b.titel}</h1>
            </div>
            {b.samenvatting && <p className={INTRO}>{b.samenvatting}</p>}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-4 text-[14px] text-ink-soft">
              <span className="flex items-center gap-2.5">
                <span
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-coral-soft font-serif text-[16px] text-berry"
                  aria-hidden="true"
                >
                  {(b.auteur || "Lida Thiry")
                    .split(/\s+/)
                    .map((w) => w.charAt(0))
                    .slice(0, 2)
                    .join("")}
                </span>
                <span className="font-bold text-ink">{b.auteur || "Lida Thiry"}</span>
              </span>
              <span aria-hidden="true">·</span>
              {b.gepubliceerd_op && <time dateTime={b.gepubliceerd_op}>{formatteerDatum(b.gepubliceerd_op)}</time>}
              <span aria-hidden="true">·</span>
              <span>{leestijdMinuten(b.inhoud)} min lezen</span>
            </div>
          </div>
          <KleurLint />
        </header>

        {b.omslag_url && (
          <figure className={`${CONTAINER} mx-auto mt-10 mb-0 max-w-[980px] tablet:mt-14`}>
            <BlogBeeld
              bericht={b}
              prioriteit
              sizes="(min-width: 1020px) 980px, 100vw"
              className="aspect-[16/9] w-full rounded-ontwerp-md tablet:rounded-ontwerp-lg"
            />
          </figure>
        )}

        <div className={`${LEESKOLOM} pt-10 tablet:pt-14`}>
          <InhoudProza intro>
            <Opmaak tekst={b.inhoud} afmetingen={afmetingen} beeldSizes="(min-width: 760px) 720px, 100vw" />
          </InhoudProza>

          {b.tags.length > 0 && (
            <ul className="mt-12 mb-0 flex list-none flex-wrap gap-2 p-0" aria-label="Tags">
              {b.tags.map((tag) => (
                <li key={tag}>
                  <Link
                    href={blogHref({ tag })}
                    className="inline-flex min-h-9 items-center rounded-full border border-line bg-white px-3 text-[13px] font-semibold text-ink-soft hover:border-berry hover:text-berry"
                  >
                    #{tag}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <section aria-labelledby="delen" className="mt-8 flex flex-col gap-3 border-t border-line pt-6">
            <p id="delen" className={`${BOVENSCHRIFT} mb-1`}>
              {t.delen_label}
            </p>
            <div className="flex flex-wrap gap-2">
              <KopieerLink
                url={url}
                className={DEEL_KNOP}
                teksten={{ kopieer: t.kopieer, gekopieerd: t.gekopieerd, vraag: t.kopieer_vraag }}
              />
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
      <div className={`${CONTAINER} mt-[68px] max-w-[860px] tablet:mt-[92px]`}>
        <InhoudOproep titel={t.cta_titel} tekst={t.cta_tekst} knop={t.cta_knop} href={veiligeLink(t.cta_link, "/bestellen")} />
      </div>

      {gerelateerd.length > 0 && (
        <section aria-labelledby="lees-ook" className={`${SECTIE} mt-[68px] bg-[#fffaf4] tablet:mt-[92px]`}>
          <Container>
            <SectieKop
              id="lees-ook"
              titel={t.lees_ook}
              rechts={
                <TekstLink href="/blog" pijl>
                  {t.alle_artikelen}
                </TekstLink>
              }
            />
            <ArtikelRaster berichten={gerelateerd} />
          </Container>
        </section>
      )}

      <InhoudNieuwsbrief
        className={gerelateerd.length > 0 ? "" : "mt-[68px] tablet:mt-[92px]"}
        teksten={{ ...nieuwsbrief, titel: t.nieuwsbrief_titel || nieuwsbrief.titel }}
      />
    </main>
  );
}
