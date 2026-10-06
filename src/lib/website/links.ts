import "server-only";
import { haalPagina } from "../paginas/publiek";
import { geldigePaginaSlug } from "../paginas/regels";
import { paginaSlugVan } from "./weergave";

/**
 * Bestaat de pagina achter deze link? Vaste routes (/blog, /bestellen …),
 * ankers en externe links gelden als bestaand; een link naar een beheerbare
 * pagina ("/over-mij") alleen als die gepubliceerd is. Faalt zacht (haalPagina).
 */
export async function linkBestaat(link: string): Promise<boolean> {
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
