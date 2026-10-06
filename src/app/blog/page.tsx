import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArtikelRaster, ArtikelUitgelicht } from "@/components/site/ArtikelKaart";
import { Knop, TekstLink } from "@/components/site/Basis";
import { InhoudKop } from "@/components/site/InhoudKop";
import { InhoudNieuwsbrief } from "@/components/site/InhoudNieuwsbrief";
import { BOVENSCHRIFT, CONTAINER, H3 } from "@/components/site/stijl";
import { haalCategorieen, haalGepubliceerd, haalTags, haalUitgelicht } from "@/lib/blog/publiek";
import { blogHref, leesFilter, leesPagina, paginaNummers, paginering, PER_PAGINA } from "@/lib/blog/lijst";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_OVERZICHT } from "@/lib/inhoud/groepen/blog";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { deelMetadata } from "@/lib/seo/delen";
import { leesWebsite } from "@/lib/website/lees";
import { blogOverzichtSeo, leesSeoPaginas, paginaSeo, rssTitel } from "@/lib/website/seo";

// Per request gerenderd: de pagina hangt af van ?categorie, ?tag en ?pagina. De
// gegevens zelf komen wel uit de datacache (tag "blog", levensduur 120 s), dus
// een ingepland bericht verschijnt uiterlijk 2 minuten na het ingestelde moment.
export const dynamic = "force-dynamic";

type Zoek = Promise<Record<string, string | string[] | undefined>>;

/** Titel en omschrijving: Beheer → Website → SEO (leeg = uit Teksten → Blog). */
export async function generateMetadata({ searchParams }: { searchParams: Zoek }): Promise<Metadata> {
  const [zoek, t, site] = await Promise.all([searchParams, leesSectie(BLOG_OVERZICHT), leesWebsite()]);
  const categorie = leesFilter(zoek.categorie);
  const tag = leesFilter(zoek.tag, 40);
  const pagina = leesPagina(zoek.pagina);
  const extra = [categorie, tag && `#${tag}`, pagina > 1 && `pagina ${pagina}`].filter(Boolean).join(" · ");
  const seo = paginaSeo("blog", leesSeoPaginas(site.seoPaginas));
  const { titel, deelTitel, omschrijving } = blogOverzichtSeo(seo, t, extra);
  const rss = { "application/rss+xml": [{ url: "/blog/rss.xml", title: rssTitel("Blog", site.korteNaam) }] };
  return {
    title: titel,
    description: omschrijving,
    alternates: { canonical: blogHref({ categorie, tag, pagina }), types: rss },
    ...(seo.nietIndexeren ? { robots: { index: false, follow: true } } : {}),
    ...deelMetadata(site, { titel: deelTitel, omschrijving, url: "/blog" }),
  };
}

/** Filterlink (categorie): rustige tekstlink, de actieve met een berry streep eronder. */
const FILTER =
  "inline-flex min-h-11 items-center border-b-2 px-0.5 text-[15px] font-bold transition-colors hover:text-berry";
const FILTER_UIT = `${FILTER} border-transparent text-ink-soft`;
const FILTER_AAN = `${FILTER} border-berry text-berry`;

/** Paginering: ronde knopjes van 44 px. */
const PAGINA =
  "inline-flex min-h-11 min-w-11 items-center justify-center rounded-full border px-4 text-[15px] font-bold transition-colors";
const PAGINA_UIT = `${PAGINA} border-line bg-white text-ink hover:border-berry hover:text-berry`;
const PAGINA_AAN = `${PAGINA} border-berry bg-berry text-white`;

/** Tag (#onderwerp): klein en ingetogen. */
const TAG =
  "inline-flex min-h-9 items-center rounded-full border border-line bg-white px-3 text-[14px] font-semibold text-ink-soft hover:border-berry hover:text-berry aria-[current=page]:border-berry aria-[current=page]:bg-berry aria-[current=page]:text-white";

export default async function BlogOverzicht({ searchParams }: { searchParams: Zoek }) {
  const zoek = await searchParams;
  const categorie = leesFilter(zoek.categorie);
  const tag = leesFilter(zoek.tag, 40)?.toLowerCase();
  const gevraagd = leesPagina(zoek.pagina);
  const gefilterd = Boolean(categorie || tag);

  const [t, nieuwsbrief, categorieen, tags, uitgelicht] = await Promise.all([
    leesSectie(BLOG_OVERZICHT),
    leesSectie(NIEUWSBRIEF_AANMELDEN),
    haalCategorieen(),
    haalTags(),
    gefilterd ? Promise.resolve(null) : haalUitgelicht(),
  ]);
  // Het uitgelichte bericht staat groot bovenaan pagina 1 en telt niet mee in het raster.
  const { berichten, totaal } = await haalGepubliceerd({
    pagina: gevraagd,
    perPagina: PER_PAGINA,
    categorie,
    tag,
    zonder: uitgelicht?.id,
  });
  const p = paginering(totaal, gevraagd);
  if (gevraagd > p.paginas) notFound();

  const toonUitgelicht = uitgelicht && p.pagina === 1;
  const leeg = !berichten.length && !toonUitgelicht;
  const href = (pagina: number) => blogHref({ categorie, tag, pagina });

  return (
    <main className="flex w-full flex-1 flex-col">
      {p.vorige && <link rel="prev" href={href(p.vorige)} />}
      {p.volgende && <link rel="next" href={href(p.volgende)} />}

      <InhoudKop
        midden
        bovenschrift={
          <Link href="/" className="hover:underline focus-visible:underline">
            {t.merk.trim() ? `${t.merk.trim()} · ` : ""}
            {t.bovenschrift}
          </Link>
        }
        titel={t.titel}
        intro={t.intro}
      />

      <div className={`${CONTAINER} flex flex-col gap-12 py-12 tablet:py-16`}>
        {(categorieen.length > 0 || tag) && (
          <div className="flex flex-col gap-4">
            {categorieen.length > 0 && (
              <nav aria-label="Categorieën" className="border-b border-line">
                <ul className="m-0 flex list-none flex-wrap gap-x-7 gap-y-1 p-0">
                  <li>
                    <Link href="/blog" aria-current={!categorie ? "page" : undefined} className={!categorie ? FILTER_AAN : FILTER_UIT}>
                      {t.alle_label}
                    </Link>
                  </li>
                  {categorieen.map((c) => {
                    const actief = c.naam === categorie;
                    return (
                      <li key={c.naam}>
                        <Link
                          href={blogHref({ categorie: c.naam })}
                          aria-current={actief ? "page" : undefined}
                          className={actief ? FILTER_AAN : FILTER_UIT}
                        >
                          {c.naam}&nbsp;<span className="font-semibold">({c.aantal})</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            {tag && (
              <p className="m-0 flex flex-wrap items-center gap-2 text-[15px] text-ink-soft">
                {t.tag_label}
                <span className="rounded-full bg-berry px-3 py-0.5 font-bold text-white">#{tag}</span>
                <TekstLink href={blogHref({ categorie })} className="text-[15px] text-ink">
                  {t.filter_wissen}
                </TekstLink>
              </p>
            )}
          </div>
        )}

        {toonUitgelicht && uitgelicht && <ArtikelUitgelicht bericht={uitgelicht} label={t.uitgelicht_label} />}

        {leeg ? (
          <section className="mx-auto flex max-w-xl flex-col items-center gap-3 py-10 text-center">
            <h2 className={`${H3} text-[30px]`}>{gefilterd ? t.leeg_filter : t.leeg_titel}</h2>
            {gefilterd ? (
              <Knop href="/blog" variant="outline" klein>
                {t.alle_berichten}
              </Knop>
            ) : (
              <p className="m-0 text-[18px] text-ink-soft">{t.leeg_tekst}</p>
            )}
          </section>
        ) : (
          berichten.length > 0 && (
            <section aria-label="Berichten">
              <ArtikelRaster berichten={berichten} kop="h2" />
            </section>
          )
        )}

        {p.paginas > 1 && (
          <nav aria-label="Paginering" className="flex flex-wrap items-center justify-center gap-2">
            {p.vorige ? (
              <Link href={href(p.vorige)} rel="prev" className={PAGINA_UIT}>
                <span aria-hidden="true">←</span>&nbsp;{t.vorige}
              </Link>
            ) : null}
            {paginaNummers(p.pagina, p.paginas).map((n, i) =>
              n === "…" ? (
                <span key={`gat${i}`} className="px-1 text-ink-soft" aria-hidden="true">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={href(n)}
                  aria-current={n === p.pagina ? "page" : undefined}
                  aria-label={`Pagina ${n}`}
                  className={n === p.pagina ? PAGINA_AAN : PAGINA_UIT}
                >
                  {n}
                </Link>
              ),
            )}
            {p.volgende ? (
              <Link href={href(p.volgende)} rel="next" className={PAGINA_UIT}>
                {t.volgende}&nbsp;<span aria-hidden="true">→</span>
              </Link>
            ) : null}
          </nav>
        )}

        {tags.length > 0 && (
          <nav aria-labelledby="onderwerpen" className="border-t border-line pt-8">
            <h2 id="onderwerpen" className={`${BOVENSCHRIFT} font-sans`}>
              {t.onderwerpen}
            </h2>
            <ul className="m-0 flex list-none flex-wrap gap-2 p-0">
              {tags.slice(0, 20).map((tg) => (
                <li key={tg.naam}>
                  <Link href={blogHref({ tag: tg.naam })} aria-current={tg.naam === tag ? "page" : undefined} className={TAG}>
                    #{tg.naam}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <InhoudNieuwsbrief
        teksten={nieuwsbrief}
        onder={
          <p className="mt-5 mb-0 text-center text-[15px] text-ink-soft">
            {t.rss_vraag}{" "}
            <a href="/blog/rss.xml" className="font-bold text-ink underline underline-offset-[5px] hover:text-berry">
              {t.rss_link}
            </a>
          </p>
        }
      />
    </main>
  );
}
