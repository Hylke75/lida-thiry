// Onthulling van het figuurtype na de test (en bij het opnieuw openen van de
// testlink). Zonder hooks, dus bruikbaar vanuit zowel de wizard als de pagina.

import Link from "next/link";
import { silhouetVoorSleutel } from "@/lib/test-config";
import { Lichaam } from "./Lichaam";

export function TypeOnthulling({
  token,
  sleutel,
  titel,
  kop,
  intro,
}: {
  token: string;
  sleutel: string;
  /** Titel uit adviestypes; valt terug op "Type {sleutel}". */
  titel: string | null;
  kop: string;
  intro: string;
}) {
  const silhouet = silhouetVoorSleutel(sleutel);

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
            <Lichaam
              vorm={silhouet.vorm}
              armen={false}
              titel={`Silhouet: ${silhouet.naam}`}
              className="h-56"
            />
          </div>
        )}
        <div className="flex flex-col gap-3 text-center sm:text-left">
          {silhouet && (
            <>
              <p className="text-xs font-medium uppercase tracking-widest text-foreground/50">
                Jouw silhouet
              </p>
              <h2 className="text-2xl font-semibold">{silhouet.naam}</h2>
              <p className="leading-relaxed text-foreground/75">{silhouet.uitleg}</p>
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
          Download je persoonlijke advies (PDF)
        </a>
        <p className="max-w-sm text-sm text-foreground/60">
          In je advies lees je precies welke kleding, vormen en stoffen jouw figuur het mooist laten
          uitkomen. We sturen het ook naar je e-mail.
        </p>
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
