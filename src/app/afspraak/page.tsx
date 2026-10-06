import type { Metadata } from "next";
import { vastePaginaMetadataVoor } from "@/lib/website/lees";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";
import { Bovenschrift } from "@/components/site/Basis";
import { KlantPagina } from "@/components/site/KlantPagina";
import { leesSectie } from "@/lib/inhoud/lees";
import { AFSPRAKEN_BOEKEN } from "@/lib/inhoud/groepen/afspraken";

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
  const t = await leesSectie(AFSPRAKEN_BOEKEN);
  return (
    <KlantPagina breedte="midden">
      {t.bovenschrift && <Bovenschrift>{t.bovenschrift}</Bovenschrift>}
      {/* Het blok heeft een eigen (zichtbare) h2; de pagina zelf heeft één h1 nodig. */}
      <h1 className="sr-only">{t.paginakop || "Afspraak maken"}</h1>
      <AfspraakBlok />
    </KlantPagina>
  );
}
