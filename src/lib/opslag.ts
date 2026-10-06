// Namen van de buckets in Supabase Storage. Eén plek, zodat een typfout in een
// bucketnaam niet stilletjes een lege lijst of een mislukte upload geeft. Puur:
// ook bruikbaar in de browser.

/** Privé: de PDF's met kledingadviezen. */
export const ADVIEZEN_PDF = "adviezen-pdf";
/** Privé: facturen (bestellingen en cadeaubonnen). */
export const FACTUREN = "facturen";
/** Privé: de beeldbank met adviesbeelden en silhouetten. */
export const ADVIES_BEELDEN = "advies-beelden";
/** Openbaar: foto's bij de meetinstructies. */
export const MEETINSTRUCTIES = "meetinstructies";
/** Openbaar: afbeeldingen in blogberichten en pagina's. */
export const BLOG = "blog";
/** Openbaar: afbeeldingen in nieuwsbrieven. */
export const NIEUWSBRIEF = "nieuwsbrief";
/** Openbaar: de mediabibliotheek. */
export const MEDIA = "media";
