import type { Metadata } from "next";
import { leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { CADEAUBON_PAGINA } from "@/lib/inhoud/groepen/cadeaubon";
import { vulIn } from "@/lib/inhoud/schema";
import { formatteerBedrag } from "@/lib/prijs";
import { datumInNederland, plusDagen, MAX_VOORUIT_DAGEN, maxBedragCent, vasteBedragenOnder } from "@/lib/cadeaubon/regels";
import { Opmaak } from "@/components/Opmaak";
import { KlantKaart, KlantKop, KlantMelding, KlantPagina } from "@/components/site/KlantPagina";
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
    <KlantPagina>
      <KlantKop bovenschrift="Cadeaubon" titel={t.titel} terug={{ href: "/", tekst: "← Terug" }}>
        <Opmaak tekst={t.intro} />
      </KlantKop>

      {prijsCent ? (
        <KlantKaart>
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
        </KlantKaart>
      ) : (
        <KlantMelding soort="letop">{t.geenBetaling}</KlantMelding>
      )}
    </KlantPagina>
  );
}
