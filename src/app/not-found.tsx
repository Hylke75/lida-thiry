import type { Metadata } from "next";
import Link from "next/link";
import { leesSectie } from "@/lib/inhoud/lees";
import { WEBSITE_FOUT } from "@/lib/inhoud/groepen/website";
import { haalLaatste } from "@/lib/blog/publiek";
import { haalPagina } from "@/lib/paginas/publiek";
import { ArtikelRaster } from "@/components/site/ArtikelKaart";
import { Container, Knop, Pijl, SectieKop, TekstLink } from "@/components/site/Basis";
import { InhoudKop } from "@/components/site/InhoudKop";
import { H3, SECTIE } from "@/components/site/stijl";

/** Gekleurde rand bovenaan de suggesties (zoals de stappen op de homepage). */
const RANDEN = ["border-t-coral", "border-t-sage", "border-t-butter", "border-t-sky"] as const;

export const metadata: Metadata = {
  title: "Pagina niet gevonden",
  robots: { index: false },
};

/**
 * 404-pagina (ook voor notFound() in [pagina] en blog/[slug]). Teksten uit
 * Beheer → Teksten → Website → Foutpagina's. Alles faalt zacht: zonder database
 * staan er de standaardteksten en de vaste links.
 */
export default async function NietGevonden() {
  const [t, contact, berichten] = await Promise.all([
    leesSectie(WEBSITE_FOUT),
    haalPagina("contact").catch(() => null),
    haalLaatste(3).catch(() => []),
  ]);

  const suggesties = [
    { href: "/", label: t.homeKnop, uitleg: "Lees wat de kledingadviestest je oplevert." },
    { href: "/bestellen", label: "Doe de test", uitleg: "Ontdek je figuurtype en ontvang je persoonlijke advies." },
    { href: "/blog", label: "Blog", uitleg: "Tips en inspiratie over kleding en figuur." },
    ...(contact ? [{ href: "/contact", label: contact.menu_label || contact.titel, uitleg: "Stel je vraag rechtstreeks aan Lida." }] : []),
  ];

  return (
    <main className="flex w-full flex-1 flex-col">
      <InhoudKop
        midden
        bovenschrift="Foutcode 404"
        titel={t.nietGevondenTitel}
        intro={t.nietGevondenTekst}
        onder={
          <div className="mt-3">
            <Knop href="/">{t.homeKnop}</Knop>
          </div>
        }
      />

      <section aria-labelledby="suggesties" className={SECTIE}>
        <Container>
          <SectieKop id="suggesties" variant="midden" titel={t.suggestiesTitel} />
          <ul className="m-0 grid list-none grid-cols-1 gap-[18px] p-0 tablet:grid-cols-2 desktop:grid-cols-4">
            {suggesties.map((s, i) => (
              <li key={s.href}>
                <Link
                  href={s.href}
                  className={`group flex h-full flex-col gap-2 border-t-[5px] bg-white px-6 py-7 shadow-[0_14px_40px_rgba(58,40,52,.06)] transition-transform motion-safe:hover:-translate-y-0.5 ${RANDEN[i % RANDEN.length]}`}
                >
                  <span className={`${H3} text-[23px] group-hover:text-berry`}>
                    {s.label}&nbsp;<Pijl />
                  </span>
                  <span className="text-[15px] text-ink-soft">{s.uitleg}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {berichten.length > 0 && (
        <section aria-labelledby="nieuw-op-blog" className={`${SECTIE} bg-[#fffaf4]`}>
          <Container>
            <SectieKop
              id="nieuw-op-blog"
              titel={t.blogTitel}
              rechts={
                <TekstLink href="/blog" pijl>
                  Alle artikelen
                </TekstLink>
              }
            />
            <ArtikelRaster berichten={berichten} />
          </Container>
        </section>
      )}
    </main>
  );
}
