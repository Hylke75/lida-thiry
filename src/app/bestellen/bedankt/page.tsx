import Link from "next/link";
import { adminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export default async function BedanktPage({
  searchParams,
}: {
  searchParams: Promise<{ order?: string }>;
}) {
  const { order: orderId } = await searchParams;

  let status: string | null = null;
  if (orderId) {
    try {
      const { data } = await adminClient()
        .from("orders")
        .select("status")
        .eq("id", orderId)
        .single();
      status = data?.status ?? null;
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
            Je betaling is ontvangen. We hebben je een e-mail gestuurd met de link
            om de test te starten. Geen mail ontvangen? Kijk in je spam-map.
          </p>
        </>
      ) : (
        <>
          <h1 className="text-2xl font-semibold tracking-tight">We verwerken je betaling</h1>
          <p className="text-black/60 dark:text-white/60">
            Zodra de betaling is bevestigd, ontvang je per e-mail de link om de test
            te starten. Dit kan een moment duren.
          </p>
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
