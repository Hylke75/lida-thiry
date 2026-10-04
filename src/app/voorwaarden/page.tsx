import type { Metadata } from "next";
import { Identiteit, JuridischePagina } from "@/components/JuridischePagina";
import { Opmaak } from "@/components/Opmaak";
import { leesSectie } from "@/lib/inhoud/lees";
import { JURIDISCH_VOORWAARDEN } from "@/lib/inhoud/groepen/juridisch";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden voor de online kledingadviestest van Lida Thiry Imago & Kledingadvies.",
  alternates: { canonical: "/voorwaarden" },
};

export const dynamic = "force-dynamic";

export default async function VoorwaardenPage() {
  const waarden = await leesSectie(JURIDISCH_VOORWAARDEN);
  return (
    <JuridischePagina titel="Algemene voorwaarden" bijgewerkt={waarden.bijgewerkt}>
      <Opmaak tekst={waarden.tekst} blokken={{ bedrijfsgegevens: <Identiteit /> }} />
    </JuridischePagina>
  );
}
