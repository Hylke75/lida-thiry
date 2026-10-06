import type { Metadata } from "next";
import { Knop, knopKlassen } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantPagina, klantMeldingKlassen } from "@/components/site/KlantPagina";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn } from "@/lib/inhoud/schema";
import { BESTELLEN_HERVAT, BESTELLEN_FORMULIER } from "@/lib/inhoud/groepen/bestellen";
import { formatteerBedrag } from "@/lib/prijs";
import { beoordeelHervatten, type HervatBeoordeling } from "@/lib/hervatten";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bestelling afronden",
  robots: { index: false, follow: false },
};

export default async function HervatPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ t?: string; fout?: string }>;
}) {
  const [{ id }, { t: token = "", fout }] = await Promise.all([params, searchParams]);
  const [t, formulier] = await Promise.all([leesSectie(BESTELLEN_HERVAT), leesSectie(BESTELLEN_FORMULIER)]);
  let oordeel: HervatBeoordeling;
  try {
    oordeel = await beoordeelHervatten(id, token);
  } catch {
    oordeel = { soort: "ongeldig" };
  }

  const kop = (titel: string, tekst: string) => (
    <KlantKop midden bovenschrift="Je bestelling" titel={titel} className="mb-0! tablet:mb-0!">
      <p className="whitespace-pre-line">{tekst}</p>
    </KlantKop>
  );
  return (
    <KlantPagina midden>
      <KlantKaart
        accent={oordeel.soort === "open" ? "coral" : oordeel.soort === "betaald" ? "sage" : "butter"}
        className="flex flex-col items-center gap-6"
      >
        {oordeel.soort === "open" ? (
          <>
            {kop(
              t.titel,
              vulIn(t.tekst, {
                naam: oordeel.order.klantnaam,
                bedrag: formatteerBedrag(oordeel.order.bedrag_cent, oordeel.order.valuta || "EUR"),
              }),
            )}
            {fout && (
              <p role="alert" className={`${klantMeldingKlassen("fout")} w-full text-left`}>
                {formulier.foutVerbinding}
              </p>
            )}
            <form method="post" action="/api/bestellen/hervat">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="t" value={token} />
              <button className={knopKlassen()}>{t.knop}</button>
            </form>
          </>
        ) : oordeel.soort === "betaald" ? (
          <>
            {kop(t.alBetaaldTitel, t.alBetaaldTekst)}
            <Knop href="/mijn-advies" pijl={false}>
              Mijn advies
            </Knop>
          </>
        ) : (
          <>
            {kop(t.ongeldigTitel, t.ongeldigTekst)}
            <Knop href="/bestellen" pijl={false}>
              {t.opnieuwKnop}
            </Knop>
          </>
        )}
      </KlantKaart>
    </KlantPagina>
  );
}
