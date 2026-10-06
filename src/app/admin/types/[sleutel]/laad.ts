import "server-only";
import { adminClient } from "@/lib/supabase/admin";
import { beeldUrls, sorteerSleutel } from "@/lib/beeldbank";
import type { TypeKeuze } from "../KopieerSectie";
import { naarSecties, voorbeeldPaden, type SectieRij, type Type, type Veld } from "./regels";

/** Laadt het type met zijn secties (en beelden), alle types voor de navigatie en de vaste velden. Null als het type niet bestaat. */
export async function laad(sleutel: string) {
  const supabase = adminClient();
  const [typeRes, sectiesRes, alleRes, veldenRes] = await Promise.all([
    supabase
      .from("adviestypes")
      .select(
        "sleutel, letter, categorie, titel, lengte_label, maat_label, bijgewerkt_op",
      )
      .eq("sleutel", sleutel)
      .maybeSingle(),
    supabase
      .from("adviessecties")
      .select(
        "id, veld_sleutel, volgorde, kop, tekst, sectie_beelden(volgorde, beeld_id, beelden(code, naam, bijschrift, pad, thumb_pad))",
      )
      .eq("type_sleutel", sleutel)
      .order("volgorde", { ascending: true }),
    supabase.from("adviestypes").select("sleutel, titel, letter, categorie"),
    supabase
      .from("advies_velden")
      .select("sleutel, kop, volgorde, groep, hulptekst")
      .order("volgorde"),
  ]);
  const type = typeRes.data as Type | null;
  if (!type) return null;
  if (sectiesRes.error)
    throw new Error(`secties lezen: ${sectiesRes.error.message}`);

  const rijen = (sectiesRes.data ?? []) as unknown as SectieRij[];
  const urls = await beeldUrls(voorbeeldPaden(rijen));
  const secties = naarSecties(rijen, urls);
  const alle = ((alleRes.data ?? []) as TypeKeuze[]).sort(
    (a, b) => sorteerSleutel(a.sleutel) - sorteerSleutel(b.sleutel),
  );
  const velden = (veldenRes.data ?? []) as Veld[];
  return { type, secties, alle, velden };
}
