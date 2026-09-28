import Link from "next/link";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { BestelFormulier } from "./BestelFormulier";

export const dynamic = "force-dynamic";

export default async function BestellenPage() {
  let prijsLabel: string | null = null;
  let prijsBekend = false;
  try {
    const cent = await leesPrijsCent();
    const valuta = (await leesInstelling("valuta")) || "EUR";
    if (cent) {
      prijsBekend = true;
      prijsLabel = new Intl.NumberFormat("nl-NL", {
        style: "currency",
        currency: valuta,
      }).format(cent / 100);
    }
  } catch {
    prijsBekend = false;
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-8">
      <div>
        <Link
          href="/"
          className="text-sm text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50"
        >
          ← Terug
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Bestellen</h1>
        {prijsLabel && (
          <p className="mt-1 text-black/60 dark:text-white/60">
            Kledingadviestest — <strong>{prijsLabel}</strong>
          </p>
        )}
      </div>

      {prijsBekend ? (
        <BestelFormulier />
      ) : (
        <p className="rounded-lg border border-black/10 px-4 py-3 text-sm text-black/60 dark:border-white/15 dark:text-white/60">
          De prijs is nog niet ingesteld, dus bestellen is nu niet mogelijk. Kom
          binnenkort terug.
        </p>
      )}
    </main>
  );
}
