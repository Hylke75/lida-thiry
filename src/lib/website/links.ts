import "server-only";
import { haalActieveSoortenPubliek } from "../afspraken/data";
import { haalPagina } from "../paginas/publiek";
import { geldigePaginaSlug } from "../paginas/regels";
import { paginaSlugVan } from "./weergave";

/**
 * Kan er online een afspraak gemaakt worden (minstens één actieve afspraaksoort)?
 * Zo niet, dan is /afspraak een doodlopende weg: menu, voettekst en homepage
 * laten de link dan weg of verwijzen naar contact. Faalt zacht: is de database
 * niet bereikbaar, dan geldt "nee" (het boekingsblok toont dan ook niets te boeken).
 */
export async function afspraakBoekbaar(): Promise<boolean> {
  try {
    return (await haalActieveSoortenPubliek()).length > 0;
  } catch {
    return false;
  }
}

/**
 * Bestaat de pagina achter deze link? Vaste routes (/blog, /bestellen …),
 * ankers en externe links gelden als bestaand; een link naar een beheerbare
 * pagina ("/over-mij") alleen als die gepubliceerd is, en /afspraak alleen als
 * er iets te boeken is (afspraakBoekbaar). Faalt zacht (haalPagina).
 */
export async function linkBestaat(link: string): Promise<boolean> {
  if (link.trim() === "/afspraak") return afspraakBoekbaar();
  const slug = paginaSlugVan(link);
  if (!slug || !geldigePaginaSlug(slug)) return true;
  return (await haalPagina(slug)) !== null;
}

/** Laat links naar (nog) niet gepubliceerde pagina's weg. */
export async function bestaandeLinks<T extends { href: string }>(items: readonly T[]): Promise<T[]> {
  const bestaat = await Promise.all(items.map((i) => linkBestaat(i.href)));
  return items.filter((_, n) => bestaat[n]);
}

/** De eerste link die bestaat (bijv. /over-mij, anders /contact), of de laatste als reserve — geef als laatste een vaste route mee. */
export async function eersteBestaandeLink(...links: string[]): Promise<string> {
  for (const l of links) if (await linkBestaat(l)) return l;
  return links[links.length - 1];
}
