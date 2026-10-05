// Foutlog: pure regels (geen server- of browser-API's), zodat ze in de server,
// in de browser-rapporteur en in tests bruikbaar zijn.
//
// - schoon*: haalt persoonsgegevens en geheimen uit tekst die we opslaan
//   (e-mailadressen, tokens, querystrings, lange nummers).
// - normaliseer*: maakt van een melding een "soort" fout, zodat dezelfde fout met
//   een ander order-id of e-mailadres op één rij in de foutlog terechtkomt.

export const BRONNEN = ["server", "browser", "cron", "melding", "test"] as const;
export type FoutBron = (typeof BRONNEN)[number];

export const BRON_LABEL: Record<FoutBron, string> = {
  server: "Server",
  browser: "Browser",
  cron: "Nachtelijke taak",
  melding: "Beheermelding",
  test: "Test",
};

export function isBron(w: unknown): w is FoutBron {
  return typeof w === "string" && (BRONNEN as readonly string[]).includes(w);
}

/** Maximale lengtes van wat we opslaan (de database kapt zelf ook af). */
export const MAX_BERICHT = 2000;
export const MAX_STACK = 8000;
const MAX_PAD = 500;

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const UUID = /\b[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\b/gi;
const JWT = /\beyJ[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]{5,}\.[A-Za-z0-9_-]+/g;
const BEARER = /\b(Bearer|Basic)\s+[A-Za-z0-9._~+/=-]+/gi;
/** Sleutel=waarde voor bekende geheimen (ook in JSON: "token":"…"). */
const GEHEIM_PAAR =
  /\b((?:access_|refresh_|api_?|service_role_?)?(?:token|key|secret|password|wachtwoord|geheim|sleutel|apikey|signature))(["']?\s*[:=]\s*["']?)[^\s"'&,;)}]+/gi;
/**
 * Lange tokens: base64(url) met hoofd- én kleine letters én cijfers (zoals de
 * testlinks van klanten of sleutels als sk_live_…), of lange hex-reeksen. Namen
 * van bouwbestanden (alleen kleine letters en cijfers) blijven staan.
 */
const LANG_TOKEN =
  /(?<![A-Za-z0-9_-])(?=[A-Za-z0-9_-]*\d)(?=[A-Za-z0-9_-]*[A-Z])(?=[A-Za-z0-9_-]*[a-z])[A-Za-z0-9_-]{20,}(?![A-Za-z0-9_-])/g;
const HEX_TOKEN = /(?<![A-Za-z0-9_-])[0-9a-f]{32,}(?![A-Za-z0-9_-])/gi;
/** Querystring na een pad of URL (alles na ? tot spatie/aanhalingsteken/haakje). */
const QUERY = /(\b(?:https?:\/\/[^\s?#"'()<>]*|\/[^\s?#"'()<>]*))\?[^\s"'()<>]*/g;
/** Telefoon- en rekeningnummers e.d.: 9+ cijfers, eventueel met spaties of streepjes. */
const LANG_NUMMER = /(?<![\w:.])\+?\d(?:[ -]?\d){8,}(?![\w:])/g;
const IBAN = /\b[A-Z]{2}\d{2}[A-Z]{4}\d{6,}\b/g;

/**
 * Haalt persoonsgegevens en geheimen uit tekst die we opslaan: e-mailadressen,
 * JWT's en Bearer-tokens, geheim=waarde-paren, lange tokens (zoals de testlinks
 * van klanten), querystrings, IBAN's en lange nummers.
 */
export function schoonTekst(tekst: string): string {
  return tekst
    .replace(JWT, "[token]")
    .replace(BEARER, "$1 [token]")
    .replace(GEHEIM_PAAR, "$1$2[verborgen]")
    .replace(QUERY, "$1?[…]")
    .replace(EMAIL, "[e-mail]")
    .replace(IBAN, "[iban]")
    .replace(HEX_TOKEN, "[token]")
    .replace(LANG_TOKEN, "[token]")
    .replace(LANG_NUMMER, "[nummer]");
}

/** Een pad zonder querystring en hash, geschoond, ingekort. */
export function schoonPad(pad: string | null | undefined): string | null {
  if (typeof pad !== "string" || !pad.trim()) return null;
  let p = pad.trim();
  try {
    // Volledige URL → alleen het pad.
    if (/^https?:\/\//i.test(p)) p = new URL(p).pathname;
  } catch {
    /* geen geldige URL: gewoon schonen */
  }
  p = p.split("#")[0].split("?")[0];
  return schoonTekst(p).slice(0, MAX_PAD) || null;
}

/** Schoont willekeurige details (JSON) recursief: alle tekst gaat door schoonTekst. */
export function schoonDetails(waarde: unknown, diepte = 0): unknown {
  if (waarde == null) return null;
  if (typeof waarde === "string") return schoonTekst(waarde).slice(0, 2000);
  if (typeof waarde === "number" || typeof waarde === "boolean") return waarde;
  if (diepte > 4) return "[…]";
  if (Array.isArray(waarde)) return waarde.slice(0, 20).map((w) => schoonDetails(w, diepte + 1));
  if (typeof waarde === "object") {
    const uit: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(waarde as Record<string, unknown>).slice(0, 30)) {
      uit[k] = /token|secret|password|wachtwoord|geheim|sleutel|cookie|authorization/i.test(k)
        ? "[verborgen]"
        : schoonDetails(v, diepte + 1);
    }
    return uit;
  }
  return String(waarde).slice(0, 200);
}

/**
 * Normaliseert een foutmelding tot de "soort" fout: ids, getallen, e-mails,
 * URL-parameters en tokens worden vervangen door een vaste aanduiding.
 */
export function normaliseerBericht(bericht: string): string {
  return bericht
    .replace(JWT, "<token>")
    .replace(EMAIL, "<email>")
    .replace(UUID, "<uuid>")
    .replace(QUERY, "$1")
    .replace(LANG_TOKEN, "<token>")
    .replace(/\b[0-9a-f]{8,}\b/gi, "<hex>")
    .replace(/\d+(?:[.,]\d+)*/g, "<n>")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

/** Herkent een regel uit een stack trace (V8: "at …", Firefox/Safari: "fn@url:1:2"). */
function isFrame(regel: string): boolean {
  const r = regel.trim();
  return /^at\s/.test(r) || /@.*:\d+(:\d+)?$/.test(r);
}

/**
 * De bovenste "eigen" regel van de stack (niet uit node_modules), of anders de
 * bovenste regel überhaupt. Leeg als er geen stack is.
 */
export function bovensteFrame(stack: string | null | undefined): string {
  if (!stack) return "";
  const frames = stack.split("\n").filter(isFrame).map((r) => r.trim());
  return frames.find((f) => !/node_modules|node:internal|\(native\)|<anonymous>/.test(f)) ?? frames[0] ?? "";
}

/**
 * Een frame zonder regel-/kolomnummers, domein en bouw-hashes: zo blijft de
 * vingerafdruk gelijk na een nieuwe deploy.
 */
export function normaliseerFrame(frame: string): string {
  return frame
    .replace(/https?:\/\/[^/\s)]+/g, "")
    .replace(/\?[^\s):]*/g, "")
    .replace(/:\d+(:\d+)?/g, "")
    .replace(/[._-][0-9a-f]{6,}(?=[._-]|\b)/gi, "")
    .replace(/\b[0-9a-f]{12,}\b/gi, "")
    .replace(/\d+/g, "")
    .trim();
}

/** De tekst waarvan de vingerafdruk (hash) wordt gemaakt. */
export function vingerafdrukInvoer(bron: string, bericht: string, stack?: string | null): string {
  return [bron, normaliseerBericht(bericht), normaliseerFrame(bovensteFrame(stack))].join("\n");
}

/** Zet een gevangen waarde om naar bericht + stack. */
export function ontleedFout(fout: unknown): { bericht: string; stack: string | null; naam: string | null } {
  if (fout instanceof Error) {
    const bericht = fout.message || fout.name || "Onbekende fout";
    return { bericht, stack: fout.stack ?? null, naam: fout.name && fout.name !== "Error" ? fout.name : null };
  }
  if (typeof fout === "string") return { bericht: fout || "Onbekende fout", stack: null, naam: null };
  if (fout && typeof fout === "object") {
    const o = fout as { message?: unknown; stack?: unknown };
    if (typeof o.message === "string" && o.message) {
      return { bericht: o.message, stack: typeof o.stack === "string" ? o.stack : null, naam: null };
    }
    try {
      return { bericht: JSON.stringify(fout).slice(0, MAX_BERICHT), stack: null, naam: null };
    } catch {
      /* val door */
    }
  }
  return { bericht: String(fout), stack: null, naam: null };
}

/**
 * Ruis uit de browser die we niet opslaan: extensies, de bekende
 * ResizeObserver-melding en "Script error." (fout in een script van een ander
 * domein zonder details).
 */
export function isBrowserRuis(bericht: string, stack?: string | null, bestand?: string | null): boolean {
  const b = bericht.trim();
  if (!b) return true;
  if (/ResizeObserver loop (limit exceeded|completed with undelivered notifications)/i.test(b)) return true;
  if (/^(Uncaught )?Script error\.?$/i.test(b)) return true;
  const extensie = /(chrome|moz|safari(-web)?|ms-browser|edge)-extension:\/\//i;
  if (extensie.test(b) || extensie.test(stack ?? "") || extensie.test(bestand ?? "")) return true;
  // Bekende ruis van vertaal-/wachtwoordextensies en webviews.
  if (/__gCrWeb|__firefox__|webkit\.messageHandlers|instantSearchSDKJSBridge/i.test(`${b}\n${stack ?? ""}`)) return true;
  return false;
}

/** Drempels van het aantal waarbij we opnieuw mailen. */
const MELD_DREMPELS = [10, 100, 1000] as const;
const DAG_MS = 24 * 60 * 60 * 1000;

/** De hoogste drempel die `aantal` heeft bereikt (0 = nog geen). */
export function drempelVan(aantal: number): number {
  let d = 0;
  for (const m of MELD_DREMPELS) if (aantal >= m) d = m;
  return d;
}

export interface FoutRijStaat {
  /** Bron van de fout; browserfouten mailen pas bij een drempel (zie meldReden). */
  bron?: string;
  aantal: number;
  gemeld_op: string | null;
  details?: unknown;
}

/** Sleutel in `details` waarin we bijhouden bij welk aantal we het laatst mailden. */
export const GEMELD_BIJ = "_gemeld_bij_aantal";

function gemeldBijAantal(details: unknown): number {
  if (details && typeof details === "object" && !Array.isArray(details)) {
    const n = (details as Record<string, unknown>)[GEMELD_BIJ];
    if (typeof n === "number" && Number.isFinite(n)) return n;
  }
  return 0;
}

export type MeldReden = "nieuw" | "terug" | "drempel";

/**
 * Moet er een mail uit over deze fout (na registratie)?
 * - "nieuw": eerste keer gezien (niet voor bron "browser": dat endpoint is
 *   openbaar, dus daar alleen mailen bij een drempel);
 * - "terug": er is eerder over gemaild, daarna is de fout als opgelost gemarkeerd
 *   (dat wist gemeld_op) en nu is hij terug;
 * - "drempel": het aantal is over 10/100/1000 gegaan sinds de vorige mail, en die
 *   vorige mail is minstens 24 uur geleden.
 */
export function meldReden(rij: FoutRijStaat, nu: Date = new Date()): MeldReden | null {
  if (rij.aantal <= 1) return rij.bron === "browser" ? null : "nieuw";
  const vorige = gemeldBijAantal(rij.details);
  if (!rij.gemeld_op) {
    // Eerder gemaild en daarna als opgelost gemarkeerd (dat wist gemeld_op).
    if (vorige > 0) return "terug";
    // Nooit gemaild (bijv. twee gelijktijdige eerste meldingen): alleen bij een drempel.
    return drempelVan(rij.aantal) > 0 ? "drempel" : null;
  }
  const sinds = nu.getTime() - new Date(rij.gemeld_op).getTime();
  if (sinds < DAG_MS) return null;
  return drempelVan(rij.aantal) > drempelVan(vorige) ? "drempel" : null;
}

// Browsermeldingen ------------------------------------------------------------------

export const MAX_BROWSER_BYTES = 16 * 1024;

export interface BrowserMelding {
  bericht: string;
  stack: string | null;
  pad: string | null;
  soort: "fout" | "belofte" | "foutpagina";
  digest: string | null;
  bestand: string | null;
}

function tekstOfNull(w: unknown, max: number): string | null {
  return typeof w === "string" && w.trim() ? w.slice(0, max) : null;
}

/** Valideert de JSON die de browser-rapporteur naar /api/fouten stuurt. */
export function leesBrowserMelding(json: unknown): BrowserMelding | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const bericht = tekstOfNull(o.bericht, MAX_BERICHT);
  if (!bericht) return null;
  const soort = o.soort === "belofte" || o.soort === "foutpagina" ? o.soort : "fout";
  return {
    bericht,
    stack: tekstOfNull(o.stack, MAX_STACK),
    pad: tekstOfNull(o.pad, MAX_PAD),
    soort,
    digest: tekstOfNull(o.digest, 100),
    bestand: tekstOfNull(o.bestand, MAX_PAD),
  };
}
