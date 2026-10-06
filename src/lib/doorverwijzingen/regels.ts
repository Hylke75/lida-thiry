// Pure regels voor doorverwijzingen (redirects): paden normaliseren, invoer
// controleren, lussen en ketens vinden en een adres opzoeken. Zonder database of
// Next-API's, zodat dit zowel in de proxy, in beheer als in tests werkt.

/** Paden die nooit worden doorverwezen (beheer, API, inloggen, Next zelf). */
const GERESERVEERDE_VOORVOEGSELS = ["/admin", "/api", "/auth", "/_next"] as const;

const MAX_VAN_LENGTE = 300;
const MAX_NAAR_LENGTE = 1000;
/** Bovengrens voor het aantal doorverwijzingen dat de proxy in het geheugen laadt. */
export const MAX_DOORVERWIJZINGEN = 5000;

export interface Doorverwijzing {
  van: string;
  naar: string;
  permanent: boolean;
}

export interface DoorverwijzingRij extends Doorverwijzing {
  id: string;
  automatisch: boolean;
  aantal_gebruikt: number;
  laatst_gebruikt_op: string | null;
  aangemaakt_op: string;
}

/** Decodeert %-tekens waar dat kan; ongeldige reeksen blijven staan. */
function veiligDecoderen(pad: string): string {
  try {
    return decodeURI(pad);
  } catch {
    return pad.replace(/%[0-9A-Fa-f]{2}/g, (m) => {
      try {
        return decodeURIComponent(m);
      } catch {
        return m;
      }
    });
  }
}

/**
 * Normaliseert een pad zoals het in de tabel staat en zoals het wordt opgezocht:
 * gedecodeerd, dubbele schuine strepen samengevoegd, zonder schuine streep aan
 * het eind (behalve "/"). Zonder query of #-deel. Hoofdletters blijven staan.
 */
export function normaliseerPad(ruw: string): string {
  let pad = String(ruw ?? "").trim();
  const knip = pad.search(/[?#]/);
  if (knip >= 0) pad = pad.slice(0, knip);
  pad = veiligDecoderen(pad);
  if (!pad.startsWith("/")) pad = `/${pad}`;
  pad = pad.replace(/\/{2,}/g, "/");
  if (pad.length > 1) pad = pad.replace(/\/+$/, "");
  return pad || "/";
}

/** Of een (genormaliseerd) pad onder /admin, /api, /auth of /_next valt (hoofdletterongevoelig). */
export function isGereserveerd(pad: string): boolean {
  const klein = pad.toLowerCase();
  return GERESERVEERDE_VOORVOEGSELS.some((v) => klein === v || klein.startsWith(`${v}/`));
}

/**
 * Of `naar` een intern pad is (begint met één /). Een backslash telt niet als
 * intern: browsers lezen "/\evil.com" als "//evil.com" (een ander domein).
 */
function isIntern(naar: string): boolean {
  return naar.startsWith("/") && !naar.startsWith("//") && !naar.includes("\\");
}

/**
 * Paden die de proxy niet ziet (zie de matcher in src/proxy.ts): beeldbestanden
 * en favicon.ico. Een doorverwijzing vanaf zo'n pad zou nooit werken.
 */
function buitenProxy(pad: string): boolean {
  return /\.(?:svg|png|jpg|jpeg|gif|webp)$/.test(pad) || pad.startsWith("/favicon.ico");
}

/** Het (genormaliseerde) pad van een interne bestemming, of null voor een extern adres. */
export function bestemmingsPad(naar: string): string | null {
  return isIntern(naar) ? normaliseerPad(naar) : null;
}

/**
 * Normaliseert een bestemming: een intern pad (met eventueel ?query en #anker,
 * het pad zonder schuine streep aan het eind) of een https-adres (ongewijzigd).
 */
export function normaliseerNaar(ruw: string): string {
  const naar = String(ruw ?? "").trim();
  if (!isIntern(naar)) return naar;
  const knip = naar.search(/[?#]/);
  const pad = normaliseerPad(knip >= 0 ? naar.slice(0, knip) : naar);
  return knip >= 0 ? pad + naar.slice(knip) : pad;
}

export type Controle<T> = { ok: true; waarde: T } | { ok: false; fouten: string[] };

/** Leest "ja/nee", "permanent/tijdelijk", 301/302/307/308, true/false of 1/0. Leeg = permanent. */
export function leesPermanent(ruw: unknown): boolean | null {
  if (typeof ruw === "boolean") return ruw;
  const s = String(ruw ?? "").trim().toLowerCase();
  if (["", "ja", "j", "yes", "y", "true", "1", "on", "permanent", "301", "308"].includes(s)) return true;
  if (["nee", "n", "no", "false", "0", "off", "tijdelijk", "302", "303", "307"].includes(s)) return false;
  return null;
}

/**
 * Controleert één doorverwijzing (los van de andere). Geeft genormaliseerde
 * waarden terug of een lijst begrijpelijke fouten.
 */
export function valideerDoorverwijzing(ruw: { van?: unknown; naar?: unknown; permanent?: unknown }): Controle<Doorverwijzing> {
  const fouten: string[] = [];
  const vanRuw = String(ruw.van ?? "").trim();
  const naarRuw = String(ruw.naar ?? "").trim();
  const permanent = leesPermanent(ruw.permanent);

  let van = "";
  if (!vanRuw) fouten.push("Vul het oude adres in (bijv. /oude-pagina).");
  else if (!vanRuw.startsWith("/") || vanRuw.startsWith("//")) fouten.push("Het oude adres moet met één / beginnen, bijv. /oude-pagina (zonder https:// en domeinnaam).");
  else if (/[?#]/.test(vanRuw)) fouten.push("Het oude adres mag geen ? of # bevatten; alleen het pad telt.");
  else if (vanRuw.includes("\\")) fouten.push("Het oude adres mag geen \\ bevatten.");
  else {
    van = normaliseerPad(vanRuw);
    if (van === "/") fouten.push("De homepage (/) kan niet worden doorverwezen.");
    else if (isGereserveerd(van)) fouten.push(`Adressen onder ${GERESERVEERDE_VOORVOEGSELS.join(", ")} kunnen niet worden doorverwezen.`);
    else if (/\s/.test(van)) fouten.push("Het oude adres mag geen spaties bevatten.");
    else if (van.includes("\\")) fouten.push("Het oude adres mag geen \\ bevatten.");
    else if (van.length > MAX_VAN_LENGTE) fouten.push(`Het oude adres is te lang (maximaal ${MAX_VAN_LENGTE} tekens).`);
    else if (buitenProxy(van)) {
      fouten.push(
        "Adressen van afbeeldingen (.svg, .png, .jpg, .jpeg, .gif, .webp) en favicon.ico kunnen niet worden doorverwezen: de site levert die altijd direct als bestand.",
      );
    }
  }

  let naar = "";
  if (!naarRuw) fouten.push("Vul het nieuwe adres in (een pad zoals /nieuwe-pagina of een https://-adres).");
  else if (naarRuw.includes("\\")) fouten.push("Het nieuwe adres mag geen \\ bevatten.");
  else if (isIntern(naarRuw)) {
    naar = normaliseerNaar(naarRuw);
    if (/\s/.test(naar)) fouten.push("Het nieuwe adres mag geen spaties bevatten.");
    // %5C wordt bij het normaliseren een backslash.
    else if (!isIntern(naar)) fouten.push("Het nieuwe adres mag geen \\ bevatten.");
  } else if (/^https:\/\//i.test(naarRuw)) {
    try {
      const url = new URL(naarRuw);
      if (!url.hostname.includes(".")) throw new Error("geen domein");
      naar = naarRuw;
    } catch {
      fouten.push("Het nieuwe adres is geen geldig https://-adres.");
    }
  } else fouten.push("Het nieuwe adres moet met / beginnen (een pagina op deze site) of met https:// (een andere website).");
  if (naar.length > MAX_NAAR_LENGTE) fouten.push(`Het nieuwe adres is te lang (maximaal ${MAX_NAAR_LENGTE} tekens).`);

  if (van && naar && bestemmingsPad(naar) === van) fouten.push("Het oude en het nieuwe adres zijn hetzelfde.");
  if (permanent === null) fouten.push("Kies permanent of tijdelijk.");

  return fouten.length ? { ok: false, fouten } : { ok: true, waarde: { van, naar, permanent: permanent ?? true } };
}

/**
 * Een treffer op kleine letters telt niet als de bestemming het opgevraagde pad
 * zelf is: "/Over → /over" zou anders bij een bezoek aan /over eindeloos naar
 * /over sturen. (/OVER gaat wél naar /over; daar stopt het dan.)
 */
function bruikbaarOpKlein(r: Pick<Doorverwijzing, "naar">, pad: string): boolean {
  return bestemmingsPad(r.naar) !== pad;
}

/** Opzoeken zoals de proxy dat doet (zie `zoek`): eerst exact, dan op kleine letters. */
function maakOpzoeker<T extends Pick<Doorverwijzing, "van" | "naar">>(regels: readonly T[]): (pad: string) => T | undefined {
  const exact = new Map<string, T>();
  const klein = new Map<string, T>();
  for (const r of regels) {
    exact.set(r.van, r);
    const k = r.van.toLowerCase();
    if (!klein.has(k)) klein.set(k, r);
  }
  return (pad) => {
    const e = exact.get(pad);
    if (e) return e;
    const k = klein.get(pad.toLowerCase());
    return k && bruikbaarOpKlein(k, pad) ? k : undefined;
  };
}

/**
 * Volgt vanaf `start` de doorverwijzingen (maximaal `max` stappen), zoals de
 * proxy dat doet (dus ook via kleine letters). Geeft de gevolgde regels terug en
 * of er een lus is (een pad komt twee keer voor).
 */
export function volgKeten(
  regels: readonly Pick<Doorverwijzing, "van" | "naar">[],
  start: string,
  max = 10,
): { stappen: Pick<Doorverwijzing, "van" | "naar">[]; lus: boolean } {
  const opzoeken = maakOpzoeker(regels);
  const gezien = new Set<string>([start]);
  const stappen: Pick<Doorverwijzing, "van" | "naar">[] = [];
  let pad: string | null = start;
  while (pad !== null && stappen.length < max) {
    const r = opzoeken(pad);
    if (!r) break;
    stappen.push(r);
    pad = bestemmingsPad(r.naar);
    if (pad !== null && gezien.has(pad)) return { stappen, lus: true };
    if (pad !== null) gezien.add(pad);
  }
  return { stappen, lus: false };
}

/** `nieuw` toegevoegd aan `bestaande` (een regel met dezelfde van, of met `vervangtVan`, wordt vervangen). */
function metNieuw<T extends Pick<Doorverwijzing, "van" | "naar">>(bestaande: readonly T[], nieuw: T, vervangtVan?: string): T[] {
  return [...bestaande.filter((r) => r.van !== nieuw.van && r.van !== vervangtVan), nieuw];
}

/**
 * Controleert een doorverwijzing tegen de bestaande: lussen zijn een fout,
 * ketens (A → B → C) een waarschuwing, want de site volgt per bezoek één stap.
 * `vervangtVan` is de oude `van` als een bestaande regel wordt aangepast.
 */
export function controleerTegenBestaande(
  nieuw: Doorverwijzing,
  bestaande: readonly Pick<Doorverwijzing, "van" | "naar">[],
  vervangtVan?: string,
): { fouten: string[]; waarschuwingen: string[] } {
  const fouten: string[] = [];
  const waarschuwingen: string[] = [];
  const alle = metNieuw(bestaande, nieuw, vervangtVan);
  const keten = volgKeten(alle, nieuw.van);
  if (keten.lus) {
    fouten.push(
      `Dit maakt een rondje: ${[nieuw.van, ...keten.stappen.map((s) => s.naar)].join(" → ")}. Bezoekers zouden dan eindeloos worden doorgestuurd.`,
    );
    return { fouten, waarschuwingen };
  }
  if (keten.stappen.length > 1) {
    waarschuwingen.push(
      `${nieuw.naar} wordt zelf ook weer doorverwezen (${keten.stappen.map((s) => s.naar).join(" → ")}). Verwijs liever direct naar het eindadres.`,
    );
  }
  const naarHier = alle.filter((r) => r.van !== nieuw.van && bestemmingsPad(r.naar) === nieuw.van).map((r) => r.van);
  if (naarHier.length) {
    waarschuwingen.push(
      `Er verwijzen al adressen naar ${nieuw.van} (${naarHier.slice(0, 5).join(", ")}${naarHier.length > 5 ? ", …" : ""}); die gaan nu in twee stappen. Pas ze bij voorkeur aan naar het eindadres.`,
    );
  }
  return { fouten, waarschuwingen };
}

/**
 * Van-paden die in een lus zitten of erin uitkomen (lineair, ook voor duizenden
 * regels). Volgt de regels zoals de proxy (dus ook via kleine letters).
 */
export function vanInLus(regels: readonly Pick<Doorverwijzing, "van" | "naar">[]): Set<string> {
  const opzoeken = maakOpzoeker(regels);
  const status = new Map<string, "bezig" | "goed" | "lus">();
  for (const r of regels) {
    if (status.has(r.van)) continue;
    const stapel: string[] = [];
    let pad: string | null = r.van;
    let uitkomst: "goed" | "lus" = "goed";
    while (pad !== null) {
      const s = status.get(pad);
      if (s === "bezig") {
        uitkomst = "lus";
        break;
      }
      if (s) {
        uitkomst = s;
        break;
      }
      const regel = opzoeken(pad);
      if (!regel) break;
      status.set(pad, "bezig");
      stapel.push(pad);
      pad = bestemmingsPad(regel.naar);
    }
    for (const p of stapel) status.set(p, uitkomst);
  }
  // Alleen echte van-paden (niet de tussenpaden die via kleine letters liepen).
  const vanPaden = new Set(regels.map((r) => r.van));
  return new Set([...status].filter(([p, s]) => s === "lus" && vanPaden.has(p)).map(([p]) => p));
}

/** Opzoektabel voor de proxy: exact en (als terugval) op kleine letters. */
export interface Index {
  exact: Map<string, Doorverwijzing>;
  klein: Map<string, Doorverwijzing>;
}

/**
 * Bouwt de opzoektabel. Ongeldige regels (gereserveerd pad, naar zichzelf) en
 * regels die in een lus zitten worden overgeslagen, zodat een fout in de tabel
 * nooit tot een eindeloze doorverwijzing leidt.
 */
export function bouwIndex(regels: readonly Doorverwijzing[]): Index {
  const geldig: Doorverwijzing[] = [];
  for (const r of regels) {
    if (!r || typeof r.van !== "string" || typeof r.naar !== "string") continue;
    const van = normaliseerPad(r.van);
    if (van === "/" || isGereserveerd(van)) continue;
    if (!isIntern(r.naar) && !/^https?:\/\//i.test(r.naar)) continue;
    if (bestemmingsPad(r.naar) === van) continue;
    geldig.push({ van, naar: r.naar, permanent: r.permanent !== false });
  }
  // Regels in een lus vallen weg; dat kan het opzoeken op kleine letters
  // veranderen, dus opnieuw controleren tot er geen lus meer over is.
  let over = geldig;
  for (let lus = vanInLus(over); lus.size; lus = vanInLus(over)) {
    over = over.filter((r) => !lus.has(r.van));
  }
  const index: Index = { exact: new Map(), klein: new Map() };
  for (const r of over) {
    index.exact.set(r.van, r);
    const k = r.van.toLowerCase();
    if (!index.klein.has(k)) index.klein.set(k, r);
  }
  return index;
}

/**
 * Zoekt de doorverwijzing voor een (ruw of gecodeerd) pad: eerst exact, dan op
 * kleine letters (behalve als die treffer naar dit pad zelf zou sturen).
 */
export function zoek(index: Index, pathname: string): Doorverwijzing | null {
  const pad = normaliseerPad(pathname);
  if (pad === "/" || isGereserveerd(pad)) return null;
  const exact = index.exact.get(pad);
  if (exact) return exact;
  const klein = index.klein.get(pad.toLowerCase());
  return klein && bruikbaarOpKlein(klein, pad) ? klein : null;
}

/**
 * Het adres waar de bezoeker heen gaat. De query van het verzoek gaat mee als de
 * bestemming zelf geen query heeft (interne Next-parameters zoals _rsc niet).
 */
export function doelAdres(naar: string, search: string): string {
  const params = new URLSearchParams(search.startsWith("?") ? search.slice(1) : search);
  params.delete("_rsc");
  const query = params.toString();
  if (!query) return naar;
  const hekje = naar.indexOf("#");
  const zonderAnker = hekje >= 0 ? naar.slice(0, hekje) : naar;
  const anker = hekje >= 0 ? naar.slice(hekje) : "";
  if (zonderAnker.includes("?")) return naar;
  return `${zonderAnker}?${query}${anker}`;
}

/** HTTP-status: 308 (permanent) of 307 (tijdelijk); de methode blijft gelijk. */
export function statusCode(permanent: boolean): 307 | 308 {
  return permanent ? 308 : 307;
}

export type TestUitkomst =
  | { soort: "ongeldig"; pad: string }
  | { soort: "gereserveerd"; pad: string }
  | { soort: "geen"; pad: string }
  | {
      soort: "doorverwijzing";
      pad: string;
      regel: Doorverwijzing;
      doel: string;
      status: 307 | 308;
      /** Verdere stappen als het doel zelf ook wordt doorverwezen. */
      vervolg: Doorverwijzing[];
      lus: boolean;
    };

/** Wat er gebeurt bij een bezoek aan `invoer` (een pad of een volledig adres). Voor "Test een adres". */
export function testAdres(regels: readonly Doorverwijzing[], invoer: string): TestUitkomst {
  let tekst = String(invoer ?? "").trim();
  let search = "";
  if (/^https?:\/\//i.test(tekst)) {
    try {
      const url = new URL(tekst);
      tekst = url.pathname;
      search = url.search;
    } catch {
      return { soort: "ongeldig", pad: tekst };
    }
  } else {
    const vraag = tekst.indexOf("?");
    if (vraag >= 0) {
      search = tekst.slice(vraag).replace(/#.*$/, "");
      tekst = tekst.slice(0, vraag);
    }
  }
  if (!tekst) return { soort: "ongeldig", pad: tekst };
  const pad = normaliseerPad(tekst);
  if (isGereserveerd(pad)) return { soort: "gereserveerd", pad };
  const index = bouwIndex(regels);
  const regel = zoek(index, pad);
  if (!regel) return { soort: "geen", pad };
  const geldig = [...index.exact.values()];
  const verder = bestemmingsPad(regel.naar);
  const keten = verder ? volgKeten(geldig, verder, 5) : { stappen: [], lus: false };
  return {
    soort: "doorverwijzing",
    pad,
    regel,
    doel: doelAdres(regel.naar, search),
    status: statusCode(regel.permanent),
    vervolg: keten.stappen.map((s) => geldig.find((g) => g.van === s.van)!).filter(Boolean),
    lus: keten.lus,
  };
}

/** Zoekfilter voor de lijst in beheer (op van of naar, hoofdletterongevoelig). */
export function filterDoorverwijzingen<T extends Pick<Doorverwijzing, "van" | "naar">>(rijen: readonly T[], zoekterm: string): T[] {
  const q = zoekterm.trim().toLowerCase();
  if (!q) return [...rijen];
  return rijen.filter((r) => r.van.toLowerCase().includes(q) || r.naar.toLowerCase().includes(q));
}

// CSV ------------------------------------------------------------------------------

const CSV_KOLOMMEN = ["van", "naar", "permanent"] as const;
export const MAX_IMPORT_RIJEN = 2000;

export interface ImportAnalyse {
  rijen: (Doorverwijzing & { regel: number })[];
  ongeldig: { regel: number; reden: string }[];
  dubbel: number;
}

/**
 * Controleert rijen uit een CSV-bestand (cellen per rij, met regelnummer). Een
 * koprij met "van" en "naar" bepaalt de kolommen; zonder koprij gelden de
 * kolommen van, naar, permanent. Bij dubbele "van" telt de laatste rij.
 */
export function analyseerImport(rijen: readonly { regel: number; cellen: string[] }[]): ImportAnalyse {
  let kolom = { van: 0, naar: 1, permanent: 2 };
  let start = 0;
  const kop = rijen[0]?.cellen.map((c) => c.trim().toLowerCase().replace(/^﻿/, ""));
  if (kop && kop.includes("van") && kop.includes("naar")) {
    kolom = { van: kop.indexOf("van"), naar: kop.indexOf("naar"), permanent: kop.indexOf("permanent") };
    start = 1;
  }
  const perVan = new Map<string, Doorverwijzing & { regel: number }>();
  const ongeldig: ImportAnalyse["ongeldig"] = [];
  let dubbel = 0;
  for (const r of rijen.slice(start)) {
    const cel = (i: number) => (i >= 0 ? (r.cellen[i] ?? "").trim().replace(/^'(?=[=+\-@])/, "") : "");
    const v = valideerDoorverwijzing({ van: cel(kolom.van), naar: cel(kolom.naar), permanent: cel(kolom.permanent) });
    if (!v.ok) {
      ongeldig.push({ regel: r.regel, reden: v.fouten.join(" ") });
      continue;
    }
    if (perVan.has(v.waarde.van)) dubbel++;
    perVan.set(v.waarde.van, { ...v.waarde, regel: r.regel });
  }
  return { rijen: [...perVan.values()], ongeldig, dubbel };
}

/** Rijen voor de CSV-export (met koprij). */
export function exportRijen(rijen: readonly Doorverwijzing[]): string[][] {
  return [[...CSV_KOLOMMEN], ...rijen.map((r) => [r.van, r.naar, r.permanent ? "ja" : "nee"])];
}

// Automatisch bij een nieuw webadres -------------------------------------------------

/**
 * De wijzigingen in de tabel als een gepubliceerde pagina van `oud` naar `nieuw`
 * verhuist: oude adres verwijst (permanent, automatisch) naar het nieuwe,
 * verwijzingen naar het oude adres gaan direct naar het nieuwe (geen ketens) en
 * een verwijzing vanaf het nieuwe adres vervalt (daar staat nu de pagina).
 */
export function slugWijziging(oud: string, nieuw: string): { verwijderVan: string; herrichtNaar: { van: string; naar: string }; upsert: Doorverwijzing & { automatisch: true } } | null {
  const o = normaliseerPad(oud);
  const n = normaliseerPad(nieuw);
  if (o === n || o === "/" || isGereserveerd(o) || isGereserveerd(n)) return null;
  return {
    verwijderVan: n,
    herrichtNaar: { van: o, naar: n },
    upsert: { van: o, naar: n, permanent: true, automatisch: true },
  };
}
