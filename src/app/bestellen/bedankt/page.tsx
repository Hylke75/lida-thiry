import type { Metadata } from "next";
import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { leesSectie } from "@/lib/inhoud/lees";
import { BESTELLEN_BETAALD, BESTELLEN_MISLUKT, BESTELLEN_VERWERKEN } from "@/lib/inhoud/groepen/bestellen";
import { MIJN_ADVIES_PAGINA } from "@/lib/inhoud/groepen/mijn-advies";
import { UUID_PATROON } from "@/lib/nieuwsbrief/links";
import { isBetaald, testlinkNogTonen } from "@/lib/order-status";
import { AutoVernieuwen } from "./AutoVernieuwen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bedankt voor je bestelling",
  robots: { index: false, follow: false },
};

export default async function BedanktPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let status: string | null = null;
  let token: string | null = null;
  if (orderId && UUID_PATROON.test(orderId)) {
    try {
      const { data } = await adminClient()
        .from("orders")
        .select("status, testtoken, betaald_op")
        .eq("id", orderId)
        .maybeSingle();
      status = data?.status ?? null;
      // De testlink alleen kort na betalen tonen: de bedankpagina-URL (met
      // order-id) kan in de browsergeschiedenis blijven staan. Daarna staat hij in de mail.
      token = testlinkNogTonen(data?.betaald_op ?? null) ? (data?.testtoken ?? null) : null;
    } catch {
      status = null;
    }
  }

  const betaald = isBetaald(status);
  const mislukt = status === "betaling_mislukt" || status === "verlopen";
  const [tBetaald, tMislukt, tVerwerken, tMijnAdvies] = await Promise.all([
    leesSectie(BESTELLEN_BETAALD),
    leesSectie(BESTELLEN_MISLUKT),
    leesSectie(BESTELLEN_VERWERKEN),
    leesSectie(MIJN_ADVIES_PAGINA),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center px-6 py-12 text-center">
      <div className="flex flex-col gap-6 rounded-2xl bg-kaart p-8 shadow-sm ring-1 ring-foreground/5">
      {betaald ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">{tBetaald.titel}</h1>
          <p className="whitespace-pre-line text-foreground/70">{tBetaald.tekst}</p>
          {token ? (
            <Link
              href={`/test/${token}`}
              className="mx-auto rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
            >
              {tBetaald.knop}
            </Link>
          ) : (
            <p className="text-sm text-foreground/70">
              Je persoonlijke link naar de test staat in de bevestigingsmail. Kijk ook even in je spammap.
            </p>
          )}
          {tMijnAdvies.verwijzing.trim() && (
            <Link href="/mijn-advies" className="mx-auto text-sm text-foreground/60 underline underline-offset-4 hover:text-accent">
              {tMijnAdvies.verwijzing}
            </Link>
          )}
        </>
      ) : mislukt ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">{tMislukt.titel}</h1>
          <p className="whitespace-pre-line text-foreground/70">{tMislukt.tekst}</p>
          <Link
            href="/bestellen"
            className="mx-auto rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90"
          >
            {tMislukt.knop}
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">{tVerwerken.titel}</h1>
          <p className="whitespace-pre-line text-foreground/70">{tVerwerken.tekst}</p>
          {status === "aangemaakt" && <AutoVernieuwen />}
        </>
      )}
      <Link
        href="/"
        className="mx-auto text-sm text-foreground/50 underline underline-offset-4 hover:text-accent"
      >
        ← Terug naar de startpagina
      </Link>
      </div>
    </main>
  );
}
