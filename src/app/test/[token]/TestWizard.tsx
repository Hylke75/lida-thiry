"use client";

import { ontleedTypeSleutel, type Silhouet } from "@/lib/lichaamstype-regels";
import { TypeOnthulling } from "./TypeOnthulling";
import { vulIn } from "@/lib/inhoud/schema";
import type { TestTeksten } from "@/lib/inhoud/groepen/test";
import { useTestWizard } from "./useTestWizard";
import { EERSTE_MATEN_STAP } from "./wizard-regels";
import { Voortgang } from "./Voortgang";
import { StapOverJou } from "./stappen/StapOverJou";
import { StapMaten } from "./stappen/StapMaten";
import { StapSilhouet } from "./stappen/StapSilhouet";
import { StapVragen } from "./stappen/StapVragen";
import { StapAfronden } from "./stappen/StapAfronden";
import { Bovenschrift, knopKlassen } from "@/components/site/Basis";
import { KLANT_H1, klantKolom, klantMeldingKlassen } from "@/components/site/KlantPagina";

export function TestWizard({
  token,
  klantnaam,
  meetBeelden = {},
  silhouetten,
  teksten,
}: {
  token: string;
  klantnaam: string;
  /** De kiesbare lichaamstypes (uit beheer). */
  silhouetten: Silhouet[];
  /** Door de adviseur geüploade meetfoto's per maat (publieke URL); anders de tekening. */
  meetBeelden?: Record<string, string>;
  /** Beheerbare teksten (Beheer → Teksten → Test), op de server gelezen. */
  teksten: TestTeksten;
}) {
  const {
    stappen: STAPPEN,
    maatVelden,
    vragen,
    a,
    setA,
    stap,
    toonFouten,
    bezig,
    fout,
    melding,
    bevindingen,
    resultaat,
    kop,
    gaNaar,
    volgende,
    bereikbaar,
    verstuur,
  } = useTestWizard({ token, silhouetten, teksten });

  if (resultaat) {
    return (
      <TypeOnthulling
        token={token}
        sleutel={resultaat.sleutel}
        titel={resultaat.titel}
        silhouet={silhouetten.find((s) => s.letter === ontleedTypeSleutel(resultaat.sleutel)?.code)}
        kop={vulIn(teksten.uitslag.kop, { naam: klantnaam })}
        intro={teksten.uitslag.intro}
        teksten={teksten.uitslag}
      />
    );
  }

  const huidig = STAPPEN[stap];

  return (
    <main className="flex flex-1 flex-col bg-paper py-10 tablet:py-14">
      <div className={`${klantKolom("midden")} flex flex-col gap-8`}>
      <div ref={kop} className="scroll-mt-4">
        <p className="m-0 text-[15px] font-bold text-ink-soft">
          {vulIn(teksten.algemeen.welkom, { naam: klantnaam })}
        </p>
        <Voortgang stappen={STAPPEN} stap={stap} bereikbaar={bereikbaar} gaNaar={gaNaar} />
      </div>

      <form
        className="flex flex-col gap-7"
        onSubmit={(e) => {
          e.preventDefault();
          if (huidig.soort === "controle") verstuur();
          else volgende();
        }}
      >
        <div>
          <Bovenschrift>{vulIn(teksten.algemeen.stap_van, { nummer: stap + 1, totaal: STAPPEN.length })}</Bovenschrift>
          <h1 className={`${KLANT_H1} mb-0!`}>{huidig.titel}</h1>
        </div>

        {melding && (
          <p className={`${klantMeldingKlassen("letop")} m-0`}>
            {melding}
          </p>
        )}
        {bevindingen.length > 0 && (
          <ul className="m-0 flex list-none flex-col gap-2 p-0">
            {bevindingen.map((b, i) => (
              <li
                key={i}
                className={klantMeldingKlassen("fout")}
              >
                {b.bericht}
              </li>
            ))}
          </ul>
        )}

        {huidig.soort === "jij" && (
          <StapOverJou a={a} setA={setA} toonFouten={toonFouten} teksten={teksten.overJou} />
        )}

        {huidig.soort === "maten" && (
          <StapMaten
            velden={huidig.velden}
            a={a}
            setA={setA}
            toonFouten={toonFouten}
            meetBeelden={meetBeelden}
            tip={stap === EERSTE_MATEN_STAP ? teksten.meten.tip : null}
            teksten={teksten.meten}
          />
        )}

        {huidig.soort === "silhouet" && (
          <StapSilhouet a={a} setA={setA} silhouetten={silhouetten} intro={teksten.silhouet.intro} />
        )}

        {huidig.soort === "vragen" && <StapVragen vragen={huidig.vragen} a={a} setA={setA} />}

        {huidig.soort === "controle" && (
          <StapAfronden
            a={a}
            gaNaar={gaNaar}
            silhouetten={silhouetten}
            stappen={STAPPEN}
            maatVelden={maatVelden}
            vragen={vragen}
            intro={teksten.afronden.intro}
          />
        )}

        {fout && (
          <p role="alert" className={`${klantMeldingKlassen("fout")} m-0`}>
            {fout}
          </p>
        )}

        <div className="flex flex-col-reverse items-stretch gap-3 border-t border-line pt-6 tablet:flex-row tablet:items-center tablet:justify-between">
          <button
            type="button"
            onClick={() => gaNaar(stap - 1)}
            disabled={stap === 0 || bezig}
            className={`${knopKlassen({ variant: "outline" })} disabled:invisible max-tablet:disabled:hidden`}
          >
            {teksten.algemeen.terug_knop}
          </button>
          <button
            type="submit"
            disabled={bezig}
            className={knopKlassen()}
          >
            {huidig.soort === "controle"
              ? bezig
                ? teksten.afronden.bezig
                : teksten.afronden.knop
              : vulIn(teksten.algemeen.volgende_knop, { stap: STAPPEN[stap + 1].titel })}
          </button>
        </div>
      </form>
      </div>
    </main>
  );
}
