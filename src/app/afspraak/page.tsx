import type { Metadata } from "next";
import { AfspraakBlok } from "@/components/blokken/AfspraakBlok";

// Afspraak maken. Per request (de soorten kunnen in het beheer wijzigen; de vrije
// tijden haalt het formulier zelf op via /api/afspraak/tijden).
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Afspraak maken",
  description: "Maak online een afspraak voor persoonlijk imago- en kledingadvies.",
  alternates: { canonical: "/afspraak" },
};

export default function AfspraakPagina() {
  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-6 py-10 sm:py-14">
      <AfspraakBlok />
    </main>
  );
}
