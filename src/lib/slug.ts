// URL-slugs uit vrije tekst. Puur, dus ook bruikbaar in de browser en in tests.

/**
 * Zet tekst om in een nette slug: kleine letters, cijfers en enkele streepjes,
 * zonder accenten; "&" wordt "en". Hooguit `max` tekens, nooit met een streepje
 * aan het eind. Bijv. "Jurken voor de Peer!" → "jurken-voor-de-peer",
 * "Café & Crème" → "cafe-en-creme". Niets bruikbaars: "".
 */
export function slugify(tekst: string, max = 80): string {
  return tekst
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " en ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, max)
    .replace(/-+$/g, "");
}
