// Planning voor het verkleinen van geüploade afbeeldingen (puur, zonder sharp),
// zodat de regels los te testen zijn. Het echte werk staat in verkleinen.ts.
//
// Per upload maken we naast het origineel (dat blijft staan) twee versies:
//   - web: hooguit 2000 px aan de lange kant, zonder EXIF/GPS-gegevens;
//   - mini: hooguit 400 px (voor overzichten en de mediabibliotheek).
// Formaat: WebP (kwaliteit 80) voor de website. Afbeeldingen voor de nieuwsbrief
// (bucket "nieuwsbrief") blijven JPG of PNG, want niet elk mailprogramma toont
// WebP; die worden alleen verkleind (tot 1200 px: een mail is 600 px breed, dus
// scherp op een retinascherm) en ontdaan van metadata.
//
// Opslag: in dezelfde bucket onder "opt/<pad van het origineel>.<ext>", bijv.
//   blog/3f2a….jpg  →  opt/blog/3f2a….jpg.webp  en  opt/blog/3f2a….jpg-400.webp
// Zo bevat het adres van elke versie "/<pad van het origineel>", en vindt
// "Waar wordt dit gebruikt?" in de mediabibliotheek ook teksten met de webversie.

export const WEB_MAX_PX = 2000;
export const MAIL_MAX_PX = 1200;
export const MINI_MAX_PX = 400;
export const WEBP_KWALITEIT = 80;
export const JPEG_KWALITEIT = 82;
const OPT_MAP = "opt";

export type DoelFormaat = "webp" | "jpeg" | "png";

/** Formaten die we kunnen verkleinen. SVG, ICO en GIF (mogelijk geanimeerd) laten we zoals ze zijn. */
const VERKLEINBAAR = new Set(["image/jpeg", "image/png", "image/webp"]);

export interface Afmetingen {
  breedte: number;
  hoogte: number;
}

/** Past binnen een vierkant van `max` px, met behoud van verhouding en zonder te vergroten. */
export function binnen(a: Afmetingen, max: number): Afmetingen {
  const lang = Math.max(a.breedte, a.hoogte);
  if (lang <= max) return { breedte: a.breedte, hoogte: a.hoogte };
  const f = max / lang;
  return { breedte: Math.max(1, Math.round(a.breedte * f)), hoogte: Math.max(1, Math.round(a.hoogte * f)) };
}

export interface Plan {
  formaat: DoelFormaat;
  mime: string;
  extensie: string;
  web: Afmetingen;
  mini: Afmetingen;
  paden: { web: string; mini: string };
}

/** Het doelformaat: WebP, behalve voor de nieuwsbrief (dan het eigen formaat; WebP wordt JPG). */
export function doelFormaat(mime: string, bucket: string): DoelFormaat {
  if (bucket !== "nieuwsbrief") return "webp";
  return mime === "image/png" ? "png" : "jpeg";
}

const EXT: Record<DoelFormaat, string> = { webp: "webp", jpeg: "jpg", png: "png" };
const MIME: Record<DoelFormaat, string> = { webp: "image/webp", jpeg: "image/jpeg", png: "image/png" };

/** Paden van de versies bij een origineel. */
export function optPaden(pad: string, formaat: DoelFormaat): { web: string; mini: string } {
  const ext = EXT[formaat];
  return { web: `${OPT_MAP}/${pad}.${ext}`, mini: `${OPT_MAP}/${pad}-${MINI_MAX_PX}.${ext}` };
}

/** Is dit pad zelf een gemaakte versie (niet opnieuw verkleinen of importeren)? */
export function isOptPad(pad: string): boolean {
  return pad === OPT_MAP || pad.startsWith(`${OPT_MAP}/`);
}

/** De mogelijke versiepaden bij een origineel (voor opruimen bij verwijderen). */
export function alleOptPaden(pad: string): string[] {
  return (Object.keys(EXT) as DoelFormaat[]).flatMap((f) => Object.values(optPaden(pad, f)));
}

/**
 * Wat er met een upload moet gebeuren, of null als we hem laten zoals hij is
 * (geen verkleinbaar type, al een versie, of onbekende afmetingen).
 * `afmetingen` zijn die van het origineel ná EXIF-rotatie.
 */
export function planVerkleining(o: { pad: string; bucket: string; mime: string; afmetingen: Afmetingen | null }): Plan | null {
  if (!VERKLEINBAAR.has(o.mime) || isOptPad(o.pad) || !o.afmetingen) return null;
  if (!(o.afmetingen.breedte > 0 && o.afmetingen.hoogte > 0)) return null;
  const formaat = doelFormaat(o.mime, o.bucket);
  return {
    formaat,
    mime: MIME[formaat],
    extensie: EXT[formaat],
    web: binnen(o.afmetingen, o.bucket === "nieuwsbrief" ? MAIL_MAX_PX : WEB_MAX_PX),
    mini: binnen(o.afmetingen, MINI_MAX_PX),
    paden: optPaden(o.pad, formaat),
  };
}

/** Afmetingen na EXIF-rotatie (oriëntatie 5–8 = gedraaid: breedte en hoogte wisselen). */
export function gedraaideAfmetingen(m: { width?: number; height?: number; orientation?: number }): Afmetingen | null {
  if (!m.width || !m.height) return null;
  return (m.orientation ?? 1) >= 5 ? { breedte: m.height, hoogte: m.width } : { breedte: m.width, hoogte: m.height };
}
