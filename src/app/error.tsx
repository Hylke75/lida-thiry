"use client";

import { useEffect, useState } from "react";
import { KleurLint, Knop, knopKlassen, KopTekst } from "@/components/site/Basis";
import { H1_INHOUD, INTRO, KOP_ACHTERGROND } from "@/components/site/InhoudKop";
import { CONTAINER } from "@/components/site/stijl";
import { meldBrowserFout } from "@/lib/fouten/browser";
import { WEBSITE_FOUT } from "@/lib/inhoud/groepen/website";
import { standaardWaarden } from "@/lib/inhoud/schema";
import { haalFoutTeksten, type FoutTeksten } from "@/lib/website/fout-teksten";

/** Zo lang wachten we op de eigen teksten; daarna tonen we de standaardtekst. */
const WACHTTIJD_MS = 1500;

/**
 * Vriendelijke foutpagina voor onverwachte fouten op de publieke site. Toont
 * bewust geen technische details (die staan in de serverlogs, te vinden via de
 * digest). Teksten uit Beheer → Teksten → Website → Foutpagina's.
 */
export default function Fout({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [teksten, setTeksten] = useState<FoutTeksten | null>(null);

  useEffect(() => {
    console.error(error);
    // Serverfouten (met digest) staan al in de foutlog via instrumentation.ts.
    if (!error.digest) meldBrowserFout(error, { soort: "foutpagina" });
  }, [error]);

  useEffect(() => {
    let klaar = false;
    const standaard = () => {
      if (!klaar) setTeksten(standaardWaarden(WEBSITE_FOUT));
      klaar = true;
    };
    const timer = setTimeout(standaard, WACHTTIJD_MS);
    haalFoutTeksten().then(
      (t) => {
        if (!klaar) setTeksten(t);
        klaar = true;
      },
      standaard,
    );
    return () => {
      klaar = true;
      clearTimeout(timer);
    };
  }, []);

  const t = teksten ?? standaardWaarden(WEBSITE_FOUT);

  return (
    <main className="flex w-full flex-1 flex-col">
      <section className={`${KOP_ACHTERGROND} flex flex-1 flex-col`}>
        <div
          aria-busy={teksten === null}
          className={`${CONTAINER} flex max-w-[860px] flex-1 flex-col items-center justify-center gap-5 py-[68px] text-center transition-opacity duration-300 tablet:py-[110px] ${
            teksten === null ? "opacity-0" : "opacity-100"
          }`}
        >
          <h1 className={H1_INHOUD}>
            <KopTekst tekst={t.foutTitel} />
          </h1>
          <p className={`${INTRO} mx-auto`}>{t.foutTekst}</p>
          <div className="mt-3 flex flex-col items-center gap-3 tablet:flex-row tablet:gap-4">
            <button type="button" onClick={() => retry()} className={`${knopKlassen()} cursor-pointer`}>
              {t.opnieuwKnop}
            </button>
            <Knop href="/" variant="outline" pijl={false}>
              {t.homeKnop}
            </Knop>
          </div>
        </div>
        <KleurLint />
      </section>
    </main>
  );
}
