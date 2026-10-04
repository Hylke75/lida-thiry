import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { leesSectie } from "@/lib/inhoud/lees";
import { REVIEWS_FORMULIER } from "@/lib/inhoud/groepen/reviews";
import { reviewViaToken } from "@/lib/reviews/publiek";
import { magKlantBewerken } from "@/lib/reviews/regels";
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
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-6 py-16">
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
        <div className="flex flex-col gap-3 text-center">
          <h1 className="text-3xl font-semibold tracking-tight">{teksten.afgesloten_titel}</h1>
          <p className="whitespace-pre-line text-foreground/70">{teksten.afgesloten_tekst}</p>
        </div>
      )}
    </main>
  );
}
