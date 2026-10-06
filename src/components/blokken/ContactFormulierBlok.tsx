import { Opmaak } from "@/components/Opmaak";
import { ContactFormulier } from "@/components/ContactFormulier";
import { leesSectie } from "@/lib/inhoud/lees";
import { CONTACT_FORMULIER } from "@/lib/inhoud/groepen/contact";

/**
 * Het contactformulier als blok op een pagina ({contactformulier}). Server-
 * component: leest zelf zijn teksten (Beheer → Teksten → Contact). De pagina
 * waarop het staat, leidt de API af uit de Referer; `pagina` (de slug) staat
 * alleen als data-attribuut op het blok.
 */
export async function ContactFormulierBlok({ pagina }: { pagina?: string }) {
  const teksten = await leesSectie(CONTACT_FORMULIER);
  return (
    <section id="contactformulier" data-pagina={pagina} className="scroll-mt-24 rounded-ontwerp-lg border border-line bg-white px-5 py-8 shadow-[0_14px_40px_rgba(58,40,52,.06)] tablet:p-10">
      <ContactFormulier teksten={teksten} privacy={<Opmaak tekst={teksten.privacy} />} />
    </section>
  );
}
