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
    <section id="contactformulier" data-pagina={pagina} className="scroll-mt-24 rounded-2xl border border-foreground/10 bg-kaart p-6 sm:p-8">
      <ContactFormulier teksten={teksten} privacy={<Opmaak tekst={teksten.privacy} />} />
    </section>
  );
}
