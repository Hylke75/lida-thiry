"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { aiBeschikbaar, schrijfConcept, type Concept } from "@/lib/blog/ai";
import { normaliseerOpdracht, type SchrijfOpdracht } from "@/lib/blog/ai-prompt";
import { aiFoutmelding, aiLimietFout, BLOG_PAD, isDubbel, vrijeSlug } from "@/lib/blog/editor";

export type SchrijfUitkomst = { ok: false; fout: string };

async function bewaarConcept(concept: Concept, opdracht: SchrijfOpdracht, model: string): Promise<string | null> {
  const rij = {
    titel: concept.titel,
    samenvatting: concept.samenvatting,
    inhoud: concept.inhoud,
    tags: concept.tags,
    seo_titel: concept.seo_titel,
    seo_omschrijving: concept.seo_omschrijving,
    ai_gegenereerd: true,
    ai_opdracht: {
      ...opdracht,
      omslag_suggestie: concept.omslag_suggestie,
      model,
      geschreven_op: new Date().toISOString(),
    },
  };
  // Twee pogingen: bij een gelijktijdig aangemaakt bericht met dezelfde slug nog eens.
  for (let poging = 0; poging < 2; poging++) {
    const basis = poging === 0 ? concept.slug || concept.titel : `${concept.slug || concept.titel}-${Date.now().toString(36)}`;
    const { data, error } = await adminClient()
      .from("blog_berichten")
      .insert({ ...rij, slug: await vrijeSlug(basis) })
      .select("id")
      .single();
    if (data) return data.id as string;
    if (!isDubbel(error)) {
      console.error("blog: AI-concept opslaan mislukt", error);
      return null;
    }
  }
  return null;
}

/** Koppelt de gelogde 'schrijven'-regel (op id) aan het nieuwe bericht (voor het kostenoverzicht). */
async function koppelGebruik(gebruikId: number, berichtId: string) {
  const { error } = await adminClient().from("blog_ai_gebruik").update({ bericht_id: berichtId }).eq("id", gebruikId);
  if (error) throw error;
}

/** Laat de AI een concept schrijven, slaat het op en opent het in de editor. */
export async function schrijfMetAi(ruw: unknown): Promise<SchrijfUitkomst> {
  await vereisBeheerder("ai");
  if (!aiBeschikbaar()) return { ok: false, fout: "De AI-schrijfhulp is nog niet ingesteld (ANTHROPIC_API_KEY ontbreekt)." };
  const n = normaliseerOpdracht(ruw);
  if (!n.ok) return { ok: false, fout: n.fout };
  const limiet = await aiLimietFout();
  if (limiet) return { ok: false, fout: limiet };

  let resultaat: Awaited<ReturnType<typeof schrijfConcept>>;
  try {
    resultaat = await schrijfConcept(n.opdracht);
  } catch (e) {
    return { ok: false, fout: aiFoutmelding(e) };
  }
  const { concept, gebruik, gebruikId } = resultaat;

  const id = await bewaarConcept(concept, n.opdracht, gebruik.model);
  if (!id) return { ok: false, fout: "De tekst is geschreven, maar kon niet worden opgeslagen. Probeer het opnieuw." };
  if (gebruikId !== null) {
    await koppelGebruik(gebruikId, id).catch((e: unknown) => console.error("blog: AI-gebruik koppelen mislukt", e));
  }
  revalidatePath(BLOG_PAD);
  redirect(`${BLOG_PAD}/${id}?ai=1`);
}
