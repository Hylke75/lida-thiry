import type { Metadata } from "next";
import { contactEmail, Identiteit, JuridischePagina } from "@/components/JuridischePagina";
import { Opmaak } from "@/components/Opmaak";
import { leesPubliekeInstellingen } from "@/lib/instellingen";
import { leesSectie } from "@/lib/inhoud/lees";
import { bevatPlaceholder } from "@/lib/inhoud/schema";
import { JURIDISCH_PRIVACY } from "@/lib/inhoud/groepen/juridisch";

// Statisch met ISR: de inhoud hangt alleen af van teksten en instellingen uit de
// database (geen cookies of zoekparameters). Die staan in de datacache onder de
// tags "inhoud" en "instellingen"; opslaan in het beheer vernieuwt de tags en
// daarmee deze pagina direct. Zonder wijziging wordt hij elk uur opnieuw opgebouwd.
// Was de database bij het opbouwen niet bereikbaar, dan staat de pagina met de
// standaardtekst er maar 30 s (zie noodvoorziening in lib/cache/publiek.ts).
export const revalidate = 3600;

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe Lida Thiry Imago & Kledingadvies omgaat met je persoonsgegevens en lichaamsmaten bij de online kledingadviestest.",
  alternates: { canonical: "/privacy" },
};

const STANDAARD_BEWAARTERMIJN_DAGEN = 120;

async function bewaartermijnMatenDagen(): Promise<number> {
  try {
    const waarde = Number((await leesPubliekeInstellingen()).bewaartermijn_maten_dagen);
    return Number.isFinite(waarde) && waarde > 0 ? Math.round(waarde) : STANDAARD_BEWAARTERMIJN_DAGEN;
  } catch {
    return STANDAARD_BEWAARTERMIJN_DAGEN;
  }
}

export default async function PrivacyPage() {
  const [dagen, waarden, email] = await Promise.all([
    bewaartermijnMatenDagen(),
    leesSectie(JURIDISCH_PRIVACY),
    contactEmail(),
  ]);

  return (
    <JuridischePagina titel="Privacyverklaring" bijgewerkt={waarden.bijgewerkt}
      concept={bevatPlaceholder(waarden) || email.startsWith("[")}
    >
      <Opmaak
        tekst={waarden.tekst}
        variabelen={{ bewaartermijn_dagen: dagen, contact_email: email }}
        blokken={{ bedrijfsgegevens: <Identiteit /> }}
      />
    </JuridischePagina>
  );
}
