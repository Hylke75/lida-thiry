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
import { veiligeLink } from "@/lib/website/weergave";

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

  // Suggesties uit de teksten. Een lege linktekst bij / of /contact gebruikt de
  // knoptekst naar de homepage of de naam van de contactpagina; /contact alleen als die pagina bestaat.
  const suggesties = t.suggesties.flatMap((s) => {
    const href = veiligeLink(s.link, "");
    if (!href || (href === "/contact" && !contact)) return [];
    const reserve = href === "/" ? t.homeKnop : href === "/contact" && contact ? contact.menu_label || contact.titel : "";
    const label = s.label.trim() || reserve;
    return label ? [{ id: s._id, href, label, uitleg: s.uitleg }] : [];
  });

  return (
    <main className="flex w-full flex-1 flex-col">
      <InhoudKop
        midden
        bovenschrift={t.bovenschrift}
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
            {suggesties.map((s) => (
              <li key={s.id}>
                <Link
                  href={s.href}
                  className="group flex h-full flex-col gap-2 rounded-[8px] border border-line bg-white px-6 py-7 transition-colors hover:border-berry"
                >
                  <span className={`${H3} text-[23px] group-hover:text-berry`}>
                    {s.label}&nbsp;<Pijl />
                  </span>
                  <span className="text-[17px] text-ink-soft">{s.uitleg}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Container>
      </section>

      {berichten.length > 0 && (
        <section aria-labelledby="nieuw-op-blog" className={`${SECTIE} bg-cream`}>
          <Container>
            <SectieKop
              id="nieuw-op-blog"
              titel={t.blogTitel}
              rechts={
                <TekstLink href="/blog" pijl>
                  {t.blogLink}
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
