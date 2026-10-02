import type { Metadata } from "next";
import Link from "next/link";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";
import { BestelFormulier } from "./BestelFormulier";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Bestellen",
  description:
    "Bestel de online kledingadviestest van Lida Thiry en ontvang direct je persoonlijke kledingadvies als PDF.",
  alternates: { canonical: "/bestellen" },
};

export default async function BestellenPage() {
  const gratisTest = Boolean(process.env.GRATIS_TEST);
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
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <Link
          href="/"
          className="text-sm text-foreground/50 underline underline-offset-4 hover:text-accent"
        >
          ← Terug
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">Bestellen</h1>
        {prijsLabel && (
          <p className="mt-2 text-foreground/70">
            Online kledingadviestest — <strong className="text-accent">{prijsLabel}</strong>{" "}
            <span className="text-sm text-foreground/50">(incl. btw)</span>
          </p>
        )}
      </div>

      {prijsBekend || gratisTest ? (
        <div className="rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
          <BestelFormulier prijsBekend={prijsBekend} gratisTest={gratisTest} />
        </div>
      ) : (
        <p className="rounded-lg border border-accent/20 bg-accent-zacht px-4 py-3 text-sm text-foreground/70">
          De prijs is nog niet ingesteld, dus bestellen is nu niet mogelijk. Kom
          binnenkort terug.
        </p>
      )}
    </main>
  );
}
