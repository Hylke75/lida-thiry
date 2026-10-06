import type { Metadata } from "next";
import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { ArtikelKaart } from "@/components/site/ArtikelKaart";
import { TekstLink } from "@/components/site/Basis";
import { InhoudOproep } from "@/components/site/InhoudOproep";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";
import { ContactFormulierBlok } from "@/components/blokken/ContactFormulierBlok";
import { NieuwsbriefFormulierBlok } from "@/components/blokken/NieuwsbriefFormulierBlok";
import { Identiteit } from "@/components/JuridischePagina";
import { BlokRuimte, PaginaWeergave } from "@/components/paginas/PaginaWeergave";
import { haalLaatste } from "@/lib/blog/publiek";
import { leesSectie } from "@/lib/inhoud/lees";
import { BLOG_ARTIKEL } from "@/lib/inhoud/groepen/blog";
import { veiligeLink } from "@/lib/website/weergave";
import { gebruikteBlokken, paginaOmschrijving } from "@/lib/paginas/beheer";
import { haalPagina } from "@/lib/paginas/publiek";
import { afmetingenVoorTekst } from "@/lib/media/publiek";
import { formulierSlugUitBlok } from "@/lib/paginas/regels";
import { kruimelpadJsonLd, veiligeJson } from "@/lib/seo/structuur";
import { deelMetadata } from "@/lib/seo/delen";
import { leesWebsite } from "@/lib/website/lees";
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
  const [p, site] = await Promise.all([haalPagina(slug), leesWebsite()]);
  if (!p) return { title: "Pagina niet gevonden", robots: { index: false } };
  const titel = p.seo_titel.trim() || p.titel;
  const omschrijving = paginaOmschrijving(p) || undefined;
  return {
    title: titel,
    description: omschrijving,
    alternates: { canonical: `/${p.slug}` },
    ...(p.niet_indexeren ? { robots: { index: false, follow: true } } : {}),
    ...deelMetadata(site, {
      titel,
      omschrijving,
      url: `/${p.slug}`,
      beeld: p.omslag_url ? { url: p.omslag_url, alt: p.omslag_alt || p.titel } : null,
    }),
  };
}

/** {test}: korte uitnodiging met een knop naar de test (teksten uit Teksten → Blog). */
async function TestBlok() {
  const t = await leesSectie(BLOG_ARTIKEL);
  return <InhoudOproep kop="p" titel={t.cta_titel} tekst={t.cta_tekst} knop={t.cta_knop} href={veiligeLink(t.cta_link, "/bestellen")} />;
}

/** {laatste_blogs}: de drie nieuwste berichten; niets als er (nog) geen zijn. */
async function LaatsteBlogsBlok() {
  const berichten = await haalLaatste(3);
  if (!berichten.length) return null;
  return (
    <section aria-label="Nieuwste blogberichten" className="flex flex-col items-start gap-4">
      <ul className="m-0 grid w-full list-none grid-cols-1 gap-4 p-0 tablet:grid-cols-3">
        {berichten.map((b) => (
          <li key={b.id}>
            <ArtikelKaart bericht={b} compact sizes="(min-width: 760px) 230px, (min-width: 641px) 33vw, 100vw" />
          </li>
        ))}
      </ul>
      <TekstLink href="/blog" pijl className="text-[14px]">
        Alle blogberichten
      </TekstLink>
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
    <main className="flex w-full flex-1 flex-col">
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
