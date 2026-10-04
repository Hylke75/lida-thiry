import { Opmaak } from "@/components/Opmaak";
import { AfspraakBoeken, type PubliekeSoort } from "@/components/afspraken/AfspraakBoeken";
import { leesSectie } from "@/lib/inhoud/lees";
import { AFSPRAKEN_BOEKEN } from "@/lib/inhoud/groepen/afspraken";
import { haalSoorten } from "@/lib/afspraken/data";

/**
 * Het boekingsformulier als blok (op /afspraak en via {afspraak} op een pagina).
 * Server-component: leest de actieve soorten en de teksten (Beheer → Teksten →
 * Afspraken); de vrije tijden haalt het formulier zelf op.
 */
export async function AfspraakBlok() {
  const [teksten, soorten] = await Promise.all([
    leesSectie(AFSPRAKEN_BOEKEN),
    haalSoorten(true).catch((e) => {
      console.error("Afspraaksoorten laden mislukt", e);
      return [];
    }),
  ]);
  const publiek: PubliekeSoort[] = soorten.map((s) => ({
    id: s.id,
    naam: s.naam,
    omschrijving: s.omschrijving,
    duur_minuten: s.duur_minuten,
    prijs_cent: s.prijs_cent,
    aanbetaling_cent: s.aanbetaling_cent,
    locatie: s.locatie,
    online: s.online,
  }));
  return (
    <section id="afspraak" className="scroll-mt-24 rounded-2xl border border-foreground/10 bg-kaart p-6 sm:p-8">
      <AfspraakBoeken teksten={teksten} privacy={<Opmaak tekst={teksten.privacy} />} soorten={publiek} />
    </section>
  );
}
