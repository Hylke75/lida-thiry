import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BlogKaart } from "@/components/blog/BlogKaart";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";
import { ContactFormulierBlok } from "@/components/blokken/ContactFormulierBlok";
import { NieuwsbriefFormulierBlok } from "@/components/blokken/NieuwsbriefFormulierBlok";
import { Identiteit } from "@/components/JuridischePagina";
import { BlokRuimte, PaginaWeergave } from "@/components/paginas/PaginaWeergave";
import { haalLaatste } from "@/lib/blog/publiek";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_ARTIKEL } from "@/lib/inhoud/groepen/blog";
import { gebruikteBlokken, paginaOmschrijving } from "@/lib/paginas/beheer";
import { haalPagina } from "@/lib/paginas/publiek";
import { afmetingenVoorTekst } from "@/lib/media/publiek";
import { formulierSlugUitBlok } from "@/lib/paginas/regels";
import { kruimelpadJsonLd, veiligeJson } from "@/lib/seo/structuur";
import { siteUrl } from "@/lib/site";

// Beheerbare pagina's op /<slug> ("Over mij", "Contact", …).
//
// Routering: vaste routes (/blog, /bestellen, /privacy, /admin, /api, robots.txt,
// sitemap.xml, …) gaan in Next.js altijd vóór dit dynamische segment. Slugs die
// met zo'n vaste route samenvallen (GERESERVEERDE_SLUGS) kunnen niet worden
// opgeslagen en geven hier hoe dan ook een 404 (haalPagina geeft dan null), bijv.
// /test (alleen /test/<token> bestaat).
//
// Rendering: ISR. Een pagina wordt bij het eerste bezoek gerenderd en daarna uit
// de cache geserveerd. Alle gegevens (de pagina, menu/footer, teksten, blokken
// zoals formulieren, afspraaksoorten en de nieuwste blogberichten) komen uit de
// datacache met tags (lib/cache/tags.ts). Opslaan in het beheer vernieuwt die
// tags en roept revalidatePath aan, dus een wijziging is direct zichtbaar.
// Staat {laatste_blogs} op de pagina, dan wordt hij hooguit elke 2 minuten
// opnieuw opgebouwd (levensduur van de blog), anders hooguit elk uur.
// Prijs: een willekeurige URL levert een gecachete 404 op. Die is klein, en
// ongeldige slugs (geldigePaginaSlug) raken de database niet eens. Wordt later een
// pagina met die slug gepubliceerd, dan vernieuwt de tag "paginas" ook de 404.
// generateStaticParams geeft bewust een lege lijst: niets tijdens de build (de
// database is dan niet nodig), maar elke pagina valt wel onder ISR.
export const revalidate = 3600;

export function generateStaticParams(): { pagina: string }[] {
  return [];
}

type Params = Promise<{ pagina: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { pagina: slug } = await params;
  const p = await haalPagina(slug);
  if (!p) return { title: "Pagina niet gevonden", robots: { index: false } };
  const titel = p.seo_titel.trim() || p.titel;
  const omschrijving = paginaOmschrijving(p);
  const beeld = p.omslag_url ? [{ url: p.omslag_url, alt: p.omslag_alt || p.titel }] : undefined;
  return {
    title: titel,
    description: omschrijving || undefined,
    alternates: { canonical: `/${p.slug}` },
    ...(p.niet_indexeren ? { robots: { index: false, follow: true } } : {}),
    openGraph: {
      type: "website",
      locale: "nl_NL",
      siteName: "Lida Thiry Imago & Kledingadvies",
      url: `/${p.slug}`,
      title: titel,
      description: omschrijving || undefined,
      ...(beeld ? { images: beeld } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title: titel,
      description: omschrijving || undefined,
      ...(beeld ? { images: beeld.map((b) => b.url) } : {}),
    },
  };
}

/** {test}: korte uitnodiging met een knop naar de test (teksten uit Teksten → Blog). */
async function TestBlok() {
  const t = await leesSectie(BLOG_ARTIKEL);
  return (
    <aside className="relative overflow-hidden rounded-3xl bg-accent-zacht/70 px-6 py-10 text-center ring-1 ring-accent/15 sm:px-12">
      <span className="absolute -top-10 -right-10 h-40 w-40 rounded-full border border-accent/20" aria-hidden="true" />
      <p className="font-serif text-2xl font-semibold text-balance sm:text-3xl">{t.cta_titel}</p>
      <p className="mx-auto mt-3 max-w-xl text-foreground/70">{t.cta_tekst}</p>
      <Link
        href="/bestellen"
        className="mt-6 inline-block rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
      >
        {t.cta_knop}
      </Link>
    </aside>
  );
}

/** {laatste_blogs}: de drie nieuwste berichten; niets als er (nog) geen zijn. */
async function LaatsteBlogsBlok() {
  const berichten = await haalLaatste(3);
  if (!berichten.length) return null;
  return (
    <section aria-label="Nieuwste blogberichten" className="flex flex-col gap-4">
      <ul className="grid gap-6 md:grid-cols-3">
        {berichten.map((b) => (
          <li key={b.id}>
            <BlogKaart bericht={b} />
          </li>
        ))}
      </ul>
      <Link href="/blog" className="text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:underline">
        Alle blogberichten →
      </Link>
    </section>
  );
}

/** De blokken die in de tekst voorkomen, als echte componenten. */
function maakBlokken(namen: string[], slug: string): Record<string, ReactNode> {
  const uit: Record<string, ReactNode> = {};
  for (const naam of namen) {
    let blok: ReactNode = null;
    if (naam === "contactformulier") blok = <ContactFormulierBlok pagina={`/${slug}`} />;
    else if (naam === "afspraak") blok = <AfspraakBlok />;
    else if (naam === "nieuwsbrief") blok = <NieuwsbriefFormulierBlok />;
    else if (naam === "test") blok = <TestBlok />;
    else if (naam === "laatste_blogs") blok = <LaatsteBlogsBlok />;
    else if (naam === "bedrijfsgegevens") blok = <Identiteit />;
    else {
      const formulier = formulierSlugUitBlok(naam);
      if (formulier) blok = <NieuwsbriefFormulierBlok slug={formulier} />;
    }
    // Onbekende blokken tonen niets (de editor waarschuwt ervoor).
    if (blok) uit[naam] = <BlokRuimte>{blok}</BlokRuimte>;
  }
  return uit;
}

export default async function BeheerbarePagina({ params }: { params: Params }) {
  const { pagina: slug } = await params;
  const p = await haalPagina(slug);
  if (!p) notFound();
  const afmetingen = await afmetingenVoorTekst(p.inhoud);

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: veiligeJson(
            kruimelpadJsonLd(siteUrl(), [
              { naam: "Home", pad: "/" },
              { naam: p.titel, pad: `/${p.slug}` },
            ]),
          ),
        }}
      />
      <PaginaWeergave
        titel={p.titel}
        intro={p.intro}
        inhoud={p.inhoud}
        omslagUrl={p.omslag_url}
        omslagAlt={p.omslag_alt}
        blokken={maakBlokken(gebruikteBlokken(p.inhoud), p.slug)}
        afmetingen={afmetingen}
      />
    </main>
  );
}
