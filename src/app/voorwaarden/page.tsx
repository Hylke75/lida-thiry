import type { Metadata } from "next";
import { contactEmail, Identiteit, JuridischePagina } from "@/components/JuridischePagina";
import { Opmaak } from "@/components/Opmaak";
import { leesSectie } from "@/lib/inhoud/lees";
import { bevatPlaceholder } from "@/lib/inhoud/schema";
import { JURIDISCH_VOORWAARDEN } from "@/lib/inhoud/groepen/juridisch";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden voor de online kledingadviestest van Lida Thiry Imago & Kledingadvies.",
  alternates: { canonical: "/voorwaarden" },
};

// Statisch met ISR: de inhoud hangt alleen af van teksten en instellingen uit de
// database (geen cookies of zoekparameters). Die staan in de datacache onder de
// tags "inhoud" en "instellingen"; opslaan in het beheer vernieuwt de tags en
// daarmee deze pagina direct. Zonder wijziging wordt hij elk uur opnieuw opgebouwd.
// Was de database bij het opbouwen niet bereikbaar, dan staat de pagina met de
// standaardtekst er maar 30 s (zie noodvoorziening in lib/cache/publiek.ts).
export const revalidate = 3600;

export default async function VoorwaardenPage() {
  const [waarden, email] = await Promise.all([leesSectie(JURIDISCH_VOORWAARDEN), contactEmail()]);
  return (
    <JuridischePagina titel="Algemene voorwaarden" bijgewerkt={waarden.bijgewerkt}
      concept={bevatPlaceholder(waarden) || email.startsWith("[")}
    >
      <Opmaak tekst={waarden.tekst} variabelen={{ contact_email: email }} blokken={{ bedrijfsgegevens: <Identiteit /> }} />
    </JuridischePagina>
  );
}
