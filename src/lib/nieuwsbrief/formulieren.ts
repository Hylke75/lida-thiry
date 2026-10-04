import "server-only";
import { cache } from "react";
import { adminClient } from "../supabase/admin";
import { blokkenInTekst } from "../paginas/regels";
import { FORMULIER_VELDEN, telAanmeldingen, type AanmeldRij, type Formulier, type FormulierTelling } from "./formulierregels";

/** Een actief formulier op slug (één keer per request), of null. */
export const haalActiefFormulier = cache(async (slug: string): Promise<Formulier | null> => {
  const { data, error } = await adminClient()
    .from("nb_formulieren")
    .select(FORMULIER_VELDEN)
    .eq("slug", slug)
    .eq("actief", true)
    .maybeSingle();
  if (error) throw new Error(`formulier lezen: ${error.message}`);
  return (data as Formulier | null) ?? null;
});

/** Alle formulieren, nieuwste eerst. */
export async function alleFormulieren(): Promise<Formulier[]> {
  const { data, error } = await adminClient()
    .from("nb_formulieren")
    .select(FORMULIER_VELDEN)
    .order("aangemaakt_op", { ascending: false });
  if (error) throw new Error(`formulieren lezen: ${error.message}`);
  return (data ?? []) as Formulier[];
}

export async function haalFormulier(id: string): Promise<Formulier | null> {
  const { data, error } = await adminClient().from("nb_formulieren").select(FORMULIER_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`formulier lezen: ${error.message}`);
  return (data as Formulier | null) ?? null;
}

/** Naam per formulier-id (voor "via formulier X" in het contactbeheer). */
export async function formulierNamen(): Promise<Map<string, { naam: string; slug: string }>> {
  const { data } = await adminClient().from("nb_formulieren").select("id, naam, slug");
  return new Map(((data ?? []) as { id: string; naam: string; slug: string }[]).map((f) => [f.id, { naam: f.naam, slug: f.slug }]));
}

/** Aanmeldingen per formulier (totaal, laatste 30 dagen, bevestigd). */
export async function aanmeldStatistiek(): Promise<Map<string, FormulierTelling>> {
  const supabase = adminClient();
  const rijen: AanmeldRij[] = [];
  for (let van = 0; ; van += 1000) {
    const { data, error } = await supabase
      .from("nb_contacten")
      .select("formulier_id, toestemming_op, aangemaakt_op, bevestigd_op")
      .not("formulier_id", "is", null)
      .order("id")
      .range(van, van + 999);
    if (error) throw new Error(`aanmeldingen tellen: ${error.message}`);
    rijen.push(...((data ?? []) as AanmeldRij[]));
    if (!data || data.length < 1000) break;
  }
  return telAanmeldingen(rijen);
}

export interface PaginaGebruik {
  slug: string;
  titel: string;
  status: string;
}

/**
 * Per blokcode (zoals "nieuwsbrief_zomer") de pagina's uit Beheer → Pagina's
 * waarop dat blok staat. Leeg als de pagina's niet te lezen zijn.
 */
export async function blokGebruik(): Promise<Map<string, PaginaGebruik[]>> {
  const uit = new Map<string, PaginaGebruik[]>();
  try {
    const { data, error } = await adminClient()
      .from("paginas")
      .select("slug, titel, status, inhoud")
      .ilike("inhoud", "%{nieuwsbrief%")
      .order("titel")
      .limit(500);
    if (error) return uit;
    for (const p of (data ?? []) as (PaginaGebruik & { inhoud: string })[]) {
      for (const blok of new Set(blokkenInTekst(p.inhoud))) {
        uit.set(blok, [...(uit.get(blok) ?? []), { slug: p.slug, titel: p.titel, status: p.status }]);
      }
    }
  } catch {
    // Pagina's zijn optioneel voor dit overzicht.
  }
  return uit;
}
