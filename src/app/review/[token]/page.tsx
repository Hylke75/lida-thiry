import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leesSectie } from "@/lib/inhoud/lees";
import { REVIEWS_FORMULIER } from "@/lib/inhoud/groepen/reviews";
import { reviewViaToken } from "@/lib/reviews/publiek";
import { magKlantBewerken } from "@/lib/reviews/regels";
import { KlantKaart, KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { ReviewFormulier } from "./ReviewFormulier";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Deel je ervaring",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

/** Reviewformulier via de persoonlijke link uit de uitnodiging. Onbekende link: 404. */
export default async function ReviewPagina({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const [review, teksten] = await Promise.all([reviewViaToken(token), leesSectie(REVIEWS_FORMULIER)]);
  if (!review) notFound();

  return (
    <KlantPagina midden={!magKlantBewerken(review.status)}>
      {magKlantBewerken(review.status) ? (
        <ReviewFormulier
          token={token}
          teksten={teksten}
          alIngevuld={review.status === "ingevuld"}
          begin={{
            sterren: review.sterren,
            tekst: review.tekst ?? "",
            naam: review.naam ?? "",
            // Toestemming is een bewuste keuze: standaard niet aangevinkt.
            toestemming: review.toestemming_publicatie,
          }}
        />
      ) : (
        <KlantKaart accent="butter">
          <KlantKop midden bovenschrift="Jouw ervaring" titel={teksten.afgesloten_titel} className="mb-0! tablet:mb-0!">
            <p className="whitespace-pre-line">{teksten.afgesloten_tekst}</p>
          </KlantKop>
        </KlantKaart>
      )}
    </KlantPagina>
  );
}
