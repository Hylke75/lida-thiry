// Onthulling van het figuurtype na de test (en bij het opnieuw openen van de
// testlink). Zonder hooks, dus bruikbaar vanuit zowel de wizard als de pagina.
// Het silhouet groeit zacht op in een organisch kleurvlak (alleen zonder
// prefers-reduced-motion; zie .onthul-* in globals.css).

import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { TEST_UITSLAG } from "@/lib/inhoud/groepen/test";
import { SilhouetVlak } from "@/components/figuur/SilhouetVlak";
import { Bovenschrift, knopKlassen, Pijl, TekstLink } from "@/components/site/Basis";
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
  teksten: Pick<SectieWaarden<typeof TEST_UITSLAG>, "silhouet_label" | "download_knop" | "download_uitleg" | "figuurtype_link" | "start_link">;
}) {
  const figuurtypeHref = `/test/${encodeURIComponent(token)}/figuurtype`;
  return (
    <main className="flex flex-1 flex-col justify-center bg-paper py-14 tablet:py-[84px]">
      <div className={`${klantKolom("midden")} flex flex-col gap-10`}>
        <div className="onthul-tekst text-center">
          <Bovenschrift>{kop}</Bovenschrift>
          <h1 className={KLANT_H1}>{titel ?? `Type ${sleutel}`}</h1>
          <p className={`${KLANT_INTRO} m-0 mx-auto max-w-[560px]`}>{intro}</p>
        </div>

        <section
          aria-label={teksten.silhouet_label}
          className="relative overflow-hidden rounded-[8px] border border-line bg-white"
        >
          <div className="grid items-center gap-8 p-6 tablet:grid-cols-[250px_1fr] tablet:gap-10 tablet:p-[38px]">
            {silhouet && (
              <div className="relative mx-auto">
                <SilhouetVlak
                  silhouet={silhouet}
                  titel={`Silhouet: ${silhouet.naam}`}
                  kleur="coral"
                  onthul
                  className="h-[290px] w-[230px]"
                  figuurKlasse="h-60"
                />
              </div>
            )}
            <div className="onthul-tekst flex flex-col gap-3 text-center tablet:text-left">
              {silhouet && (
                <>
                  <p className="m-0 text-[12px] font-extrabold tracking-[0.13em] text-berry uppercase">{teksten.silhouet_label}</p>
                  <h2 className={`${H3} m-0 text-[34px]`}>{silhouet.naam}</h2>
                  {silhouet.alias && <p className="m-0 -mt-1 text-[16px] text-ink-soft">ook wel {silhouet.alias}</p>}
                  <p className="m-0 text-[17px] text-ink-soft">{silhouet.uitleg}</p>
                  {silhouet.kenmerken.length > 0 && <KlantVinklijst punten={silhouet.kenmerken} className="mt-2 text-left" />}
                </>
              )}
              <p className="m-0 mt-1 text-[15px] text-ink-soft">Typecode {sleutel}</p>
              {silhouet && teksten.figuurtype_link.trim() && (
                <a
                  href={figuurtypeHref}
                  className="mx-auto inline-flex min-h-11 items-center gap-1.5 font-bold text-berry underline decoration-1 underline-offset-[5px] hover:text-ink tablet:mx-0"
                >
                  {teksten.figuurtype_link} <Pijl />
                </a>
              )}
            </div>
          </div>
        </section>

        <div className="flex flex-col items-center gap-3 text-center">
          <a href={`/api/test/${encodeURIComponent(token)}/pdf`} className={`${knopKlassen()} w-full tablet:w-auto`}>
            {teksten.download_knop}
          </a>
          <p className="m-0 max-w-[420px] text-[16px] whitespace-pre-line text-ink-soft">{teksten.download_uitleg}</p>
          <TekstLink href="/" className="mt-1 text-[16px] text-ink-soft">
            {teksten.start_link}
          </TekstLink>
        </div>
      </div>
    </main>
  );
}
