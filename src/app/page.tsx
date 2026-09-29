import Link from "next/link";
import { leesPrijsCent, leesInstelling } from "@/lib/instellingen";

export const dynamic = "force-dynamic";

function formatteerPrijs(cent: number, valuta: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(
    cent / 100,
  );
}

export default async function Home() {
  let prijsLabel: string | null = null;
  try {
    const cent = await leesPrijsCent();
    const valuta = (await leesInstelling("valuta")) || "EUR";
    if (cent) prijsLabel = formatteerPrijs(cent, valuta);
  } catch {
    prijsLabel = null;
  }

  return (
    <>
      <Link
        href="/admin/inloggen"
        className="fixed right-6 top-6 z-10 rounded-full bg-red-600 px-7 py-3 text-base font-semibold text-white shadow-sm transition-colors hover:bg-red-700"
      >
        Mama hier moet je op klikken!
      </Link>
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col justify-center gap-10 p-8">
      <header className="flex flex-col gap-4 text-center">
        <span className="mx-auto rounded-full border border-black/10 px-3 py-1 text-xs font-medium uppercase tracking-widest text-black/50 dark:border-white/15 dark:text-white/50">
          Lida Thiry · Imago &amp; Kledingadvies
        </span>
        <h1 className="text-4xl font-semibold tracking-tight sm:text-5xl">
          Ontdek je figuurtype en persoonlijk kledingadvies
        </h1>
        <p className="mx-auto max-w-xl text-balance text-black/60 dark:text-white/60">
          Doe de online zelftest op basis van je lengte, gewicht en lichaamsmaten.
          Je ontvangt direct een persoonlijke PDF met jouw type en bijpassend
          kledingadvies.
        </p>
      </header>

      <ol className="mx-auto grid w-full max-w-md gap-3 text-sm text-black/70 dark:text-white/70">
        <li className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
          1. Bestel en betaal veilig
        </li>
        <li className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
          2. Vul de test in (lengte, maten, beeldvragen)
        </li>
        <li className="rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
          3. Ontvang je persoonlijke advies-PDF per mail
        </li>
      </ol>

      <div className="flex flex-col items-center gap-3">
        <Link
          href="/bestellen"
          className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          {prijsLabel ? `Start de test — ${prijsLabel}` : "Start de test"}
        </Link>
        {!prijsLabel && (
          <p className="text-xs text-black/40 dark:text-white/40">
            De prijs wordt binnenkort bekendgemaakt.
          </p>
        )}
      </div>
    </main>
    </>
  );
}
