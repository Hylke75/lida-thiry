import type { Metadata } from "next";
import { DM_Serif_Display, Manrope } from "next/font/google";
import { Bezoekersstatistiek } from "@/components/Bezoekersstatistiek";
import { FoutRapporteur } from "@/components/FoutRapporteur";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import { siteUrl } from "@/lib/site";
import { leesWebsite } from "@/lib/website/lees";
import { bouwSiteMetadata } from "@/lib/website/metadata";
import "./globals.css";

/** Koppen (handboek: DM Serif Display, alleen gewicht 400; cursief voor één accentwoord). */
const dmSerif = DM_Serif_Display({
  variable: "--font-dm-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

/** Lopende tekst en navigatie (Manrope, variabel lettertype 200–800). */
const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

/**
 * Standaard-metadata voor alle pagina's, uit Beheer → Website → Instellingen
 * (naam, omschrijving, favicon, deelafbeelding). Zonder instellingen of zonder
 * database gelden de standaardwaarden uit de code. Pagina's die zelf een titel of
 * deelafbeelding opgeven, gaan voor (zie lib/website/metadata.ts).
 */
export async function generateMetadata(): Promise<Metadata> {
  return bouwSiteMetadata(await leesWebsite(), siteUrl());
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      data-scroll-behavior="smooth"
      className={`${dmSerif.variable} ${manrope.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col">
        {/* Met "Ga naar inhoud"; verbergt zich zelf in het beheer, bij inloggen en in de test. */}
        <SiteHeader />
        {/* Doel van de link "Ga naar inhoud" (elke pagina heeft een eigen <main>). */}
        <span id="inhoud" tabIndex={-1} className="block scroll-mt-24 outline-none" />
        {children}
        {/* Niet in het beheer (dat heeft een eigen navigatie). */}
        <SiteFooter />
        {/* Anoniem en zonder cookies; uit in het beheer (zie Bezoekersstatistiek). */}
        <Bezoekersstatistiek />
        {/* Browserfouten naar de eigen foutlog (Beheer → Instellingen → Fouten). */}
        <FoutRapporteur />
      </body>
    </html>
  );
}
