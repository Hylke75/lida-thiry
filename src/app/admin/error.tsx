"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { meldBrowserFout } from "@/lib/fouten/browser";
import { knop, knopSecundair } from "@/components/admin/stijl";

/**
 * Foutpagina in het beheer. Toont de foutcode (digest) waarmee de fout in de
 * serverlogs (Vercel → Logs) terug te vinden is. De melding zelf is in productie
 * bewust algemeen (Next.js verbergt details van serverfouten).
 */
export default function BeheerFout({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  const [gekopieerd, setGekopieerd] = useState(false);

  useEffect(() => {
    console.error(error);
    // Serverfouten (met digest) staan al in de foutlog via instrumentation.ts.
    if (!error.digest) meldBrowserFout(error, { soort: "foutpagina" });
  }, [error]);

  const kopieer = async () => {
    if (!error.digest) return;
    try {
      await navigator.clipboard.writeText(error.digest);
      setGekopieerd(true);
    } catch {
      setGekopieerd(false);
    }
  };

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 p-6 sm:p-8">
      <div className="flex items-center justify-between gap-4 border-b border-black/10 pb-4 dark:border-white/15">
        <Link href="/admin" className="font-serif text-xl tracking-tight">
          Beheer
        </Link>
      </div>
      <div role="alert" className="flex flex-col gap-4 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-900 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-200">
        <h1 className="text-xl font-semibold">Er ging iets mis op deze beheerpagina</h1>
        <p className="text-sm leading-relaxed">
          Probeer het opnieuw. Blijft dit gebeuren, geef dan de foutcode hieronder door aan wie de website onderhoudt:
          daarmee is de fout in de serverlogs terug te vinden.
        </p>
        {error.message && process.env.NODE_ENV !== "production" && (
          <p className="rounded-lg bg-white/60 px-3 py-2 font-mono text-xs break-words dark:bg-black/30">{error.message}</p>
        )}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span>Foutcode:</span>
          {error.digest ? (
            <>
              <code className="rounded bg-white/70 px-2 py-1 font-mono text-xs select-all dark:bg-black/30">{error.digest}</code>
              <button type="button" onClick={kopieer} className="text-xs underline underline-offset-4">
                {gekopieerd ? "Gekopieerd" : "Kopiëren"}
              </button>
            </>
          ) : (
            <span className="text-red-900/70 dark:text-red-200/70">niet beschikbaar (fout in de browser; zie de console)</span>
          )}
        </div>
        {/* De tijd helpt bij het zoeken in de logs. */}
        <p className="text-xs text-red-900/70 dark:text-red-200/70" suppressHydrationWarning>
          Tijdstip: {new Date().toLocaleString("nl-NL")}
        </p>
      </div>
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => retry()}
          className={knop}
        >
          Opnieuw proberen
        </button>
        <Link
          href="/admin"
          className={knopSecundair}
        >
          Naar het overzicht
        </Link>
      </div>
    </main>
  );
}
