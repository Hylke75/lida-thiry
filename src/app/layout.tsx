import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import { SiteFooter } from "@/components/SiteFooter";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const beschrijving =
  "Ontdek je figuurtype met de online kledingadviestest van Lida Thiry, imago- en kledingadviseur. Meet jezelf op, beantwoord een paar vragen en ontvang direct je persoonlijke advies als PDF.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: {
    default: "Online kledingadviestest · Lida Thiry",
    template: "%s · Lida Thiry",
  },
  description: beschrijving,
  applicationName: "Lida Thiry Imago & Kledingadvies",
  authors: [{ name: "Lida Thiry" }],
  openGraph: {
    type: "website",
    locale: "nl_NL",
    siteName: "Lida Thiry Imago & Kledingadvies",
    title: "Ontdek je figuurtype · Lida Thiry",
    description: beschrijving,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ontdek je figuurtype · Lida Thiry",
    description: beschrijving,
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="nl"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {children}
        <SiteFooter />
      </body>
    </html>
  );
}
