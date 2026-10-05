// Regels voor het logboek van beheeracties. Puur (testbaar).

import { vanAmsterdam } from "./datum";

export const BEWAAR_JAREN = 2;
export const PER_PAGINA = 50;

const MAX_TEKST = 500;
const MAX_LIJST = 50;
const MAX_DIEPTE = 4;
const MAX_SLEUTELS = 50;
const MAX_JSON = 8000;
const MAX_OMSCHRIJVING = 500;

/** Sleutels waarvan de waarde nooit in het logboek komt. */
const GEHEIM =
  /(wachtwoord|password|passwd|herhaling|token|secret|geheim|api[_-]?key|apikey|authorization|cookie|session|sessie|totp|qr_?code|otp|^code_?verifier$|^uri$|iban|kaartnummer|cvc|hash)/i;

/** Lange of binaire waarden (data-URL's, base64) vervangen door een korte aanduiding. */
function schoonWaarde(v: unknown, diepte: number): unknown {
  if (v == null || typeof v === "boolean") return v;
  if (typeof v === "number") return Number.isFinite(v) ? v : String(v);
  if (typeof v === "bigint") return v.toString();
  if (typeof v === "string") {
    if (/^data:[^,]*;base64,/i.test(v)) return `[data-url, ${v.length} tekens]`;
    if (v.length > 200 && /^[A-Za-z0-9+/=]+$/.test(v)) return `[binaire tekst, ${v.length} tekens]`;
    return v.length > MAX_TEKST ? `${v.slice(0, MAX_TEKST)}… (+${v.length - MAX_TEKST} tekens)` : v;
  }
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v.toISOString();
  if (typeof v === "function" || typeof v === "symbol") return undefined;
  if (diepte >= MAX_DIEPTE) return "[…]";
  if (typeof Blob !== "undefined" && v instanceof Blob) return `[bestand, ${v.size} bytes]`;
  if (v instanceof ArrayBuffer || ArrayBuffer.isView(v)) return `[binair, ${(v as ArrayBuffer).byteLength} bytes]`;
  if (Array.isArray(v)) {
    const lijst = v.slice(0, MAX_LIJST).map((x) => schoonWaarde(x, diepte + 1));
    if (v.length > MAX_LIJST) lijst.push(`… (+${v.length - MAX_LIJST})`);
    return lijst;
  }
  if (typeof v === "object") return schoonObject(v as Record<string, unknown>, diepte + 1);
  return undefined;
}

function schoonObject(o: Record<string, unknown>, diepte: number): Record<string, unknown> {
  const uit: Record<string, unknown> = {};
  let n = 0;
  for (const [k, w] of Object.entries(o)) {
    if (n >= MAX_SLEUTELS) {
      uit["…"] = `+${Object.keys(o).length - MAX_SLEUTELS} velden`;
      break;
    }
    if (GEHEIM.test(k)) {
      uit[k] = "[verborgen]";
    } else {
      const s = schoonWaarde(w, diepte);
      if (s === undefined) continue;
      uit[k] = s;
    }
    n++;
  }
  return uit;
}

/**
 * Details voor het logboek: zonder geheimen (wachtwoorden, tokens, sleutels),
 * zonder bestanden of lange teksten, beperkt in diepte en omvang. Null als er
 * niets overblijft.
 */
export function schoonDetails(details: unknown): Record<string, unknown> | null {
  if (details == null || typeof details !== "object" || Array.isArray(details)) {
    if (details == null) return null;
    const w = schoonWaarde(details, 0);
    return w === undefined ? null : { waarde: w };
  }
  let uit: Record<string, unknown>;
  try {
    uit = schoonObject(details as Record<string, unknown>, 0);
  } catch {
    return null;
  }
  if (Object.keys(uit).length === 0) return null;
  const json = JSON.stringify(uit);
  if (json.length > MAX_JSON) return { ingekort: true, begin: json.slice(0, MAX_TEKST) };
  return uit;
}

export function schoonOmschrijving(tekst: unknown): string {
  const t = typeof tekst === "string" ? tekst.replace(/\s+/g, " ").trim() : "";
  return t.length > MAX_OMSCHRIJVING ? `${t.slice(0, MAX_OMSCHRIJVING - 1)}…` : t;
}

/** De categorie van een actie: het deel vóór de punt ("order.verwijderen" → "order"). */
export function actieCategorie(actie: string): string {
  const i = actie.indexOf(".");
  return i === -1 ? actie : actie.slice(0, i);
}

export const CATEGORIE_LABEL: Record<string, string> = {
  order: "Bestellingen",
  kortingscode: "Kortingscodes",
  cadeaubon: "Cadeaubonnen",
  instellingen: "Instellingen",
  website: "Website-instellingen",
  beheerder: "Beheerders",
  beveiliging: "Beveiliging",
  pagina: "Pagina's",
  blog: "Blog",
  tekst: "Teksten",
  versie: "Versies en prullenbak",
  campagne: "Nieuwsbrief-campagnes",
  contact: "Nieuwsbrief-contacten",
  relatie: "Adresboek",
  bericht: "Berichten",
  media: "Media",
  doorverwijzing: "Doorverwijzingen",
  afspraak: "Afspraken",
  review: "Reviews",
  logboek: "Logboek",
};

/** Soorten onderwerp (voor het filter). */
export const ONDERWERP_LABEL: Record<string, string> = {
  order: "Bestelling",
  kortingscode: "Kortingscode",
  cadeaubon: "Cadeaubon",
  instellingen: "Instellingen",
  website: "Website",
  beheerder: "Beheerder",
  pagina: "Pagina",
  blog: "Blogbericht",
  tekst: "Tekst",
  campagne: "Campagne",
  contact: "Nieuwsbriefcontact",
  relatie: "Relatie",
  bericht: "Contactbericht",
  media: "Media",
  doorverwijzing: "Doorverwijzing",
  afspraak: "Afspraak",
  review: "Review",
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Link naar het onderwerp in het beheer, als dat er (nog) een heeft. */
export function onderwerpLink(soort: string | null | undefined, id: string | null | undefined): string | null {
  if (!soort || !id) return null;
  const e = encodeURIComponent(id);
  switch (soort) {
    case "order":
      return `/admin/order/${e}`;
    case "pagina":
      return UUID.test(id) ? `/admin/paginas/${e}` : null;
    case "blog":
      return UUID.test(id) ? `/admin/blog/${e}` : null;
    case "relatie":
      return UUID.test(id) ? `/admin/adresboek/${e}` : null;
    case "contact":
      return UUID.test(id) ? `/admin/nieuwsbrief/contacten/${e}` : null;
    case "campagne":
      return UUID.test(id) ? `/admin/nieuwsbrief/campagnes/${e}` : null;
    case "bericht":
      return `/admin/berichten/${e}`;
    case "afspraak":
      return `/admin/afspraken/${e}`;
    case "media":
      return `/admin/media/${e}`;
    case "tekst":
      return "/admin/teksten";
    case "kortingscode":
      return "/admin/kortingscodes";
    case "cadeaubon":
      return "/admin/cadeaubonnen";
    case "doorverwijzing":
      return "/admin/doorverwijzingen";
    case "beheerder":
      return "/admin/beheerders";
    case "instellingen":
      return "/admin/instellingen";
    case "website":
      return "/admin/website";
    case "review":
      return "/admin/reviews";
    default:
      return null;
  }
}

export interface LogFilter {
  gebruiker?: string;
  categorie?: string;
  soort?: string;
  van?: string;
  tot?: string;
  q?: string;
  pagina: number;
}

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function tekst(v: unknown, max = 100): string | undefined {
  const s = Array.isArray(v) ? v[0] : v;
  if (typeof s !== "string") return undefined;
  const t = s.trim();
  return t ? t.slice(0, max) : undefined;
}

/** Filter uit de zoekparameters van /admin/logboek (en de CSV-export). */
export function leesLogFilter(p: Record<string, string | string[] | undefined>): LogFilter {
  const van = tekst(p.van);
  const tot = tekst(p.tot);
  const categorie = tekst(p.categorie, 40);
  const soort = tekst(p.soort, 40);
  const gebruiker = tekst(p.gebruiker, 60);
  const n = Number(tekst(p.pagina) ?? "1");
  return {
    gebruiker: gebruiker && UUID.test(gebruiker) ? gebruiker : undefined,
    categorie: categorie && /^[a-z_]+$/.test(categorie) ? categorie : undefined,
    soort: soort && /^[a-z_]+$/.test(soort) ? soort : undefined,
    van: van && DATUM.test(van) ? van : undefined,
    tot: tot && DATUM.test(tot) ? tot : undefined,
    q: tekst(p.q),
    pagina: Number.isInteger(n) && n > 0 && n < 10000 ? n : 1,
  };
}

/** Zoekparameters voor een filter (voor links naar een andere pagina of de export). */
export function logFilterParams(f: LogFilter, extra: Partial<LogFilter> = {}): URLSearchParams {
  const alles = { ...f, ...extra };
  const p = new URLSearchParams();
  for (const k of ["gebruiker", "categorie", "soort", "van", "tot", "q"] as const) {
    const w = alles[k];
    if (w) p.set(k, w);
  }
  if (alles.pagina && alles.pagina > 1) p.set("pagina", String(alles.pagina));
  return p;
}

/** Begin en eind (exclusief) van het datumbereik als ISO-tijdstip, in Nederlandse tijd. */
export function datumGrenzen(f: Pick<LogFilter, "van" | "tot">): { vanaf?: string; totVoor?: string } {
  const uit: { vanaf?: string; totVoor?: string } = {};
  if (f.van) uit.vanaf = vanAmsterdam(f.van, 0).toISOString();
  if (f.tot) uit.totVoor = vanAmsterdam(f.tot, 1440).toISOString();
  return uit;
}

/** Een zoekterm veilig voor een PostgREST or()-filter met ilike (* = jokerteken); null als er niets overblijft. */
export function zoekPatroon(q: string): string | null {
  const schoon = q
    .replace(/[%*\\]/g, "")
    .replace(/[,()"':]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return schoon ? `*${schoon}*` : null;
}

/** Grens voor het bewaren: alles vóór dit moment mag weg. */
export function bewaarGrens(nu: Date = new Date(), jaren = BEWAAR_JAREN): Date {
  const d = new Date(nu.getTime());
  d.setUTCFullYear(d.getUTCFullYear() - jaren);
  return d;
}

export interface LogRij {
  id: number;
  gebruiker_id: string | null;
  email: string | null;
  actie: string;
  onderwerp_soort: string | null;
  onderwerp_id: string | null;
  omschrijving: string;
  details: unknown;
  op: string;
}

/** Rijen voor de CSV-export (met kopregel). */
export function logCsvRijen(rijen: readonly LogRij[]): string[][] {
  return [
    ["Tijdstip", "Wie", "Actie", "Onderwerp", "Onderwerp-id", "Omschrijving", "Details"],
    ...rijen.map((r) => [
      r.op,
      r.email ?? r.gebruiker_id ?? "",
      r.actie,
      r.onderwerp_soort ?? "",
      r.onderwerp_id ?? "",
      r.omschrijving,
      r.details == null ? "" : JSON.stringify(r.details),
    ]),
  ];
}
