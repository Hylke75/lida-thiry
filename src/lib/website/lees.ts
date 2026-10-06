import "server-only";
import { cache } from "react";
import { leesInstellingen, leesPubliekeInstellingen } from "../instellingen";
import type { Metadata } from "next";
import { websiteInstellingen, type WebsiteInstellingen } from "./instellingen";
import { leesSeoPaginas, paginaSeo, VASTE_PAGINAS, vastePaginaMetadata, type VastePaginaSleutel } from "./seo";

/**
 * De website-instellingen voor de publieke site: gecachet (tag "instellingen",
 * zie lib/cache) en één keer per request gelezen. Faalt zacht: is de database
 * niet bereikbaar (of ontbreken de sleutels, bijv. tijdens de build), dan gelden
 * de standaardwaarden uit de code.
 */
export const leesWebsite = cache(async (): Promise<WebsiteInstellingen> => {
  try {
    return websiteInstellingen(await leesPubliekeInstellingen());
  } catch (e) {
    console.error("Website-instellingen niet geladen; standaardwaarden gebruikt.", e);
    return websiteInstellingen(null);
  }
});

/**
 * Metadata (titel, omschrijving, canonical, robots) van een vaste pagina, uit
 * Beheer → Website → SEO; zonder instellingen de standaard uit lib/website/seo.ts.
 * De schakelaar "niet indexeren" voor de hele site zit in de layout-metadata.
 */
export async function vastePaginaMetadataVoor(sleutel: VastePaginaSleutel): Promise<Metadata> {
  const site = await leesWebsite();
  const pad = VASTE_PAGINAS.find((p) => p.sleutel === sleutel)?.pad ?? null;
  return vastePaginaMetadata(paginaSeo(sleutel, leesSeoPaginas(site.seoPaginas)), pad);
}

/**
 * De bedrijfsnaam (Beheer → Instellingen) voor de publieke site, zoals in de
 * gestructureerde gegevens van de homepage: zonder (of met een [invulplek]) de
 * volledige naam van de website. Faalt zacht.
 */
export async function leesBedrijfsnaam(): Promise<string> {
  const [site, inst] = await Promise.all([leesWebsite(), leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>)]);
  const naam = inst.bedrijfsnaam?.trim();
  return naam && !naam.includes("[") ? naam : site.volledigeNaam;
}

/** De standaardauteur van blogberichten, vers gelezen (voor het beheer). Faalt zacht. */
export async function leesStandaardAuteur(): Promise<string> {
  try {
    return websiteInstellingen(await leesInstellingen()).standaardAuteur;
  } catch {
    return websiteInstellingen(null).standaardAuteur;
  }
}
