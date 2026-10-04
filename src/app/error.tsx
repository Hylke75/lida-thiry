"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
      <section className="bg-accent-zacht/60">
        <div
          aria-busy={teksten === null}
          className={`mx-auto flex w-full max-w-3xl flex-col items-center gap-5 px-6 py-16 text-center transition-opacity duration-300 sm:py-24 ${
            teksten === null ? "opacity-0" : "opacity-100"
          }`}
        >
          <h1 className="text-balance text-4xl leading-tight font-semibold tracking-tight sm:text-5xl">{t.foutTitel}</h1>
          <p className="max-w-xl text-balance text-lg text-foreground/70">{t.foutTekst}</p>
          <div className="flex flex-col items-center gap-3 sm:flex-row">
            <button
              type="button"
              onClick={() => retry()}
              className="rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t.opnieuwKnop}
            </button>
            <Link
              href="/"
              className="rounded-full px-5 py-3 text-sm font-medium text-accent underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
            >
              {t.homeKnop}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
