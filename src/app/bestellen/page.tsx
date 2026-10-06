import type { Metadata } from "next";
import { Fragment, type ReactNode } from "react";
import { leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { BESTELLEN_FORMULIER, BESTELLEN_PAGINA } from "@/lib/inhoud/groepen/bestellen";
import { NIEUWSBRIEF_BESTELLING } from "@/lib/inhoud/groepen/nieuwsbrief";
import { gratisTestAan } from "@/lib/order-status";
import { KlantKaart, KlantKop, KlantMelding, KlantPagina } from "@/components/site/KlantPagina";
import { BestelFormulier } from "./BestelFormulier";
import { formatteerBedrag } from "@/lib/prijs";

// Statisch met ISR: teksten (tag "inhoud") en de prijs (tag "instellingen") komen
// uit de datacache; opslaan in het beheer vernieuwt de pagina direct. Het bedrag
// dat de klant betaalt, bepaalt /api/bestellen altijd vers uit de database.
// GRATIS_TEST (alleen aan met de waarde "1") is een omgevingsvariabele en verandert alleen met een nieuwe deploy.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Bestellen",
  description:
    "Bestel de online kledingadviestest van Lida Thiry en ontvang direct je persoonlijke kledingadvies als PDF.",
  alternates: { canonical: "/bestellen" },
};

/** Zet {prijs} in een tekst om in het meegegeven element. */
function metPrijs(tekst: string, prijs: ReactNode): ReactNode {
  return tekst.split("{prijs}").map((deel, i) => (
    <Fragment key={i}>
      {i > 0 && prijs}
      {deel}
    </Fragment>
  ));
}

export default async function BestellenPage() {
  const [pagina, formulier, nieuwsbrief] = await Promise.all([
    leesSectie(BESTELLEN_PAGINA),
    leesSectie(BESTELLEN_FORMULIER),
    leesSectie(NIEUWSBRIEF_BESTELLING),
  ]);
  const gratisTest = gratisTestAan();
  let prijsLabel: string | null = null;
  let prijsBekend = false;
  try {
    const { prijsCent: cent, valuta } = await leesPubliekePrijs();
    if (cent) {
      prijsBekend = true;
      prijsLabel = formatteerBedrag(cent, valuta);
    }
  } catch {
    prijsBekend = false;
  }

  return (
    <KlantPagina>
      <KlantKop bovenschrift="Online figuurtest" titel={pagina.titel} terug={{ href: "/", tekst: "← Terug" }}>
        {prijsLabel && (
          <p>
            {metPrijs(pagina.prijsregel, <strong className="font-extrabold text-ink">{prijsLabel}</strong>)}{" "}
            <span className="text-[14px]">{pagina.btw}</span>
          </p>
        )}
      </KlantKop>

      {prijsBekend || gratisTest ? (
        <KlantKaart>
          <BestelFormulier prijsBekend={prijsBekend} gratisTest={gratisTest} teksten={formulier} nieuwsbriefVinkje={nieuwsbrief.vinkje} />
        </KlantKaart>
      ) : (
        <KlantMelding soort="letop">{pagina.geenPrijs}</KlantMelding>
      )}
    </KlantPagina>
  );
}
