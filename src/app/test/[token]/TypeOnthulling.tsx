// Onthulling van het figuurtype na de test (en bij het opnieuw openen van de
// testlink). Zonder hooks, dus bruikbaar vanuit zowel de wizard als de pagina.

import Link from "next/link";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { TEST_UITSLAG } from "@/lib/inhoud/groepen/test";
import { Lichaam } from "./Lichaam";

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
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-8 px-4 py-10 sm:px-8">
      <div className="text-center">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-accent">{kop}</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
          {titel ?? `Type ${sleutel}`}
        </h1>
        <p className="mx-auto mt-3 max-w-md text-sm text-foreground/60">{intro}</p>
      </div>

      <section className="grid items-center gap-6 rounded-3xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/10 sm:grid-cols-[180px_1fr] sm:p-8">
        {silhouet && (
          <div className="mx-auto rounded-2xl bg-accent-zacht px-6 py-4 text-accent">
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
        <div className="flex flex-col gap-3 text-center sm:text-left">
          {silhouet && (
            <>
              <p className="text-xs font-medium uppercase tracking-widest text-foreground/50">
                {teksten.silhouet_label}
              </p>
              <h2 className="text-2xl font-semibold">{silhouet.naam}</h2>
              {silhouet.alias && <p className="-mt-2 text-sm text-foreground/55">ook wel {silhouet.alias}</p>}
              <p className="leading-relaxed text-foreground/75">{silhouet.uitleg}</p>
              {silhouet.kenmerken.length > 0 && (
                <ul className="flex flex-col gap-1 text-left text-sm text-foreground/75">
                  {silhouet.kenmerken.map((k) => (
                    <li key={k} className="flex gap-2">
                      <span className="text-accent">•</span>
                      {k}
                    </li>
                  ))}
                </ul>
              )}
            </>
          )}
          <p className="text-xs text-foreground/50">Typecode {sleutel}</p>
        </div>
      </section>

      <div className="flex flex-col items-center gap-3 text-center">
        <a
          href={`/api/test/${token}/pdf`}
          className="rounded-full bg-accent px-8 py-4 text-base font-medium text-background shadow-sm transition-opacity hover:opacity-90"
        >
          {teksten.download_knop}
        </a>
        <p className="max-w-sm whitespace-pre-line text-sm text-foreground/60">{teksten.download_uitleg}</p>
        <Link
          href="/"
          className="mt-2 text-sm text-foreground/50 underline underline-offset-4 hover:text-foreground/80"
        >
          ← Naar de startpagina
        </Link>
      </div>
    </main>
  );
}
