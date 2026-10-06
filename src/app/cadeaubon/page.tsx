import type { Metadata } from "next";
import { vastePaginaMetadataVoor } from "@/lib/website/lees";
import { leesInstellingen, leesPubliekePrijs } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { CADEAUBON_PAGINA } from "@/lib/inhoud/groepen/cadeaubon";
import { vulIn } from "@/lib/inhoud/schema";
import { formatteerBedrag } from "@/lib/prijs";
import {
  CADEAUBON_STANDAARD,
  datumInNederland,
  leesCadeaubonInstellingen,
  plusDagen,
  maxBedragCent,
  vasteBedragenOnder,
} from "@/lib/cadeaubon/regels";
import { Opmaak } from "@/components/Opmaak";
import { KlantKaart, KlantKop, KlantMelding, KlantPagina } from "@/components/site/KlantPagina";
import { CadeaubonFormulier } from "./CadeaubonFormulier";

// Per request: de kalender (vroegste en laatste verzenddatum) hangt af van de
// datum van vandaag. De gegevens zelf (teksten, prijs) komen wel uit de datacache.
export const dynamic = "force-dynamic";

/** Titel en omschrijving: Beheer → Website → SEO (standaard in lib/website/seo.ts). */
export function generateMetadata(): Promise<Metadata> {
  return vastePaginaMetadataVoor("cadeaubon");
}

export default async function CadeaubonPage() {
  const t = await leesSectie(CADEAUBON_PAGINA);
  let prijsCent: number | null = null;
  let valuta = "EUR";
  try {
    ({ prijsCent, valuta } = await leesPubliekePrijs());
  } catch {
    prijsCent = null;
  }
  // De cadeaubonregels (bedragen, planning) vers: de pagina is toch per request.
  const regels = await leesInstellingen()
    .then(leesCadeaubonInstellingen)
    .catch(() => CADEAUBON_STANDAARD);
  const vandaag = datumInNederland(new Date());
  const opties = [
    // Een bon is hooguit de prijs van de test: alleen vaste bedragen daaronder.
    ...(prijsCent ? vasteBedragenOnder(prijsCent, regels) : []).map((c) => ({ waarde: String(c), label: formatteerBedrag(c, valuta) })),
    ...(prijsCent ? [{ waarde: "prijs", label: vulIn(t.prijsKeuze, { prijs: formatteerBedrag(prijsCent, valuta) }) }] : []),
    { waarde: "anders", label: t.anderBedrag },
  ];

  return (
    <KlantPagina>
      <KlantKop bovenschrift={t.bovenschrift} titel={t.titel} terug={{ href: "/", tekst: t.terug }}>
        <Opmaak tekst={t.intro} />
      </KlantKop>

      {prijsCent ? (
        <KlantKaart>
          <CadeaubonFormulier
            opties={opties}
            standaard="prijs"
            maxCent={maxBedragCent(prijsCent, regels)}
            maxLabel={formatteerBedrag(maxBedragCent(prijsCent, regels), valuta)}
            minDatum={plusDagen(vandaag, 1)}
            maxDatum={plusDagen(vandaag, regels.maxVooruitDagen)}
            teksten={t}
          />
        </KlantKaart>
      ) : (
        <KlantMelding soort="letop">{t.geenBetaling}</KlantMelding>
      )}
    </KlantPagina>
  );
}
