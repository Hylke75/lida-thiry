import { leesSiteNavigatie } from "./navigatie";
import { SiteHeaderWeergave } from "./SiteHeaderWeergave";

/**
 * Kop van de publieke site (docs/ontwerp: .site-header): "Ga naar inhoud",
 * woordmerk, menu en de knop rechtsboven. Staat in de root-layout; de weergave
 * (client) verbergt zich zelf in het beheer, bij inloggen en in de test.
 *
 * Menu: gepubliceerde pagina's met "in menu" plus de blog; zijn die er niet,
 * dan het standaardmenu uit Beheer → Teksten → Website → Kop en voettekst.
 * Naam en logo komen uit Beheer → Website → Instellingen.
 */
export async function SiteHeader() {
  const nav = await leesSiteNavigatie();
  return (
    <SiteHeaderWeergave
      items={nav.menu}
      naam={nav.site.korteNaam}
      subregel={nav.subregel}
      logo={nav.logo}
      knop={nav.knop}
    />
  );
}
