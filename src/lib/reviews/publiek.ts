import "server-only";
import { cache } from "react";
import { adminClient } from "../supabase/admin";
import { publiekClient, publiekGecached } from "../cache/publiek";
import { REVIEW_TOKEN_PATROON, reviewSamenvatting, type PubliekeReview } from "./regels";

// Reviews op de website: gecachet onder de tag "reviews" (goedkeuren in Beheer →
// Reviews vernieuwt direct). Alleen wat al publiek is: naam, sterren, tekst en
// datum van goedgekeurde reviews met toestemming; nooit e-mailadres of token.

const leesGoedgekeurd = publiekGecached("reviews", ["reviews"], async (max: number): Promise<PubliekeReview[]> => {
  const { data, error } = await publiekClient()
    .from("beoordelingen")
    .select("id, naam, sterren, tekst, ingevuld_op")
    .eq("status", "goedgekeurd")
    .eq("toestemming_publicatie", true)
    .not("tekst", "is", null)
    .not("sterren", "is", null)
    .order("ingevuld_op", { ascending: false, nullsFirst: false })
    .limit(max);
  if (error) throw error;
  return (data ?? []).map((r) => ({
    id: r.id as string,
    naam: (r.naam as string | null)?.trim() || "Klant",
    sterren: r.sterren as number,
    tekst: r.tekst as string,
    datum: (r.ingevuld_op as string | null) ?? null,
  }));
});

/**
 * Goedgekeurde reviews met toestemming voor publicatie, nieuwste eerst.
 * Geeft een lege lijst als de database niet bereikbaar is.
 */
export async function haalGoedgekeurdeReviews(max = 6): Promise<PubliekeReview[]> {
  try {
    return await leesGoedgekeurd(max);
  } catch (e) {
    console.error("Reviews laden mislukt", e);
    return [];
  }
}

const leesSamenvatting = publiekGecached("reviews-samenvatting", ["reviews"], async () => {
  const { data, error } = await publiekClient()
    .from("beoordelingen")
    .select("sterren")
    .eq("status", "goedgekeurd")
    .eq("toestemming_publicatie", true)
    .not("sterren", "is", null)
    .limit(10_000);
  if (error) throw error;
  return reviewSamenvatting((data ?? []).map((r) => r.sterren as number));
});

/**
 * Gemiddelde en aantal van de reviews die op de website mogen staan
 * (goedgekeurd, met toestemming). Voor gestructureerde gegevens (AggregateRating).
 */
export const haalReviewSamenvatting = cache(async (): Promise<{ gemiddelde: number; aantal: number }> => {
  try {
    return await leesSamenvatting();
  } catch (e) {
    console.error("Reviewsamenvatting laden mislukt", e);
    return { gemiddelde: 0, aantal: 0 };
  }
});

export interface ReviewViaToken {
  id: string;
  naam: string | null;
  sterren: number | null;
  tekst: string | null;
  toestemming_publicatie: boolean;
  status: string;
}

/** De review bij een link uit de uitnodiging; null bij een onbekende of verwijderde review. */
export async function reviewViaToken(token: string): Promise<ReviewViaToken | null> {
  if (!REVIEW_TOKEN_PATROON.test(token)) return null;
  const { data, error } = await adminClient()
    .from("beoordelingen")
    .select("id, naam, sterren, tekst, toestemming_publicatie, status, email")
    .eq("token", token)
    .maybeSingle();
  if (error) throw new Error(`Review lezen: ${error.message}`);
  // Zonder e-mailadres is de review verwijderd (alleen de koppeling met de bestelling blijft).
  if (!data || !data.email) return null;
  return {
    id: data.id as string,
    naam: data.naam as string | null,
    sterren: data.sterren as number | null,
    tekst: data.tekst as string | null,
    toestemming_publicatie: data.toestemming_publicatie === true,
    status: data.status as string,
  };
}
