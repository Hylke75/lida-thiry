import type { ReactNode } from "react";
import { Opmaak } from "@/components/Opmaak";
import { NieuwsbriefAanmelden } from "@/components/NieuwsbriefAanmelden";
import { AanmeldFormulier } from "@/components/AanmeldFormulier";
import { leesSectie } from "@/lib/inhoud/lees";
import { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { haalActiefFormulierPubliek } from "@/lib/nieuwsbrief/formulieren";
import { NIEUWSBRIEF_VERLOOP } from "@/components/site/InhoudNieuwsbrief";

/** Rustig zandvlak van het nieuwsbriefpaneel (zoals op de homepage). */
function Paneel({ children }: { children: ReactNode }) {
  return <div className={`rounded-[8px] ${NIEUWSBRIEF_VERLOOP} px-5 py-9 tablet:px-10 tablet:py-12`}>{children}</div>;
}

/**
 * Een nieuwsbrief-aanmeldformulier als blok op een pagina. Zonder slug het
 * standaard aanmeldblok ({nieuwsbrief}); met slug een formulier uit Beheer →
 * Nieuwsbrief → Formulieren ({nieuwsbrief_<slug>}). Server-component: leest
 * zelf zijn teksten. Rendert niets als het formulier niet bestaat of uit staat.
 */
export async function NieuwsbriefFormulierBlok({ slug }: { slug?: string }) {
  const teksten = await leesSectie(NIEUWSBRIEF_AANMELDEN);
  if (!slug) {
    return (
      <Paneel>
        <NieuwsbriefAanmelden teksten={teksten} toestemming={<Opmaak tekst={teksten.toestemming_tekst} />} />
      </Paneel>
    );
  }
  const formulier = await haalActiefFormulierPubliek(slug).catch((e) => {
    console.error(`Nieuwsbriefformulier ${slug} niet geladen`, e);
    return null;
  });
  if (!formulier) return null;
  return (
    <Paneel>
      <AanmeldFormulier formulier={formulier} standaard={teksten} />
    </Paneel>
  );
}
