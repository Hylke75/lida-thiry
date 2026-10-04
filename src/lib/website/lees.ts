import "server-only";
import { cache } from "react";
import { leesPubliekeInstellingen } from "../instellingen";
import { websiteInstellingen, type WebsiteInstellingen } from "./instellingen";

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
