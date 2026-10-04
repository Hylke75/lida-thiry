import type { Metadata } from "next";
import Link from "next/link";
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

  const knop =
    "mx-auto rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90";
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12 text-center">
      <div className="flex flex-col gap-6 rounded-2xl bg-kaart p-8 shadow-sm ring-1 ring-foreground/5">
        {oordeel.soort === "open" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.titel}</h1>
            <p className="whitespace-pre-line text-foreground/70">
              {vulIn(t.tekst, {
                naam: oordeel.order.klantnaam,
                bedrag: formatteerBedrag(oordeel.order.bedrag_cent, oordeel.order.valuta || "EUR"),
              })}
            </p>
            {fout && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {formulier.foutVerbinding}
              </p>
            )}
            <form method="post" action="/api/bestellen/hervat">
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="t" value={token} />
              <button className={knop}>{t.knop}</button>
            </form>
          </>
        ) : oordeel.soort === "betaald" ? (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.alBetaaldTitel}</h1>
            <p className="whitespace-pre-line text-foreground/70">{t.alBetaaldTekst}</p>
            <Link href="/mijn-advies" className={knop}>
              Mijn advies
            </Link>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-semibold tracking-tight">{t.ongeldigTitel}</h1>
            <p className="whitespace-pre-line text-foreground/70">{t.ongeldigTekst}</p>
            <Link href="/bestellen" className={knop}>
              {t.opnieuwKnop}
            </Link>
          </>
        )}
      </div>
    </main>
  );
}
