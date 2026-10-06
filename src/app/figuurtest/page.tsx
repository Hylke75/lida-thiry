import type { Metadata } from "next";
import { leesPubliekeInstellingen, leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import {
  FIGUURTEST_AFSLUITING,
  FIGUURTEST_INHOUD,
  FIGUURTEST_PAGINA,
  FIGUURTEST_VOORBEREIDING,
} from "@/lib/inhoud/groepen/figuurtest";
import { BESTELLEN_PAGINA } from "@/lib/inhoud/groepen/bestellen";
import { WEBSITE_VRAGEN } from "@/lib/inhoud/groepen/website";
import { formatteerBedrag } from "@/lib/prijs";
import { siteUrl } from "@/lib/site";
import { testProductJsonLd, veiligeJson } from "@/lib/seo/structuur";
import { leesProductNaam } from "@/lib/verkoop/regels";
import { leesWebsite, vastePaginaMetadataVoor } from "@/lib/website/lees";
import { zonderAccent } from "@/lib/website/weergave";
import { Bovenschrift, Knop, KopTekst } from "@/components/site/Basis";
import { KLANT_H1, KlantMelding, KlantVinklijst } from "@/components/site/KlantPagina";
import { CONTAINER, H2 } from "@/components/site/stijl";
import { PdfVoorbeeld } from "./PdfVoorbeeld";

// De productpagina van de online figuurtest: wat je krijgt, een algemeen
// voorbeeld van het advies, wat je nodig hebt, de prijs en de knop naar
// /bestellen. Statisch met ISR: teksten (tag "inhoud") en prijs/productnaam (tag
// "instellingen") komen uit de datacache; opslaan in het beheer vernieuwt direct.
//
// Openbaar: nooit figuurtypes (namen, tekeningen, uitleg) of advies per type;
// die zijn alleen voor klanten achter de testlink.
export const revalidate = 3600;

/** Titel en omschrijving: Beheer → Website → SEO (standaard in lib/website/seo.ts). */
export function generateMetadata(): Promise<Metadata> {
  return vastePaginaMetadataVoor("figuurtest");
}

/** Lopende tekst op deze pagina: 17–18 px en donker, goed leesbaar. */
const TEKST = "text-[17px] leading-[1.65] text-ink tablet:text-[18px]";
const SECTIE = "py-14 tablet:py-[76px]";

export default async function FiguurtestPagina() {
  const [pagina, inhoud, voorbereiding, afsluiting, vragen, bestellen, site] = await Promise.all([
    leesSectie(FIGUURTEST_PAGINA),
    leesSectie(FIGUURTEST_INHOUD),
    leesSectie(FIGUURTEST_VOORBEREIDING),
    leesSectie(FIGUURTEST_AFSLUITING),
    leesSectie(WEBSITE_VRAGEN),
    leesSectie(BESTELLEN_PAGINA),
    leesWebsite(),
  ]);

  let prijsCent: number | null = null;
  let valuta = "EUR";
  let productNaam = leesProductNaam(null);
  try {
    const [inst, prijs] = await Promise.all([leesPubliekeInstellingen(), leesPubliekePrijs()]);
    productNaam = leesProductNaam(inst.product_naam);
    prijsCent = prijs.prijsCent;
    valuta = prijs.valuta;
  } catch {
    prijsCent = null;
  }
  const prijsLabel = prijsCent ? formatteerBedrag(prijsCent, valuta) : null;

  // Product met aanbod alleen als er een prijs is (anders geen gestructureerde gegevens).
  const jsonLd = prijsCent
    ? testProductJsonLd({
        naam: productNaam,
        omschrijving: pagina.intro.trim() || zonderAccent(pagina.titel),
        url: siteUrl(),
        pad: "/figuurtest",
        prijsCent,
        valuta,
        afbeelding: site.deelAfbeeldingUrl ?? site.logoUrl,
      })
    : null;

  const feiten = pagina.feiten.filter((f) => f.tekst.trim());
  const benodigd = voorbereiding.punten.filter((p) => p.titel.trim());
  const faq = afsluiting.vragenTitel.trim() ? vragen.vragen.filter((v) => v.vraag.trim()) : [];
  const knop = pagina.knop.trim() || "Start de figuurtest";

  return (
    <main className="-mb-16 flex w-full flex-1 flex-col bg-paper">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: veiligeJson(jsonLd) }} />}

      {/* Kop: wat het is, kernpunten, prijs en de knop naar het bestelformulier. */}
      <section aria-labelledby="figuurtest-titel" className={SECTIE}>
        <div className={`${CONTAINER} grid grid-cols-1 items-start gap-10 desktop:grid-cols-[1.15fr_.85fr] desktop:gap-16`}>
          <div className="max-w-[680px]">
            {pagina.bovenschrift && <Bovenschrift>{pagina.bovenschrift}</Bovenschrift>}
            <h1 id="figuurtest-titel" className={KLANT_H1}>
              <KopTekst tekst={pagina.titel} />
            </h1>
            {pagina.intro.trim() && <p className={`mt-0 mb-8 ${TEKST}`}>{pagina.intro}</p>}
            <Knop href="/bestellen">{knop}</Knop>
            {pagina.knopUitleg.trim() && <p className="mt-4 mb-0 text-[15px] leading-[1.55] text-ink-soft">{pagina.knopUitleg}</p>}
          </div>

          <aside aria-labelledby="figuurtest-prijs" className="border border-line bg-white p-6 tablet:p-8">
            <h2 id="figuurtest-prijs" className="mt-0 mb-1 text-[13px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">
              {pagina.prijsLabel || "Prijs"}
            </h2>
            <p className="mt-0 mb-1 text-[17px] font-bold text-ink">{productNaam}</p>
            {prijsLabel ? (
              <p className="mt-0 mb-6 text-ink" data-testid="figuurtest-prijs">
                <span className="font-serif text-[40px] leading-[1.1]">{prijsLabel}</span>{" "}
                <span className="text-[15px] text-ink-soft">{pagina.btw}</span>
              </p>
            ) : (
              <KlantMelding soort="info" className="mt-3 mb-6">
                {bestellen.geenPrijs}
              </KlantMelding>
            )}
            {feiten.length > 0 && (
              <dl className="m-0 mb-6 grid gap-0 divide-y divide-line border-y border-line">
                {feiten.map((f) => (
                  <div key={f._id} className="flex flex-wrap items-baseline justify-between gap-x-4 py-3">
                    <dt className="text-[14px] font-bold text-ink-soft">{f.label}</dt>
                    <dd className="m-0 text-[16px] text-ink">{f.tekst}</dd>
                  </div>
                ))}
              </dl>
            )}
            <Knop href="/bestellen" className="w-full">
              {knop}
            </Knop>
          </aside>
        </div>
      </section>

      {/* Wat je krijgt, met een getekend voorbeeld van de PDF (zonder echte inhoud). */}
      <section aria-labelledby="figuurtest-inhoud" className={`${SECTIE} border-t border-line bg-white`}>
        <div className={`${CONTAINER} grid grid-cols-1 items-start gap-10 desktop:grid-cols-2 desktop:gap-16`}>
          <div className="max-w-[620px]">
            {inhoud.bovenschrift && <Bovenschrift>{inhoud.bovenschrift}</Bovenschrift>}
            <h2 id="figuurtest-inhoud" className={H2}>
              <KopTekst tekst={inhoud.titel} />
            </h2>
            {inhoud.intro.trim() && <p className={`mt-0 mb-7 ${TEKST}`}>{inhoud.intro}</p>}
            <KlantVinklijst punten={inhoud.punten.map((p) => p.tekst)} className={TEKST} />
          </div>
          <PdfVoorbeeld
            titel={inhoud.voorbeeldTitel}
            koppen={inhoud.voorbeeldPaginas.map((p) => p.kop)}
            onderschrift={inhoud.voorbeeldOnderschrift}
          />
        </div>
      </section>

      {/* Wat heb je nodig? */}
      {benodigd.length > 0 && (
        <section aria-labelledby="figuurtest-nodig" className={`${SECTIE} border-t border-line`}>
          <div className={CONTAINER}>
            <div className="max-w-[680px]">
              {voorbereiding.bovenschrift && <Bovenschrift>{voorbereiding.bovenschrift}</Bovenschrift>}
              <h2 id="figuurtest-nodig" className={H2}>
                <KopTekst tekst={voorbereiding.titel} />
              </h2>
            </div>
            <ul className="m-0 mt-8 grid list-none grid-cols-1 gap-5 p-0 desktop:grid-cols-3">
              {benodigd.map((p, i) => (
                <li key={p._id} className="border border-line bg-white p-6">
                  <p className="mt-0 mb-2 font-serif text-[26px] leading-none text-berry" aria-hidden="true">
                    {i + 1}
                  </p>
                  <h3 className="mt-0 mb-2 text-[18px] font-bold text-ink">{p.titel}</h3>
                  {p.tekst.trim() && <p className="m-0 text-[17px] leading-[1.6] text-ink">{p.tekst}</p>}
                </li>
              ))}
            </ul>
            {voorbereiding.later.trim() && <p className={`mt-8 mb-0 max-w-[760px] ${TEKST}`}>{voorbereiding.later}</p>}
          </div>
        </section>
      )}

      {/* Veelgestelde vragen: dezelfde als op de homepage (Teksten → Website). */}
      {faq.length > 0 && (
        <section id="vragen" aria-labelledby="figuurtest-vragen" className={`${SECTIE} scroll-mt-24 border-t border-line bg-white`}>
          <div className={`${CONTAINER} max-w-[800px]`}>
            {afsluiting.vragenBovenschrift && <Bovenschrift>{afsluiting.vragenBovenschrift}</Bovenschrift>}
            <h2 id="figuurtest-vragen" className={H2}>
              {afsluiting.vragenTitel}
            </h2>
            <div className="mt-6 divide-y divide-line border-y border-line">
              {faq.map((v) => (
                <details key={v._id} className="group">
                  <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-4 py-4 text-[17px] font-bold text-ink [&::-webkit-details-marker]:hidden">
                    {v.vraag}
                    <span aria-hidden="true" className="font-serif text-[28px] leading-none text-berry transition-transform group-open:rotate-45">
                      +
                    </span>
                  </summary>
                  <p className="mt-0 mb-5 text-[17px] leading-[1.65] whitespace-pre-line text-ink">{v.antwoord}</p>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Afsluiting met de knop. */}
      <section aria-labelledby="figuurtest-afsluiting" className={`${SECTIE} border-t border-line`}>
        <div className={`${CONTAINER} max-w-[760px] text-center`}>
          <h2 id="figuurtest-afsluiting" className={H2}>
            <KopTekst tekst={afsluiting.titel} />
          </h2>
          {afsluiting.tekst.trim() && <p className={`mx-auto mt-0 mb-8 max-w-[620px] ${TEKST}`}>{afsluiting.tekst}</p>}
          <Knop href="/bestellen">{afsluiting.knop.trim() || knop}</Knop>
          {prijsLabel && (
            <p className="mt-4 mb-0 text-[15px] text-ink-soft">
              {prijsLabel} {pagina.btw}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
