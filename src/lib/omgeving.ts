// Welke database gebruikt deze omgeving? Puur (krijgt de omgevingsvariabelen
// mee), zodat het te testen is. Zie docs/testomgeving.md.

export interface DatabaseOmgeving {
  VERCEL_ENV?: string;
  NEXT_PUBLIC_SUPABASE_URL?: string;
  /** Project-ref van de productiedatabase (bijv. "abcdefghijklmnopqrst"). */
  PRODUCTIE_SUPABASE_REF?: string;
  /** Of de volledige URL van de productiedatabase (alternatief voor de ref). */
  PRODUCTIE_SUPABASE_URL?: string;
}

/** Handleiding voor een aparte testdatabase. */
export const HANDLEIDING_TESTOMGEVING = "https://github.com/Hylke75/lida-thiry/blob/main/docs/testomgeving.md";

/** De project-ref uit een Supabase-URL (https://<ref>.supabase.co), anders de host. */
export function supabaseRef(url: string | null | undefined): string | null {
  if (typeof url !== "string" || !url.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9]+)\.supabase\.(co|in|net)$/);
    return m ? m[1] : host;
  } catch {
    return null;
  }
}

/** De ref van de productiedatabase, of null als die niet is ingesteld. */
export function productieRef(env: DatabaseOmgeving): string | null {
  const ref = env.PRODUCTIE_SUPABASE_REF?.trim().toLowerCase();
  if (ref) return ref;
  return supabaseRef(env.PRODUCTIE_SUPABASE_URL);
}

export type DatabaseStatus =
  /** Preview met de productiedatabase: gevaarlijk. */
  | "preview-op-productie"
  /** Preview met een andere database. */
  | "preview-apart"
  /** Preview, maar de productie-ref is niet ingesteld: niet te controleren. */
  | "preview-onbekend"
  /** Geen preview (productie of lokaal). */
  | "geen-preview";

export function databaseStatus(env: DatabaseOmgeving): DatabaseStatus {
  if (env.VERCEL_ENV !== "preview") return "geen-preview";
  const productie = productieRef(env);
  if (!productie) return "preview-onbekend";
  return supabaseRef(env.NEXT_PUBLIC_SUPABASE_URL) === productie ? "preview-op-productie" : "preview-apart";
}

export function huidigeDatabaseOmgeving(): DatabaseOmgeving {
  return {
    VERCEL_ENV: process.env.VERCEL_ENV,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    PRODUCTIE_SUPABASE_REF: process.env.PRODUCTIE_SUPABASE_REF,
    PRODUCTIE_SUPABASE_URL: process.env.PRODUCTIE_SUPABASE_URL,
  };
}
