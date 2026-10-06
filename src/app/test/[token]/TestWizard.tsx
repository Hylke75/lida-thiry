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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <div ref={kop} className="scroll-mt-4">
        <p className="text-sm text-black/50 dark:text-white/50">
          {vulIn(teksten.algemeen.welkom, { naam: klantnaam })}
        </p>
        <Voortgang stappen={STAPPEN} stap={stap} bereikbaar={bereikbaar} gaNaar={gaNaar} />
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (huidig.soort === "controle") verstuur();
          else volgende();
        }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/40 dark:text-white/40">
            Stap {stap + 1} van {STAPPEN.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{huidig.titel}</h1>
        </div>

        {melding && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {melding}
          </p>
        )}
        {bevindingen.length > 0 && (
          <ul className="flex flex-col gap-2">
            {bevindingen.map((b, i) => (
              <li
                key={i}
                className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
              >
                {b.bericht}
              </li>
            ))}
          </ul>
        )}

        {huidig.soort === "jij" && (
          <StapOverJou a={a} setA={setA} toonFouten={toonFouten} intro={teksten.overJou.intro} />
        )}

        {huidig.soort === "maten" && (
          <StapMaten
            velden={huidig.velden}
            a={a}
            setA={setA}
            toonFouten={toonFouten}
            meetBeelden={meetBeelden}
            tip={stap === EERSTE_MATEN_STAP ? teksten.meten.tip : null}
            tweeKeerHint={teksten.meten.twee_keer}
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
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {fout}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-5 dark:border-white/10">
          <button
            type="button"
            onClick={() => gaNaar(stap - 1)}
            disabled={stap === 0 || bezig}
            className="rounded-full border border-black/15 px-5 py-3 text-sm disabled:invisible dark:border-white/20"
          >
            ← Terug
          </button>
          <button
            type="submit"
            disabled={bezig}
            className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {huidig.soort === "controle"
              ? bezig
                ? teksten.afronden.bezig
                : teksten.afronden.knop
              : `Volgende: ${STAPPEN[stap + 1].titel} →`}
          </button>
        </div>
      </form>
    </main>
  );
}
