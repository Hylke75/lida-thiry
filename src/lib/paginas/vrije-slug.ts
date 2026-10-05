import "server-only";
import { adminClient } from "@/lib/supabase/admin";

// Gedeeld door de pagina- en blogeditor: een vrije slug zoeken en een dubbele
// slug herkennen (de kolom slug is in beide tabellen uniek).

/** Postgres-fout voor een dubbele waarde (de slug is uniek). */
export function isDubbel(error: { code?: string } | null): boolean {
  return error?.code === "23505";
}

/**
 * Een slug op basis van `basis` die in `tabel` nog door geen enkele rij gebruikt
 * wordt (behalve `behalveId`). `uniek` is de pure regel van die tabel (geldig
 * maken + achtervoegsel -2, -3, … kiezen); `prefix` het aantal tekens waarop we
 * bestaande slugs voorselecteren.
 */
export async function vrijeSlugIn(
  tabel: "paginas" | "blog_berichten",
  uniek: (basis: string, bezet: readonly string[]) => string,
  prefix: number,
  basis: string,
  behalveId?: string,
): Promise<string> {
  const kandidaat = uniek(basis, []);
  let q = adminClient().from(tabel).select("slug").like("slug", `${kandidaat.slice(0, prefix)}%`).limit(1000);
  if (behalveId) q = q.neq("id", behalveId);
  const { data } = await q;
  return uniek(kandidaat, (data ?? []).map((r) => r.slug as string));
}
