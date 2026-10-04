import "server-only";
import { publiekClient, publiekGecached } from "../cache/publiek";
import { parseerOpmaak } from "../inhoud/opmaak";
import { isOptimaliseerbaar, origineelUrl } from "./afbeelding";

export type AfmetingenPerUrl = Record<string, { breedte: number; hoogte: number }>;

// Afmetingen van afbeeldingen uit de mediabibliotheek, voor next/image in teksten
// (pagina's, blog): zonder breedte en hoogte zou de pagina verspringen tijdens
// het laden. Gecachet onder de tag "media" (uploaden of bewerken vernieuwt die).

const leesAfmetingen = publiekGecached("media-afmetingen", ["media"], async (urls: string[]): Promise<AfmetingenPerUrl> => {
  const { data, error } = await publiekClient().from("media").select("url, breedte, hoogte").in("url", urls).limit(urls.length);
  if (error) throw error;
  const uit: AfmetingenPerUrl = {};
  for (const r of data ?? []) {
    const breedte = Number(r.breedte);
    const hoogte = Number(r.hoogte);
    if (breedte > 0 && hoogte > 0) uit[r.url as string] = { breedte, hoogte };
  }
  return uit;
});

/**
 * Afmetingen voor afbeeldingen uit onze eigen opslag (andere adressen worden
 * overgeslagen). Een webversie ("…/opt/…") heeft dezelfde verhouding als het
 * origineel, dus die zoeken we op via het origineel. Faalt zacht: zonder
 * afmetingen wordt het een gewone lazy <img>.
 */
export async function afmetingenVoorUrls(adressen: readonly (string | null | undefined)[]): Promise<AfmetingenPerUrl> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const urls = [...new Set(adressen.filter((u): u is string => isOptimaliseerbaar(u, supabaseUrl)))];
  if (!urls.length) return {};
  try {
    const perOrigineel = await leesAfmetingen([...new Set(urls.map(origineelUrl))].sort().slice(0, 100));
    const uit: AfmetingenPerUrl = {};
    for (const u of urls) {
      const a = perOrigineel[origineelUrl(u)];
      if (a) uit[u] = a;
    }
    return uit;
  } catch (e) {
    console.error("Afmetingen van afbeeldingen niet geladen; gewone <img> gebruikt.", e instanceof Error ? e.message : e);
    return {};
  }
}

/** Afmetingen voor de afbeeldingen in een beheerbare tekst (pagina, blogbericht). */
export async function afmetingenVoorTekst(tekst: string): Promise<AfmetingenPerUrl> {
  return afmetingenVoorUrls(parseerOpmaak(tekst).flatMap((b) => (b.soort === "afbeelding" ? [b.url] : [])));
}
