// Pure hulpfuncties voor het beheer van de adviestypes (lijst + editor).
// Geen server- of browserafhankelijkheden, zodat ze getest kunnen worden.

/** De vijf figuren, in de vaste volgorde X, A, V, H, 8. */
export const LETTERS = [
  { letter: "X", naam: "Zandloper" },
  { letter: "A", naam: "Peer/driehoek" },
  { letter: "V", naam: "Omgekeerde driehoek" },
  { letter: "H", naam: "Rechthoek" },
  { letter: "8", naam: "De 8" },
] as const;

export type Letter = (typeof LETTERS)[number]["letter"];

export function letterNaam(letter: string): string {
  return LETTERS.find((l) => l.letter === letter)?.naam ?? letter;
}

/** Gangbare sectiekoppen (keuzelijst in de editor; vrije tekst mag ook). */
export const STANDAARD_KOPPEN = [
  "Je hebt",
  "Je kledingplan",
  "Je schouders",
  "Je bovenlichaam",
  "Je taille en middenrif",
  "Je onderlichaam",
  "Je kleuren en dessins",
  "Je sieraden",
  "Je sjaals",
  "Je riemen en ceintuurs",
  "Je schoenen",
  "Je tassen",
  "Je broeken",
  "Je rokken",
  "Je tops",
  "Je jasjes en mantels",
  "Je jurken",
  "Tips",
  "Voorbeeldoutfits",
] as const;

/** Verschuift het element op `index` één plek omhoog (-1) of omlaag (+1). */
export function verplaats<T>(lijst: readonly T[], index: number, richting: -1 | 1): T[] {
  const doel = index + richting;
  const kopie = [...lijst];
  if (index < 0 || index >= lijst.length || doel < 0 || doel >= lijst.length) return kopie;
  [kopie[index], kopie[doel]] = [kopie[doel], kopie[index]];
  return kopie;
}

/** Voegt `item` in op positie `index` (begrensd tussen 0 en de lengte). */
export function voegIn<T>(lijst: readonly T[], index: number, item: T): T[] {
  const plek = Math.max(0, Math.min(lijst.length, Math.trunc(index)));
  return [...lijst.slice(0, plek), item, ...lijst.slice(plek)];
}

/** Verwijdert het element op `index`. */
export function verwijderOp<T>(lijst: readonly T[], index: number): T[] {
  return lijst.filter((_, i) => i !== index);
}

/**
 * Tijdelijke volgordes liggen ver onder nul, zodat ze nooit botsen met de
 * bestaande (0, 1, 2, ...) en de onderlinge volgorde behouden blijft als een
 * stap halverwege mislukt.
 */
export const TIJDELIJK_VERSCHIL = 1_000_000;

export interface HernummerStap<T> {
  item: T;
  oud: number;
  tijdelijk: number;
  naar: number;
}

/**
 * Plan om rijen hun nieuwe volgorde (0..n-1) te geven zonder dat er
 * tussendoor twee rijen dezelfde volgorde hebben (unieke index). Uitvoeren in
 * twee rondes: eerst alle stappen naar `tijdelijk`, daarna naar `naar`.
 * Rijen die al op hun plek staan worden overgeslagen.
 *
 * @param gewenst de rijen in de gewenste volgorde, met hun huidige volgorde
 */
export function hernummerPlan<T>(
  gewenst: readonly T[],
  huidigeVolgorde: (item: T) => number,
): HernummerStap<T>[] {
  return gewenst
    .map((item, naar) => ({ item, oud: huidigeVolgorde(item), tijdelijk: naar - TIJDELIJK_VERSCHIL, naar }))
    .filter((s) => s.oud !== s.naar);
}

export interface TypeTelling {
  secties: number;
  beelden: number;
  laatstBewerkt: string | null;
}

/**
 * Telt per type het aantal secties en beeldkoppelingen, en bepaalt wanneer er
 * voor het laatst iets is bewerkt (type of een van zijn secties).
 */
export function telPerType(
  types: readonly { sleutel: string; bijgewerkt_op: string | null }[],
  secties: readonly { id: string; type_sleutel: string; bijgewerkt_op: string | null }[],
  koppelingen: readonly { sectie_id: string }[],
): Record<string, TypeTelling> {
  const uit: Record<string, TypeTelling> = {};
  for (const t of types) uit[t.sleutel] = { secties: 0, beelden: 0, laatstBewerkt: t.bijgewerkt_op };
  const typeVanSectie = new Map<string, string>();
  const later = (a: string | null, b: string | null) => (!a ? b : !b ? a : a > b ? a : b);
  for (const s of secties) {
    const t = uit[s.type_sleutel];
    if (!t) continue;
    typeVanSectie.set(s.id, s.type_sleutel);
    t.secties++;
    t.laatstBewerkt = later(t.laatstBewerkt, s.bijgewerkt_op);
  }
  for (const k of koppelingen) {
    const sleutel = typeVanSectie.get(k.sectie_id);
    if (sleutel) uit[sleutel].beelden++;
  }
  return uit;
}

/**
 * Maakt een zoekterm veilig voor een PostgREST `or(...ilike...)`-filter:
 * haalt tekens weg die de filtersyntaxis of het patroon zouden breken.
 */
export function veiligeZoekterm(tekst: string): string {
  return tekst
    .replace(/[,()*%_\\:"']/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

/** Splitst een sleutel als "12A" in categorie en letter; null als ongeldig. */
export function ontleedSleutel(sleutel: string): { categorie: number; letter: Letter } | null {
  const m = sleutel.match(/^(\d{1,2})([XAVH8])$/);
  if (!m) return null;
  const categorie = Number(m[1]);
  if (categorie < 1 || categorie > 12) return null;
  return { categorie, letter: m[2] as Letter };
}
