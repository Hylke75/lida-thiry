import type { Metadata } from "next";
import { leesSectie } from "@/lib/inhoud/lees";
import { MIJN_ADVIES_PAGINA } from "@/lib/inhoud/groepen/mijn-advies";
import { Opmaak } from "@/components/Opmaak";
import { KlantKaart, KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { MijnAdviesFormulier } from "./MijnAdviesFormulier";

// Statisch met ISR: alleen teksten (tag "inhoud"); het formulier zelf praat met
// /api/mijn-advies. Opslaan in Beheer → Teksten vernieuwt de pagina direct.
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Mijn advies opnieuw ontvangen",
  description: "Vraag de link naar je persoonlijke kledingadvies of je test opnieuw aan per e-mail.",
  alternates: { canonical: "/mijn-advies" },
};

export default async function MijnAdviesPage() {
  const t = await leesSectie(MIJN_ADVIES_PAGINA);
  return (
    <KlantPagina>
      <KlantKop bovenschrift="Mijn advies" titel={t.titel} terug={{ href: "/", tekst: "← Terug" }}>
        <Opmaak tekst={t.intro} />
      </KlantKop>
      <KlantKaart>
        <MijnAdviesFormulier
          teksten={{ knop: t.knop, knopBezig: t.knopBezig, bevestiging: t.bevestiging, foutVerbinding: t.foutVerbinding }}
        />
      </KlantKaart>
    </KlantPagina>
  );
}
