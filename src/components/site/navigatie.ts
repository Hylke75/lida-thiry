import "server-only";
import { afmetingenVoorUrls } from "@/lib/media/publiek";
import { haalMenu } from "@/lib/paginas/publiek";
import type { MenuItem } from "@/lib/paginas/beheer";
import { leesSectie } from "@/lib/inhoud/lees";
import { WEBSITE_KOP } from "@/lib/inhoud/groepen/website";
import { leesWebsite } from "@/lib/website/lees";
import { logoAlt, type WebsiteInstellingen } from "@/lib/website/instellingen";
import { bestaandeLinks } from "@/lib/website/links";
import { kiesMenu, veiligeLink } from "@/lib/website/weergave";
import type { LogoGegevens } from "./Woordmerk";

export interface SiteNavigatie {
  site: WebsiteInstellingen;
  /** Hoofdmenu: pagina's "in menu" (plus Blog) of het standaardmenu uit de teksten. */
  menu: MenuItem[];
  /** Pagina's met "in footer". */
  footer: MenuItem[];
  subregel: string;
  knop: { tekst: string; href: string };
  logo: LogoGegevens | null;
}

/**
 * Alles wat kop en voettekst nodig hebben. Faalt zacht: zonder database staan
 * er de naam, het standaardmenu (zonder beheerbare pagina's) en de knop.
 */
export async function leesSiteNavigatie(): Promise<SiteNavigatie> {
  const [{ menu: paginas, footer }, site, kop] = await Promise.all([haalMenu(), leesWebsite(), leesSectie(WEBSITE_KOP)]);
  const menu = paginas.length ? kiesMenu(paginas, []) : await bestaandeLinks(kiesMenu([], kop.menu));
  // Met bekende afmetingen (logo uit de mediabibliotheek) gaat het logo via next/image.
  const afm = site.logoUrl ? (await afmetingenVoorUrls([site.logoUrl]))[site.logoUrl] : undefined;
  return {
    site,
    menu,
    footer,
    subregel: kop.subregel.trim(),
    knop: { tekst: kop.knop.trim() || "Vraag advies aan", href: veiligeLink(kop.knopLink, "/bestellen") },
    logo: site.logoUrl ? { url: site.logoUrl, alt: logoAlt(site), breedte: afm?.breedte ?? null, hoogte: afm?.hoogte ?? null } : null,
  };
}
