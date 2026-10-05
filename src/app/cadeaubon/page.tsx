import type { Metadata } from "next";
import Link from "next/link";
import { leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { CADEAUBON_PAGINA } from "@/lib/inhoud/groepen/cadeaubon";
import { vulIn } from "@/lib/inhoud/schema";
import { formatteerBedrag } from "@/lib/prijs";
import { datumInNederland, plusDagen, MAX_VOORUIT_DAGEN, maxBedragCent, vasteBedragenOnder } from "@/lib/cadeaubon/regels";
import { Opmaak } from "@/components/Opmaak";
import { CadeaubonFormulier } from "./CadeaubonFormulier";

// Per request: de kalender (vroegste en laatste verzenddatum) hangt af van de
// datum van vandaag. De gegevens zelf (teksten, prijs) komen wel uit de datacache.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Cadeaubon",
  description:
    "Geef de online kledingadviestest van Lida Thiry cadeau. Kies een bedrag en laat de cadeaubon direct of op een datum naar keuze mailen.",
  alternates: { canonical: "/cadeaubon" },
};

export default async function CadeaubonPage() {
  const t = await leesSectie(CADEAUBON_PAGINA);
  let prijsCent: number | null = null;
  let valuta = "EUR";
  try {
    ({ prijsCent, valuta } = await leesPubliekePrijs());
  } catch {
    prijsCent = null;
  }
  const vandaag = datumInNederland(new Date());
  const opties = [
    // Een bon is hooguit de prijs van de test: alleen vaste bedragen daaronder.
    ...(prijsCent ? vasteBedragenOnder(prijsCent) : []).map((c) => ({ waarde: String(c), label: formatteerBedrag(c, valuta) })),
    ...(prijsCent ? [{ waarde: "prijs", label: vulIn(t.prijsKeuze, { prijs: formatteerBedrag(prijsCent, valuta) }) }] : []),
    { waarde: "anders", label: "Ander bedrag" },
  ];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 px-6 py-12">
      <div>
        <Link href="/" className="text-sm text-foreground/70 underline underline-offset-4 hover:text-accent">
          ← Terug
        </Link>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">{t.titel}</h1>
        <div className="mt-3 flex flex-col gap-3 text-foreground/70 [&_a]:text-accent [&_a]:underline">
          <Opmaak tekst={t.intro} />
        </div>
      </div>

      {prijsCent ? (
        <div className="rounded-2xl bg-kaart p-6 shadow-sm ring-1 ring-foreground/5 sm:p-8">
          <CadeaubonFormulier
            opties={opties}
            standaard="prijs"
            maxCent={maxBedragCent(prijsCent)}
            maxLabel={formatteerBedrag(maxBedragCent(prijsCent), valuta)}
            minDatum={plusDagen(vandaag, 1)}
            maxDatum={plusDagen(vandaag, MAX_VOORUIT_DAGEN)}
            teksten={{
              bedragUitleg: t.bedragUitleg,
              akkoordVoorwaarden: t.akkoordVoorwaarden,
              knop: t.knop,
              knopBezig: t.knopBezig,
              foutAlgemeen: t.foutAlgemeen,
              foutVerbinding: t.foutVerbinding,
            }}
          />
        </div>
      ) : (
        <p className="rounded-lg border border-accent/20 bg-accent-zacht px-4 py-3 text-sm whitespace-pre-line text-foreground/70">
          {t.geenBetaling}
        </p>
      )}
    </main>
  );
}
