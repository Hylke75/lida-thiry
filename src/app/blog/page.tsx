import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BerichtMeta, BlogBeeld, BlogKaart } from "@/components/blog/BlogKaart";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { Opmaak } from "@/components/Opmaak";
import { haalCategorieen, haalGepubliceerd, haalTags, haalUitgelicht } from "@/lib/blog/publiek";
import { blogHref, leesFilter, leesPagina, paginaNummers, paginering, PER_PAGINA } from "@/lib/blog/lijst";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_OVERZICHT } from "@/lib/inhoud/groepen/blog";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";

// Per request gerenderd: de pagina hangt af van ?categorie, ?tag en ?pagina. De
// gegevens zelf komen wel uit de datacache (tag "blog", levensduur 120 s), dus
// een ingepland bericht verschijnt uiterlijk 2 minuten na het ingestelde moment.
export const dynamic = "force-dynamic";

type Zoek = Promise<Record<string, string | string[] | undefined>>;

const RSS = { "application/rss+xml": [{ url: "/blog/rss.xml", title: "Blog · Lida Thiry" }] };

export async function generateMetadata({ searchParams }: { searchParams: Zoek }): Promise<Metadata> {
  const [zoek, t] = await Promise.all([searchParams, leesSectie(BLOG_OVERZICHT)]);
  const categorie = leesFilter(zoek.categorie);
  const tag = leesFilter(zoek.tag, 40);
  const pagina = leesPagina(zoek.pagina);
  const extra = [categorie, tag && `#${tag}`, pagina > 1 && `pagina ${pagina}`].filter(Boolean).join(" · ");
  const titel = extra ? `${t.titel} · ${extra}` : t.titel;
  return {
    title: `Blog: ${titel}`,
    description: t.intro,
    alternates: { canonical: blogHref({ categorie, tag, pagina }), types: RSS },
    openGraph: {
      type: "website",
      locale: "nl_NL",
      siteName: "Lida Thiry Imago & Kledingadvies",
      title: titel,
      description: t.intro,
      url: "/blog",
    },
    twitter: { card: "summary_large_image", title: titel, description: t.intro },
  };
}

const PIL =
  "rounded-full px-4 py-1.5 text-sm ring-1 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent";
const PIL_UIT = `${PIL} bg-kaart text-foreground/70 ring-foreground/10 hover:text-accent hover:ring-accent/40`;
const PIL_AAN = `${PIL} bg-accent text-background ring-accent`;

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

      <header className="bg-accent-zacht/60">
        <div className="mx-auto flex w-full max-w-5xl flex-col items-center gap-4 px-6 py-14 text-center sm:py-20">
          <Link
            href="/"
            className="text-xs font-medium tracking-widest text-accent uppercase hover:underline focus-visible:underline"
          >
            Lida Thiry · {t.bovenschrift}
          </Link>
          <h1 className="font-serif text-4xl leading-tight font-semibold tracking-tight text-balance break-words hyphens-auto sm:text-5xl">
            {t.titel}
          </h1>
          <p className="max-w-2xl text-lg text-balance text-foreground/70">{t.intro}</p>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-5xl flex-col gap-10 px-6 py-10 sm:py-14">
        {(categorieen.length > 0 || tag) && (
          <div className="flex flex-col gap-4">
            {categorieen.length > 0 && (
              <nav aria-label="Categorieën">
                <ul className="flex flex-wrap gap-2">
                  <li>
                    <Link href="/blog" aria-current={!categorie ? "page" : undefined} className={!categorie ? PIL_AAN : PIL_UIT}>
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
                          className={actief ? PIL_AAN : PIL_UIT}
                        >
                          {c.naam} <span className="opacity-60">({c.aantal})</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </nav>
            )}
            {tag && (
              <p className="flex flex-wrap items-center gap-2 text-sm text-foreground/70">
                Berichten met de tag
                <span className="rounded-full bg-accent-zacht px-3 py-1 font-medium text-accent">#{tag}</span>
                <Link
                  href={blogHref({ categorie })}
                  className="text-foreground/50 underline underline-offset-4 hover:text-accent"
                >
                  filter wissen
                </Link>
              </p>
            )}
          </div>
        )}

        {toonUitgelicht && uitgelicht && (
          <article className="group relative grid overflow-hidden rounded-3xl bg-kaart shadow-sm ring-1 ring-foreground/5 transition-shadow focus-within:ring-2 focus-within:ring-accent hover:shadow-md md:grid-cols-[1.25fr_1fr]">
            <BlogBeeld bericht={uitgelicht} prioriteit decoratief sizes="(min-width: 1024px) 570px, (min-width: 768px) 55vw, 100vw" className="aspect-[3/2] w-full md:aspect-auto md:min-h-80" />
            <div className="flex flex-col justify-center gap-3 p-6 sm:p-8">
              <p className="flex flex-wrap items-center gap-2 text-xs font-medium tracking-widest uppercase">
                <span className="rounded-full bg-accent px-2.5 py-0.5 text-background">{t.uitgelicht_label}</span>
                {uitgelicht.categorie && <span className="text-accent">{uitgelicht.categorie}</span>}
              </p>
              <h2 className="font-serif text-3xl leading-tight font-semibold text-balance break-words hyphens-auto sm:text-4xl">
                <Link
                  href={`/blog/${uitgelicht.slug}`}
                  className="outline-none after:absolute after:inset-0 after:content-[''] group-hover:text-accent"
                >
                  {uitgelicht.titel}
                </Link>
              </h2>
              {uitgelicht.samenvatting && <p className="text-foreground/70">{uitgelicht.samenvatting}</p>}
              <BerichtMeta bericht={uitgelicht} className="mt-2" />
            </div>
          </article>
        )}

        {leeg ? (
          <section className="mx-auto flex max-w-xl flex-col items-center gap-3 py-10 text-center">
            <span className="font-serif text-5xl text-accent/60 italic" aria-hidden="true">
              ~
            </span>
            <h2 className="font-serif text-2xl font-semibold">{gefilterd ? t.leeg_filter : t.leeg_titel}</h2>
            {gefilterd ? (
              <Link href="/blog" className="text-accent underline underline-offset-4">
                Bekijk alle berichten
              </Link>
            ) : (
              <p className="text-foreground/70">{t.leeg_tekst}</p>
            )}
          </section>
        ) : (
          berichten.length > 0 && (
            <section aria-label="Berichten">
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {berichten.map((b) => (
                  <li key={b.id}>
                    <BlogKaart bericht={b} kop="h2" />
                  </li>
                ))}
              </ul>
            </section>
          )
        )}

        {p.paginas > 1 && (
          <nav aria-label="Paginering" className="flex flex-wrap items-center justify-center gap-2 text-sm">
            {p.vorige ? (
              <Link href={href(p.vorige)} rel="prev" className={PIL_UIT}>
                ← Vorige
              </Link>
            ) : null}
            {paginaNummers(p.pagina, p.paginas).map((n, i) =>
              n === "…" ? (
                <span key={`gat${i}`} className="px-1 text-foreground/40" aria-hidden="true">
                  …
                </span>
              ) : (
                <Link
                  key={n}
                  href={href(n)}
                  aria-current={n === p.pagina ? "page" : undefined}
                  aria-label={`Pagina ${n}`}
                  className={n === p.pagina ? PIL_AAN : PIL_UIT}
                >
                  {n}
                </Link>
              ),
            )}
            {p.volgende ? (
              <Link href={href(p.volgende)} rel="next" className={PIL_UIT}>
                Volgende →
              </Link>
            ) : null}
          </nav>
        )}

        {tags.length > 0 && (
          <nav aria-label="Onderwerpen" className="border-t border-foreground/10 pt-8">
            <h2 className="mb-3 text-sm font-medium text-foreground/60">Onderwerpen</h2>
            <ul className="flex flex-wrap gap-2">
              {tags.slice(0, 20).map((tg) => (
                <li key={tg.naam}>
                  <Link
                    href={blogHref({ tag: tg.naam })}
                    aria-current={tg.naam === tag ? "page" : undefined}
                    className="inline-block rounded-full bg-accent-zacht/70 px-3 py-1 text-xs text-foreground/70 hover:text-accent focus-visible:outline-2 focus-visible:outline-accent aria-[current=page]:bg-accent aria-[current=page]:text-background"
                  >
                    #{tg.naam}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        )}
      </div>

      <section className="bg-kaart">
        <div className="mx-auto w-full max-w-5xl px-6 py-16">
          <NieuwsbriefAanmelden teksten={nieuwsbrief} toestemming={<Opmaak tekst={nieuwsbrief.toestemming_tekst} />} />
          <p className="mt-6 text-center text-xs text-foreground/50">
            Liever een feedlezer?{" "}
            <a href="/blog/rss.xml" className="underline underline-offset-4 hover:text-accent">
              Volg de blog via RSS
            </a>
          </p>
        </div>
      </section>
    </main>
  );
}
