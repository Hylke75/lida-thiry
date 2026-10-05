// Pure regels voor de mediabibliotheek (veilig in de browser én op de server).

/** Eén rij uit de tabel media. */
export interface MediaItem {
  id: string;
  bucket: string;
  pad: string;
  url: string;
  naam: string;
  alt: string;
  mime: string;
  grootte: number;
  breedte: number | null;
  hoogte: number | null;
  map: string;
  aangemaakt_op: string;
}

export const MEDIA_BUCKET = "media";
/** Buckets waarvan bestanden in de bibliotheek mogen staan (oudere uploads: blog, nieuwsbrief). */
const MEDIA_BUCKETS = ["media", "blog", "nieuwsbrief"] as const;
export type MediaBucket = (typeof MEDIA_BUCKETS)[number];

/** Gelijk aan de limiet van de bucket "media". */
export const MEDIA_MAX_BYTES = 10 * 1024 * 1024;
export const MEDIA_PER_PAGINA = 48;

const MIME_EXTENSIE: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/svg+xml": "svg",
  "image/x-icon": "ico",
  "image/vnd.microsoft.icon": "ico",
};

const EXTENSIE_MIME: Record<string, string> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  ico: "image/x-icon",
};

/**
 * Welke soorten bestanden een kiezer accepteert.
 * - foto: gewone foto's (ook geschikt voor e-mail)
 * - afbeelding: foto's plus SVG (bijv. een logo)
 * - icoon: favicon-geschikt (PNG, SVG, ICO)
 * - alle: alles wat de bibliotheek accepteert
 */
export type MediaSoort = "foto" | "afbeelding" | "icoon" | "alle";

export const SOORT_MIMES: Record<MediaSoort, readonly string[]> = {
  foto: ["image/jpeg", "image/png", "image/gif", "image/webp"],
  afbeelding: ["image/jpeg", "image/png", "image/gif", "image/webp", "image/svg+xml"],
  icoon: ["image/png", "image/svg+xml", "image/x-icon", "image/vnd.microsoft.icon"],
  alle: Object.keys(MIME_EXTENSIE),
};

export const SOORT_UITLEG: Record<MediaSoort, string> = {
  foto: "JPG, PNG, GIF of WebP",
  afbeelding: "JPG, PNG, GIF, WebP of SVG",
  icoon: "PNG, SVG of ICO",
  alle: "JPG, PNG, GIF, WebP, SVG of ICO",
};

/** Filter op type in het overzicht. */
export const TYPE_FILTERS = {
  alles: { label: "Alle typen", mimes: null },
  foto: { label: "Foto's", mimes: SOORT_MIMES.foto },
  svg: { label: "SVG", mimes: ["image/svg+xml"] },
  icoon: { label: "Iconen (ICO)", mimes: ["image/x-icon", "image/vnd.microsoft.icon"] },
} as const satisfies Record<string, { label: string; mimes: readonly string[] | null }>;
export type TypeFilter = keyof typeof TYPE_FILTERS;

export function leesTypeFilter(v: unknown): TypeFilter {
  return typeof v === "string" && v in TYPE_FILTERS ? (v as TypeFilter) : "alles";
}

export const MAP_SUGGESTIES = ["algemeen", "blog", "paginas", "nieuwsbrief", "logo"] as const;
export const STANDAARD_MAP = "algemeen";
const MAP_PATROON = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** Maakt van vrije invoer een geldige mapnaam ("Mijn Logo's" → "mijn-logos"); leeg → null. */
export function normaliseerMap(invoer: unknown): string | null {
  if (typeof invoer !== "string") return null;
  const m = invoer
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/g, "");
  return MAP_PATROON.test(m) ? m : null;
}

/** Extensie bij een MIME-type, of null als het type niet is toegestaan. */
export function extensieVoorMime(mime: string): string | null {
  return MIME_EXTENSIE[mime.toLowerCase()] ?? null;
}

/** MIME-type op basis van de bestandsnaam (voor oudere bestanden zonder metadata). */
export function mimeVoorNaam(naam: string): string | null {
  const ext = naam.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
  return ext ? (EXTENSIE_MIME[ext] ?? null) : null;
}

/** Een nette, korte bestandsnaam om te tonen (geen paden, geen vreemde tekens). */
export function schoneBestandsnaam(naam: unknown): string {
  const basis = String(naam ?? "")
    .split(/[\\/]/)
    .pop()!
    .normalize("NFC")
    .replace(/[\u0000-\u001f\u007f<>:"|?*]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (!basis || /^\.+$/.test(basis)) return "afbeelding";
  if (basis.length <= 120) return basis;
  const ext = basis.match(/(\.[a-z0-9]{1,5})$/i)?.[1] ?? "";
  return basis.slice(0, 120 - ext.length).trimEnd() + ext;
}

/** Bestandsnaam zonder extensie, met spaties: een redelijke eerste omschrijving. */
export function altUitNaam(naam: string): string {
  return naam
    .replace(/\.[a-z0-9]{1,5}$/i, "")
    .replace(/[-_]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);
}

/** Pad in de bucket "media": "<map>/<uuid>.<ext>". */
export function mediaPad(map: string, uuid: string, ext: string): string {
  return `${normaliseerMap(map) ?? STANDAARD_MAP}/${uuid}.${ext}`;
}

/** Een veilig opslagpad (geen "..", geen leading slash, alleen gangbare tekens). */
export function isVeiligPad(pad: unknown): pad is string {
  return (
    typeof pad === "string" &&
    pad.length > 0 &&
    pad.length <= 500 &&
    !pad.startsWith("/") &&
    !pad.split("/").some((d) => d === "" || d === "." || d === "..") &&
    /^[A-Za-z0-9._\-/ ()]+$/.test(pad)
  );
}

export function isMediaBucket(b: unknown): b is MediaBucket {
  return typeof b === "string" && (MEDIA_BUCKETS as readonly string[]).includes(b);
}

const SVG_MIME = "image/svg+xml";

/**
 * SVG-bestanden worden niet opgeschoond en staan in een openbare bucket; een SVG
 * kan scripts bevatten. Daarom mag alleen de eigenaar ze uploaden (andere rollen
 * kunnen wel bestaande SVG's gebruiken).
 */
export const SVG_ALLEEN_EIGENAAR = "Alleen de eigenaar kan SVG-bestanden uploaden (die kunnen code bevatten). Kies een JPG, PNG, GIF of WebP.";

export function isSvg(mime: string | null | undefined): boolean {
  return (mime ?? "").toLowerCase() === SVG_MIME;
}

/** Controle vóór het uploaden; geeft een foutmelding of null. */
export function controleerBestand(bestand: { type: string; size: number }, soort: MediaSoort = "afbeelding"): string | null {
  if (!SOORT_MIMES[soort].includes(bestand.type)) return `Dit bestandstype kan hier niet. Kies een ${SOORT_UITLEG[soort]}-bestand.`;
  if (!(bestand.size > 0)) return "Dit bestand is leeg.";
  if (bestand.size > MEDIA_MAX_BYTES) return `Het bestand is ${formatGrootte(bestand.size)}; dat is te groot (maximaal 10 MB).`;
  return null;
}

/** "834 B", "12 kB", "1,4 MB". */
export function formatGrootte(bytes: number | null | undefined): string {
  if (bytes == null) return "–";
  const b = Number(bytes);
  if (!Number.isFinite(b) || b < 0) return "–";
  if (b < 1024) return `${Math.round(b)} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} kB`;
  return `${(b / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

export function formatAfmetingen(breedte: number | null | undefined, hoogte: number | null | undefined): string | null {
  return breedte && hoogte ? `${breedte} × ${hoogte}` : null;
}

/** Markdown-opmaak om een afbeelding in een blogbericht of pagina te zetten. */
export function opmaakFragment(url: string, alt: string): string {
  const schoon = alt.replace(/[[\]\n\r]+/g, " ").replace(/\s+/g, " ").trim();
  return `![${schoon}](${url})`;
}

// Zoeken --------------------------------------------------------------------------

/** Zoekterm zonder tekens die in een PostgREST-filter iets betekenen. */
export function schoneZoekterm(q: unknown): string {
  return typeof q === "string"
    ? q
        .replace(/[%_*,()"\\]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .slice(0, 100)
    : "";
}

/** `or`-filter voor zoeken in naam en omschrijving; null bij een lege zoekterm. */
export function zoekFilter(q: unknown): string | null {
  const t = schoneZoekterm(q);
  return t ? `naam.ilike."%${t}%",alt.ilike."%${t}%"` : null;
}

// Gebruik ---------------------------------------------------------------------------

/**
 * Het deel van de openbare URL waarmee we het bestand in teksten terugvinden:
 * "/<bucket>/<pad>". Robuuster dan de hele URL (http/https, ander domein).
 */
export function gebruikZoektekst(m: { bucket: string; pad: string }): string {
  return `/${m.bucket}/${m.pad}`;
}

/** De gemaakte webversie/miniatuur staan op "/<bucket>/opt/<pad>…" (zie verkleinen-regels.ts). */
function optZoektekst(m: { bucket: string; pad: string }): string {
  return `/${m.bucket}/opt/${m.pad}`;
}

/** Escapet % en _ voor een (i)like-patroon en zet er % omheen. */
export function likePatroon(tekst: string): string {
  return `%${tekst.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}

/**
 * Like-patroon dat zowel het origineel ("/<bucket>/<pad>") als de gemaakte
 * versies ("/<bucket>/opt/<pad>…") vindt: "%/<bucket>/%<pad>%". Kan iets te veel
 * vinden (dan wordt verwijderen voorzichtig geblokkeerd), nooit te weinig.
 */
export function gebruikPatroon(m: { bucket: string; pad: string }): string {
  const esc = (t: string) => t.replace(/[\\%_]/g, (c) => `\\${c}`);
  return `%/${esc(m.bucket)}/%${esc(m.pad)}%`;
}

/** Komt de afbeelding voor in `tekst` (inhoud, JSON van blokken, instelling)? */
export function bevatVerwijzing(tekst: unknown, m: { bucket: string; pad: string }): boolean {
  if (tekst == null) return false;
  const s = typeof tekst === "string" ? tekst : JSON.stringify(tekst);
  return s.includes(gebruikZoektekst(m)) || s.includes(optZoektekst(m));
}

export interface Gebruik {
  soort: "pagina" | "blog" | "nieuwsbrief" | "tekst" | "instelling";
  titel: string;
  href: string;
}

export const GEBRUIK_LABEL: Record<Gebruik["soort"], string> = {
  pagina: "Pagina",
  blog: "Blogbericht",
  nieuwsbrief: "Nieuwsbrief",
  tekst: "Tekst",
  instelling: "Website-instelling",
};

/** Instellingen die bij de website-instellingen horen (logo, favicon, deelafbeelding). */
export const WEBSITE_BEELD_INSTELLINGEN: Record<string, string> = {
  logo_url: "Logo",
  favicon_url: "Favicon",
  deel_afbeelding_url: "Afbeelding bij delen",
};

/** Map voor een ouder bestand bij het importeren. */
export function mapVoorImport(bucket: string, pad: string): string {
  if (bucket === "nieuwsbrief") return "nieuwsbrief";
  if (bucket === "blog") return pad.startsWith("paginas/") ? "paginas" : "blog";
  return normaliseerMap(pad.split("/")[0]) ?? STANDAARD_MAP;
}

/** Mag een bestand in de bibliotheek? Verborgen/placeholder-bestanden niet. */
export function isImporteerbaar(naam: string): boolean {
  return !naam.startsWith(".") && mimeVoorNaam(naam) !== null;
}
