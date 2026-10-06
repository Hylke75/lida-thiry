import type { Metadata } from "next";
import { vastePaginaMetadataVoor } from "@/lib/website/lees";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";
import { Bovenschrift, Knop, TekstLink } from "@/components/site/Basis";
import { KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { leesSectie } from "@/lib/inhoud/lees";
import { AFSPRAKEN_BOEKEN } from "@/lib/inhoud/groepen/afspraken";
import { afspraakBoekbaar, linkBestaat } from "@/lib/website/links";
import { veiligeLink } from "@/lib/website/weergave";

// Afspraak maken. Statisch met ISR: de soorten (tag "afspraken") en teksten (tag
// "inhoud") komen uit de datacache; opslaan in het beheer vernieuwt ze direct.
// De vrije tijden zijn wél per moment anders: die haalt het formulier zelf op via
// /api/afspraak/tijden (dynamisch), dus de pagina hoeft daarvoor niet per request.
export const revalidate = 900;

/** Titel en omschrijving: Beheer → Website → SEO (standaard in lib/website/seo.ts). */
export function generateMetadata(): Promise<Metadata> {
  return vastePaginaMetadataVoor("afspraak");
}

export default async function AfspraakPagina() {
  const [t, boekbaar] = await Promise.all([leesSectie(AFSPRAKEN_BOEKEN), afspraakBoekbaar()]);

  // Niets te boeken: geen leeg formulier, maar een vriendelijke verwijzing naar
  // contact (als die pagina bestaat) en naar de figuurtest.
  if (!boekbaar) {
    const link = veiligeLink(t.geen_soorten_link, "");
    const knop = t.geen_soorten_knop.trim() && link && link !== "/afspraak" && (await linkBestaat(link)) ? link : null;
    return (
      <KlantPagina>
        <KlantKop bovenschrift={t.bovenschrift} titel={t.geen_soorten_titel || t.paginakop || "Afspraak maken"}>
          <p>{t.geen_soorten}</p>
        </KlantKop>
        <div className="flex flex-col items-start gap-4 tablet:flex-row tablet:items-center tablet:gap-6">
          {knop && <Knop href={knop}>{t.geen_soorten_knop}</Knop>}
          {t.geen_soorten_test.trim() && (
            <TekstLink href="/figuurtest" pijl>
              {t.geen_soorten_test}
            </TekstLink>
          )}
        </div>
      </KlantPagina>
    );
  }

  return (
    <KlantPagina breedte="midden">
      {t.bovenschrift && <Bovenschrift>{t.bovenschrift}</Bovenschrift>}
      {/* Het blok heeft een eigen (zichtbare) h2; de pagina zelf heeft één h1 nodig. */}
      <h1 className="sr-only">{t.paginakop || "Afspraak maken"}</h1>
      <AfspraakBlok />
    </KlantPagina>
  );
}
