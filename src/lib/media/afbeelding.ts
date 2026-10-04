// Regels voor het tonen van afbeeldingen met next/image (puur; ook in de browser).
//
// next/image optimaliseert alleen adressen die in next.config.ts (images.remotePatterns)
// staan: de openbare opslag van ons eigen Supabase-project, plus eigen paden
// ("/logo.png"). Andere adressen (een omslag van een andere site, een plaatje in
// een tekst) tonen we als gewone <img loading="lazy">, anders zou next/image een fout geven.

/** Pad van openbare bestanden in Supabase Storage. */
export const OPENBARE_OPSLAG = "/storage/v1/object/public/";

/** Typen die de beeldoptimalisatie mag bewerken (geen SVG/ICO/GIF: die laten we zoals ze zijn). */
const RASTER = /\.(jpe?g|png|webp|avif)$/i;

/**
 * Het remotePattern voor next.config.ts bij een Supabase-URL, of null zonder
 * (geldige) URL. Alleen openbare bestanden: ondertekende links verlopen en horen
 * niet in de beeldcache.
 */
export function opslagPatroon(supabaseUrl: string | null | undefined):
  | { protocol: "http" | "https"; hostname: string; port: string; pathname: string }
  | null {
  if (!supabaseUrl) return null;
  try {
    const u = new URL(supabaseUrl);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return { protocol: u.protocol === "https:" ? "https" : "http", hostname: u.hostname, port: u.port, pathname: `${OPENBARE_OPSLAG}**` };
  } catch {
    return null;
  }
}

/** Mag next/image dit adres optimaliseren (zie opslagPatroon)? */
export function isOptimaliseerbaar(src: string | null | undefined, supabaseUrl: string | null | undefined): boolean {
  if (!src) return false;
  // Eigen pad op de site (geen protocol-relatief "//…").
  if (src.startsWith("/") && !src.startsWith("//")) return RASTER.test(src.split(/[?#]/)[0]);
  const patroon = opslagPatroon(supabaseUrl);
  if (!patroon) return false;
  try {
    const u = new URL(src);
    return (
      u.protocol === `${patroon.protocol}:` &&
      u.hostname === patroon.hostname &&
      u.port === patroon.port &&
      u.pathname.startsWith(OPENBARE_OPSLAG) &&
      !u.search &&
      RASTER.test(u.pathname)
    );
  } catch {
    return false;
  }
}

/**
 * Bij een gemaakte versie ("…/public/<bucket>/opt/<pad>.webp" of "…-400.webp")
 * het adres van het origineel; anders het adres zelf. De verhouding is gelijk,
 * dus de afmetingen van het origineel (uit de mediabibliotheek) gelden ook hier.
 */
export function origineelUrl(url: string): string {
  const m = url.match(/^(.*\/storage\/v1\/object\/public\/[^/]+\/)opt\/(.+?)(?:-400)?\.(?:webp|jpg|png)$/);
  return m ? `${m[1]}${m[2]}` : url;
}

/** Standaard `sizes` voor een afbeelding in de tekstkolom (max-w-3xl ≈ 720 px). */
export const TEKST_SIZES = "(min-width: 768px) 720px, 100vw";
