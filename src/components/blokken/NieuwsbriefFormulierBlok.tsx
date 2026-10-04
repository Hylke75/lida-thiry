import { Opmaak } from "@/components/Opmaak";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { AanmeldFormulier } from "@/components/AanmeldFormulier";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { haalActiefFormulierPubliek } from "@/lib/nieuwsbrief/formulieren";

/**
 * Een nieuwsbrief-aanmeldformulier als blok op een pagina. Zonder slug het
 * standaard aanmeldblok ({nieuwsbrief}); met slug een formulier uit Beheer →
 * Nieuwsbrief → Formulieren ({nieuwsbrief_<slug>}). Server-component: leest
 * zelf zijn teksten. Rendert niets als het formulier niet bestaat of uit staat.
 */
export async function NieuwsbriefFormulierBlok({ slug }: { slug?: string }) {
  const teksten = await leesSectie(NIEUWSBRIEF_AANMELDEN);
  if (!slug) {
    return <NieuwsbriefAanmelden teksten={teksten} toestemming={<Opmaak tekst={teksten.toestemming_tekst} />} />;
  }
  const formulier = await haalActiefFormulierPubliek(slug).catch((e) => {
    console.error(`Nieuwsbriefformulier ${slug} niet geladen`, e);
    return null;
  });
  if (!formulier) return null;
  return <AanmeldFormulier formulier={formulier} standaard={teksten} />;
}
