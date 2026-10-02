import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";
import { AutoVernieuwen } from "./AutoVernieuwen";

export const dynamic = "force-dynamic";

export default async function BedanktPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let status: string | null = null;
  let token: string | null = null;
  if (orderId) {
    try {
      const { data } = await adminClient()
        .from("orders")
        .select("status, testtoken")
        .eq("id", orderId)
        .single();
      status = data?.status ?? null;
      token = data?.testtoken ?? null;
    } catch {
      status = null;
    }
  }

  const betaald = status === "betaald" || status === "test_afgerond" || status === "advies_verzonden";

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-6 p-8 text-center">
      {betaald ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Bedankt voor je bestelling!</h1>
          <p className="text-black/60 dark:text-white/60">
            Je betaling is ontvangen. Je kunt de test meteen starten. We hebben je
            de link ook gemaild, zodat je later verder kunt gaan.
          </p>
          {token && (
            <Link
              href={`/test/${token}`}
              className="mx-auto rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
            >
              Start de test →
            </Link>
          )}
        </>
      ) : status === "betaling_mislukt" || status === "verlopen" ? (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">Betaling niet gelukt</h1>
          <p className="text-black/60 dark:text-white/60">
            Je betaling is niet afgerond; er is niets afgeschreven. Probeer het gerust opnieuw.
          </p>
          <Link
            href="/bestellen"
            className="mx-auto rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
          >
            Opnieuw proberen
          </Link>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">We verwerken je betaling</h1>
          <p className="text-black/60 dark:text-white/60">
            Zodra de betaling is bevestigd, verschijnt hier de knop om de test te
            starten. Dit duurt meestal maar een paar seconden.
          </p>
          {status === "aangemaakt" && <AutoVernieuwen />}
        </>
      )}
      <Link
        href="/"
        className="mx-auto text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50"
      >
        ← Terug naar de startpagina
      </Link>
    </main>
  );
}
