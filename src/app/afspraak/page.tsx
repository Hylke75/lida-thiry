import type { Metadata } from "next";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";

// Afspraak maken. Statisch met ISR: de soorten (tag "afspraken") en teksten (tag
// "inhoud") komen uit de datacache; opslaan in het beheer vernieuwt ze direct.
// De vrije tijden zijn wél per moment anders: die haalt het formulier zelf op via
// /api/afspraak/tijden (dynamisch), dus de pagina hoeft daarvoor niet per request.
export const revalidate = 900;

export const metadata: Metadata = {
  title: "Afspraak maken",
  description: "Maak online een afspraak voor persoonlijk imago- en kledingadvies.",
  alternates: { canonical: "/afspraak" },
};

export default function AfspraakPagina() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
      {/* Het blok heeft een eigen (zichtbare) h2; de pagina zelf heeft één h1 nodig. */}
      <h1 className="sr-only">Afspraak maken</h1>
      <AfspraakBlok />
    </main>
  );
}
