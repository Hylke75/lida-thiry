// Globaal zoeken in het beheer: pure hulpfuncties (zoekterm normaliseren,
// PostgREST-filters veilig opbouwen, treffers markeren). Geen database hier;
// het ophalen staat in zoeken.ts.

/** Maximale lengte van een zoekterm (tekens). */
export const MAX_ZOEKTERM = 100;
/** Maximaal aantal losse woorden waarop gezocht wordt (elk woord moet ergens voorkomen). */
export const MAX_WOORDEN = 5;
/** Kortste zoekterm waarmee gezocht wordt. */
export const MIN_ZOEKTERM = 2;

/**
 * Zoekterm uit de URL: string (eerste waarde bij een lijst), witruimte samengevoegd,
 * zonder stuurtekens, ingekort tot MAX_ZOEKTERM.
 */
export function normaliseerZoekterm(q: unknown): string {
  const ruw = Array.isArray(q) ? q[0] : q;
  if (typeof ruw !== "string") return "";
  return ruw
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_ZOEKTERM)
    .trim();
}

/**
 * De losse zoekwoorden: gesplitst op spaties, zonder `*` (in PostgREST een
 * jokerteken), zonder dubbelen (hoofdletterongevoelig), hooguit MAX_WOORDEN.
 */
export function zoekWoorden(q: string): string[] {
  const gezien = new Set<string>();
  const uit: string[] = [];
  for (const w of normaliseerZoekterm(q).replace(/\*/g, " ").split(" ")) {
    const woord = w.trim();
    const sleutel = woord.toLocaleLowerCase("nl");
    if (!woord || gezien.has(sleutel)) continue;
    gezien.add(sleutel);
    uit.push(woord);
    if (uit.length >= MAX_WOORDEN) break;
  }
  return uit;
}

/** Tekst letterlijk in een (i)like-patroon: `%`, `_` en `\` krijgen een backslash. */
export function likeLetterlijk(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

/**
 * Waarde voor `kolom.ilike.<waarde>` binnen een PostgREST or()-filter:
 * `"%woord%"` met de jokertekens letterlijk gemaakt en tussen dubbele aanhalingstekens,
 * zodat komma's, haakjes en punten in de zoekterm het filter niet breken.
 */
export function ilikeWaarde(woord: string): string {
  const patroon = `%${likeLetterlijk(woord)}%`;
  return `"${patroon.replace(/[\\"]/g, (c) => `\\${c}`)}"`;
}

/**
 * Of een woord het begin van een id (uuid) kan zijn: minstens 4 hextekens,
 * eventueel met streepjes op de juiste plekken, hooguit een hele uuid.
 */
export function isIdBegin(woord: string): boolean {
  const w = woord.toLowerCase();
  if (!/^[0-9a-f-]+$/.test(w)) return false;
  const hex = w.replace(/-/g, "");
  if (hex.length < 4 || hex.length > 32) return false;
  // Streepjes alleen waar ze in een uuid staan (na 8, 12, 16 en 20 tekens).
  const plekken = [8, 13, 18, 23];
  for (let i = 0; i < w.length; i++) if (w[i] === "-" && !plekken.includes(i)) return false;
  return true;
}

function alsUuid(hex32: string): string {
  return `${hex32.slice(0, 8)}-${hex32.slice(8, 12)}-${hex32.slice(12, 16)}-${hex32.slice(16, 20)}-${hex32.slice(20)}`;
}

/**
 * Het bereik van uuid's dat met `woord` begint (voor zoeken op een stukje
 * bestelnummer), of null als het woord geen id-begin is.
 */
export function uuidBereik(woord: string): { van: string; tot: string } | null {
  if (!isIdBegin(woord)) return null;
  const hex = woord.toLowerCase().replace(/-/g, "");
  return { van: alsUuid(hex.padEnd(32, "0")), tot: alsUuid(hex.padEnd(32, "f")) };
}

/**
 * Eén or()-groep voor één zoekwoord: het woord komt voor in minstens één van de
 * kolommen (of, met `idBereik`, het id begint ermee).
 */
export function orGroep(kolommen: readonly string[], woord: string, opties: { idBereik?: boolean } = {}): string {
  const delen = kolommen.map((k) => `${k}.ilike.${ilikeWaarde(woord)}`);
  const bereik = opties.idBereik ? uuidBereik(woord) : null;
  if (bereik) delen.push(`and(id.gte.${bereik.van},id.lte.${bereik.tot})`);
  return delen.join(",");
}

/** Voor elk zoekwoord één or()-groep; samen (EN) betekent dat elk woord ergens moet voorkomen. */
export function orGroepen(kolommen: readonly string[], woorden: readonly string[], opties: { idBereik?: boolean } = {}): string[] {
  return woorden.map((w) => orGroep(kolommen, w, opties));
}

// Markeren -------------------------------------------------------------------

export interface Stukje {
  tekst: string;
  treffer: boolean;
}

function regexLetterlijk(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Splitst `tekst` in stukjes met en zonder treffer (hoofdletterongevoelig), voor
 * het markeren van de zoekwoorden. Langere woorden gaan voor bij overlap.
 */
export function markeer(tekst: string, woorden: readonly string[]): Stukje[] {
  if (!tekst) return [];
  const termen = [...new Set(woorden.filter(Boolean))].sort((a, b) => b.length - a.length);
  if (termen.length === 0) return [{ tekst, treffer: false }];
  const re = new RegExp(termen.map(regexLetterlijk).join("|"), "giu");
  const uit: Stukje[] = [];
  let laatste = 0;
  for (const m of tekst.matchAll(re)) {
    const begin = m.index ?? 0;
    if (m[0].length === 0) continue;
    if (begin > laatste) uit.push({ tekst: tekst.slice(laatste, begin), treffer: false });
    uit.push({ tekst: m[0], treffer: true });
    laatste = begin + m[0].length;
  }
  if (laatste < tekst.length) uit.push({ tekst: tekst.slice(laatste), treffer: false });
  return uit;
}

/**
 * Een stukje van een lange tekst rond de eerste treffer (met … aan de randen),
 * hooguit `max` tekens. Zonder treffer: het begin van de tekst.
 */
export function fragment(tekst: string, woorden: readonly string[], max = 140): string {
  const plat = (tekst ?? "").replace(/\s+/g, " ").trim();
  if (plat.length <= max) return plat;
  const laag = plat.toLocaleLowerCase("nl");
  const posities = woorden
    .map((w) => laag.indexOf(w.toLocaleLowerCase("nl")))
    .filter((i) => i >= 0);
  const eerste = posities.length ? Math.min(...posities) : 0;
  let begin = Math.max(0, eerste - Math.floor(max / 3));
  if (begin + max > plat.length) begin = Math.max(0, plat.length - max);
  const eind = Math.min(plat.length, begin + max);
  return `${begin > 0 ? "…" : ""}${plat.slice(begin, eind).trim()}${eind < plat.length ? "…" : ""}`;
}

/** Link naar `pad` met `?<param>=<q>` (of zonder als er geen param is). */
export function metZoekterm(pad: string, param: string | null, q: string): string {
  if (!param || !q) return pad;
  return `${pad}?${new URLSearchParams({ [param]: q }).toString()}`;
}
