import { haalMenu } from "@/lib/paginas/publiek";
import { SiteHeaderWeergave } from "./SiteHeaderWeergave";

/**
 * Kop met logo en menu voor de publieke site. Staat in de root-layout; de
 * weergave (client) verbergt zich zelf in het beheer, bij inloggen en in de
 * test (/test/<token>), zodat daar niets verandert.
 *
 * Menu-items: gepubliceerde pagina's met "in menu", op volgorde, plus de vaste
 * link naar de blog en een knop naar de test. Is de database niet bereikbaar,
 * dan blijven alleen het logo, Blog en de knop staan (haalMenu faalt zacht).
 */
export async function SiteHeader() {
  const { menu } = await haalMenu();
  return <SiteHeaderWeergave paginas={menu} />;
}
