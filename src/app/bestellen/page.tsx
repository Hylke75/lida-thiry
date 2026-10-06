import type { Metadata } from "next";
import { vastePaginaMetadataVoor } from "@/lib/website/lees";
import { leesPubliekeInstellingen, leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { BESTELLEN_FORMULIER, BESTELLEN_PAGINA } from "@/lib/inhoud/groepen/bestellen";
import { NIEUWSBRIEF_BESTELLING } from "@/lib/inhoud/groepen/nieuwsbrief";
import { gratisTestAan } from "@/lib/order-status";
import { leesProductNaam } from "@/lib/verkoop/regels";
import { TekstLink } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantMelding, KlantPagina } from "@/components/site/KlantPagina";
import { BestelFormulier } from "./BestelFormulier";
import { formatteerBedrag } from "@/lib/prijs";

// Statisch met ISR: teksten (tag "inhoud"), de prijs en de productnaam (tag
// "instellingen") komen uit de datacache; opslaan in het beheer vernieuwt de
// pagina direct. Het bedrag dat de klant betaalt, bepaalt /api/bestellen altijd
// vers uit de database. GRATIS_TEST (alleen aan met de waarde "1") is een
// omgevingsvariabele en verandert alleen met een nieuwe deploy.
export const revalidate = 3600;

/** Titel en omschrijving: Beheer → Website → SEO (standaard in lib/website/seo.ts). */
export function generateMetadata(): Promise<Metadata> {
  return vastePaginaMetadataVoor("bestellen");
}

export default async function BestellenPage() {
  const [pagina, formulier, nieuwsbrief] = await Promise.all([
    leesSectie(BESTELLEN_PAGINA),
    leesSectie(BESTELLEN_FORMULIER),
    leesSectie(NIEUWSBRIEF_BESTELLING),
  ]);
  const gratisTest = gratisTestAan();
  let prijsLabel: string | null = null;
  let productNaam = leesProductNaam(null);
  try {
    const [inst, { prijsCent, valuta }] = await Promise.all([leesPubliekeInstellingen(), leesPubliekePrijs()]);
    productNaam = leesProductNaam(inst.product_naam);
    if (prijsCent) prijsLabel = formatteerBedrag(prijsCent, valuta);
  } catch {
    prijsLabel = null;
  }
  const prijsBekend = prijsLabel !== null;

  return (
    <KlantPagina>
      <KlantKop bovenschrift={pagina.bovenschrift} titel={pagina.titel} terug={{ href: "/figuurtest", tekst: pagina.terug }} />

      {/* Overzicht van de bestelling: één digitaal product, zonder bezorging. */}
      <KlantKaart className="mb-6" aria-labelledby="bestelling-product">
        {pagina.overzichtTitel.trim() && (
          <p className="mt-0 mb-2 text-[13px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">{pagina.overzichtTitel}</p>
        )}
        <div className="flex flex-col gap-1 tablet:flex-row tablet:items-baseline tablet:justify-between tablet:gap-6">
          <h2 id="bestelling-product" className="m-0 font-serif text-[26px] leading-[1.15] font-normal text-ink">
            {productNaam}
          </h2>
          {prijsLabel && (
            <p className="m-0 shrink-0 text-[17px] text-ink" data-testid="bestelling-prijs">
              <strong className="font-serif text-[26px] font-normal">{prijsLabel}</strong>{" "}
              <span className="text-[14px] text-ink-soft">{pagina.btw}</span>
            </p>
          )}
        </div>
        {pagina.overzichtTekst.trim() && <p className="mt-3 mb-0 text-[17px] leading-[1.6] text-ink">{pagina.overzichtTekst}</p>}
        {pagina.overzichtLink.trim() && (
          <TekstLink href="/figuurtest" className="mt-1 text-[15px]">
            {pagina.overzichtLink}
          </TekstLink>
        )}
        {!prijsBekend && !gratisTest && (
          <KlantMelding soort="letop" className="mt-4">
            {pagina.geenPrijs}
          </KlantMelding>
        )}
      </KlantKaart>

      {(prijsBekend || gratisTest) && (
        <KlantKaart>
          <BestelFormulier prijsBekend={prijsBekend} gratisTest={gratisTest} teksten={formulier} nieuwsbriefVinkje={nieuwsbrief.vinkje} />
        </KlantKaart>
      )}
    </KlantPagina>
  );
}
