// Cache-tags voor de publieke site. Puur: geen Next- of database-imports, zodat
// de koppeling tabel → tag los te testen is.
//
// Hoe het werkt: de publieke leesfuncties (lib/cache/publiek.ts) bewaren hun
// resultaat in de Next-datacache onder een of meer tags. Elke beheeractie die
// een tabel wijzigt, roept vernieuwPubliekeData(...) aan met de tabellen die ze
// heeft aangepast; die zet de bijbehorende tags op "verlopen" (lib/cache/vernieuw.ts).
// De pagina's die de gegevens gebruikten, erven de tags en worden dus ook vernieuwd.

export const CACHE_TAGS = [
  "instellingen",
  "inhoud",
  "paginas",
  "blog",
  "lichaamstypes",
  "reviews",
  "media",
  "afspraken",
  "formulieren",
] as const;
export type CacheTag = (typeof CACHE_TAGS)[number];

/**
 * Welke tags horen bij een tabel. Alleen tabellen waarvan de publieke site een
 * gecachete kopie leest, staan hier. Niet gecachet (altijd vers) zijn o.a.
 * bestellingen, contacten, afspraken zelf, en de adviestypes/-secties en
 * beeldbank: die worden alleen gelezen bij het maken van een advies-PDF of in de
 * test met een persoonlijke link, waar een tijdslimiet of oude gegevens meer
 * kwaad dan goed doen.
 */
export const TABEL_TAGS = {
  instellingen: ["instellingen"],
  inhoud: ["inhoud"],
  paginas: ["paginas"],
  blog_berichten: ["blog"],
  lichaamstypes: ["lichaamstypes"],
  beoordelingen: ["reviews"],
  media: ["media"],
  afspraak_soorten: ["afspraken"],
  nb_formulieren: ["formulieren"],
} as const satisfies Record<string, readonly CacheTag[]>;

export type CacheTabel = keyof typeof TABEL_TAGS;

/** De (unieke) tags voor een of meer gewijzigde tabellen. Onbekende tabellen worden genegeerd. */
export function tagsVoorTabellen(tabellen: readonly string[]): CacheTag[] {
  const uit = new Set<CacheTag>();
  for (const t of tabellen) for (const tag of (TABEL_TAGS as Record<string, readonly CacheTag[]>)[t] ?? []) uit.add(tag);
  return [...uit];
}

/**
 * Hoe lang (in seconden) een gecachet resultaat hooguit oud mag zijn als niemand
 * het via een tag vernieuwt (bijv. bij een wijziging buiten het beheer om, of
 * een andere serverinstantie). Wijzigingen in het beheer zijn direct zichtbaar.
 *
 * De blog is kort: ingeplande berichten verschijnen vanzelf zodra hun tijdstip
 * is bereikt. Een pagina neemt de kortste levensduur van zijn gegevens over, en
 * bij het vernieuwen van een pagina wordt verlopen data eerst opnieuw gelezen;
 * datacache (≤ 120 s) + pagina (≤ 120 s) blijft zo ruim onder de 5 minuten.
 */
export const LEVENSDUUR: Readonly<Record<CacheTag, number>> = {
  instellingen: 3600,
  inhoud: 3600,
  paginas: 3600,
  blog: 120,
  lichaamstypes: 3600,
  reviews: 3600,
  media: 3600,
  afspraken: 900,
  formulieren: 3600,
};

/** Kortste levensduur van een set tags (een cache-item met meerdere tags volgt de strengste). */
export function levensduurVoor(tags: readonly CacheTag[]): number {
  return tags.length ? Math.min(...tags.map((t) => LEVENSDUUR[t])) : 3600;
}

/**
 * Levensduur van een pagina die met standaardwaarden is gerenderd omdat de
 * database niet bereikbaar was: kort, zodat de echte inhoud snel terugkomt.
 */
export const NOODVOORZIENING_LEVENSDUUR = 30;
