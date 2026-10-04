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

export const dynamic = "force-dynamic";

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
