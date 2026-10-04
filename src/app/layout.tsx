import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { Bezoekersstatistiek } from "@/components/Bezoekersstatistiek";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { siteUrl } from "@/lib/site";
import { leesWebsite } from "@/lib/website/lees";
import { bouwSiteMetadata } from "@/lib/website/metadata";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
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
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {/* Verbergt zich zelf in het beheer, bij inloggen en in de test (zie SiteHeaderWeergave). */}
        <SiteHeader />
        {children}
        <SiteFooter />
        {/* Anoniem en zonder cookies; uit in het beheer (zie Bezoekersstatistiek). */}
        <Bezoekersstatistiek />
      </body>
    </html>
  );
}
