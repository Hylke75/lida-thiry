// Onthulling van het figuurtype na de test (en bij het opnieuw openen van de
// testlink). Zonder hooks, dus bruikbaar vanuit zowel de wizard als de pagina.

import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { TEST_UITSLAG } from "@/lib/inhoud/groepen/test";
import { Lichaam } from "@/components/Lichaam";
import { Bovenschrift, knopKlassen, TekstLink } from "@/components/site/Basis";
import { KLANT_H1, KLANT_INTRO, KlantVinklijst, klantKolom } from "@/components/site/KlantPagina";
import { H3 } from "@/components/site/stijl";

export function TypeOnthulling({
  token,
  sleutel,
  titel,
  kop,
  intro,
  silhouet,
  teksten,
}: {
  token: string;
  sleutel: string;
  /** Het lichaamstype bij deze sleutel (uit beheer). */
  silhouet?: Silhouet;
  /** Titel uit adviestypes; valt terug op "Type {sleutel}". */
  titel: string | null;
  kop: string;
  intro: string;
  /** Beheerbare teksten van het uitslagscherm. */
  teksten: Pick<SectieWaarden<typeof TEST_UITSLAG>, "silhouet_label" | "download_knop" | "download_uitleg">;
}) {
  return (
    <main className="flex flex-1 flex-col justify-center bg-paper py-14 tablet:py-[84px]">
      <div className={`${klantKolom("midden")} flex flex-col gap-10`}>
      <div className="text-center">
        <Bovenschrift>{kop}</Bovenschrift>
        <h1 className={KLANT_H1}>
          {titel ?? `Type ${sleutel}`}
        </h1>
        <p className={`${KLANT_INTRO} mx-auto m-0 max-w-[560px]`}>{intro}</p>
      </div>

      <section className="grid items-center gap-8 rounded-ontwerp-md border border-line bg-[#fff1ed] p-6 tablet:grid-cols-[220px_1fr] tablet:p-[34px]">
        {silhouet && (
          <div className="mx-auto rounded-[46%_54%_46%_54%/52%_42%_58%_48%] bg-coral-soft px-8 py-6 text-berry">
            {silhouet.beeldUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- tijdelijke (signed) URL uit de beeldbank
              <img src={silhouet.beeldUrl} alt={`Silhouet: ${silhouet.naam}`} className="h-56 w-auto object-contain" />
            ) : (
              <Lichaam
                vorm={silhouet.vorm}
                armen={false}
                titel={`Silhouet: ${silhouet.naam}`}
                className="h-56"
              />
            )}
          </div>
        )}
        <div className="flex flex-col gap-3 text-center tablet:text-left">
          {silhouet && (
            <>
              <p className="m-0 text-[13px] font-extrabold tracking-[0.1em] text-ink uppercase">
                {teksten.silhouet_label}
              </p>
              <h2 className={`${H3} m-0 text-[30px]`}>{silhouet.naam}</h2>
              {silhouet.alias && <p className="m-0 -mt-1 text-[14px] text-ink-soft">ook wel {silhouet.alias}</p>}
              <p className="m-0 text-ink-soft">{silhouet.uitleg}</p>
              {silhouet.kenmerken.length > 0 && <KlantVinklijst punten={silhouet.kenmerken} className="mt-2" />}
            </>
          )}
          <p className="m-0 mt-1 text-[13px] text-ink-soft">Typecode {sleutel}</p>
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 text-center">
        <a href={`/api/test/${token}/pdf`} className={`${knopKlassen()} w-full tablet:w-auto`}>
          {teksten.download_knop}
        </a>
        <p className="m-0 max-w-[420px] text-[14px] whitespace-pre-line text-ink-soft">{teksten.download_uitleg}</p>
        <TekstLink href="/" className="mt-1 text-[14px] text-ink-soft">
          ← Naar de startpagina
        </TekstLink>
      </div>
      </div>
    </main>
  );
}
