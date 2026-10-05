import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { adminClient } from "../supabase/admin";
import { haalLichaamstypes } from "../lichaamstypes";
import {
  berekenGebruik,
  bewerkVraag,
  schrijfVraag,
  SCHRIJF_SCHEMA,
  suggestieVraag,
  SUGGESTIE_SCHEMA,
  systeemPrompt,
  type AiGebruik,
  type Bewerking,
  type SchrijfOpdracht,
} from "./ai-prompt";
import { maakSlug, normaliseerTags } from "./regels";

const AI_MODEL = "claude-opus-5-5";

export class AiFout extends Error {}

/** Of de AI-functies gebruikt kunnen worden (API-sleutel ingesteld). */
export function aiBeschikbaar(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

function client(): Anthropic {
  if (!aiBeschikbaar()) throw new AiFout("De AI-schrijfhulp is nog niet ingesteld (ANTHROPIC_API_KEY ontbreekt).");
  return new Anthropic();
}

async function systeem(): Promise<string> {
  const types = await haalLichaamstypes().catch(() => []);
  return systeemPrompt(types.map((t) => t.naam));
}

/**
 * Logt het gebruik van één aanroep (ook als het antwoord daarna onbruikbaar blijkt,
 * want ook dan is ervoor betaald en telt het mee voor de uurlimiet). Geeft het id
 * van de regel terug, of null als loggen mislukte.
 */
async function logGebruik(soort: string, g: AiGebruik, berichtId: string | null): Promise<number | null> {
  try {
    const { data, error } = await adminClient()
      .from("blog_ai_gebruik")
      .insert({
        bericht_id: berichtId,
        soort,
        model: g.model,
        invoer_tokens: g.invoer,
        uitvoer_tokens: g.uitvoer,
        kosten_dollarcent: g.kosten,
      })
      .select("id")
      .single();
    if (error) throw error;
    return (data?.id as number | undefined) ?? null;
  } catch (e) {
    console.error("AI-gebruik niet gelogd", e);
    return null;
  }
}

/**
 * Eén aanroep naar Claude. Streamt (lange teksten mogen niet tegen een time-out
 * lopen), met adaptief denken en automatische terugval bij een weigering.
 * Het gebruik wordt direct na het antwoord gelogd (vóór de controles op weigering
 * en afbreken), met het model dat het antwoord echt leverde.
 * Geeft de tekst van het antwoord, het tokengebruik en het id van de logregel terug.
 */
async function vraag(opties: {
  vraag: string;
  schema?: Record<string, unknown>;
  maxTokens: number;
  soort: string;
  berichtId: string | null;
}): Promise<{ tekst: string; gebruik: AiGebruik; gebruikId: number | null }> {
  const stream = client().beta.messages.stream({
    model: AI_MODEL,
    max_tokens: opties.maxTokens,
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      ...(opties.schema ? { format: { type: "json_schema", schema: opties.schema } } : {}),
    },
    system: await systeem(),
    messages: [{ role: "user", content: opties.vraag }],
  });

  let bericht: Anthropic.Beta.BetaMessage;
  try {
    bericht = await stream.finalMessage();
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) throw new AiFout("De AI is even te druk. Probeer het over een minuut opnieuw.");
    if (e instanceof Anthropic.AuthenticationError) throw new AiFout("De API-sleutel voor de AI klopt niet.");
    if (e instanceof Anthropic.APIConnectionError) throw new AiFout("Geen verbinding met de AI. Probeer het later opnieuw.");
    if (e instanceof Anthropic.APIError) throw new AiFout(`De AI gaf een fout (${e.status ?? "onbekend"}). Probeer het opnieuw.`);
    throw e;
  }

  const gebruik = berekenGebruik(bericht.model || AI_MODEL, bericht.usage);
  const gebruikId = await logGebruik(opties.soort, gebruik, opties.berichtId);

  if (bericht.stop_reason === "refusal") {
    throw new AiFout("De AI wilde deze opdracht niet uitvoeren. Pas de steekwoorden of wensen aan en probeer het opnieuw.");
  }
  if (bericht.stop_reason === "max_tokens") {
    throw new AiFout("Het antwoord werd te lang en is afgebroken. Kies een kortere lengte en probeer het opnieuw.");
  }
  const tekst = bericht.content
    .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
    .map((b) => b.text)
    .join("");
  return { tekst, gebruik, gebruikId };
}

function leesJson(tekst: string): Record<string, unknown> {
  try {
    const o = JSON.parse(tekst) as unknown;
    if (o && typeof o === "object" && !Array.isArray(o)) return o as Record<string, unknown>;
  } catch {
    // valt door naar de fout hieronder
  }
  throw new AiFout("Het antwoord van de AI kon niet gelezen worden. Probeer het opnieuw.");
}

const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");

export interface Concept {
  titel: string;
  slug: string;
  samenvatting: string;
  inhoud: string;
  tags: string[];
  seo_titel: string;
  seo_omschrijving: string;
  omslag_suggestie: string;
}

/** Schrijft een volledig concept op basis van steekwoorden. */
export async function schrijfConcept(
  opdracht: SchrijfOpdracht,
): Promise<{ concept: Concept; gebruik: AiGebruik; gebruikId: number | null }> {
  const { tekst, gebruik, gebruikId } = await vraag({
    vraag: schrijfVraag(opdracht),
    schema: SCHRIJF_SCHEMA,
    maxTokens: 32_000,
    soort: "schrijven",
    berichtId: null,
  });
  const o = leesJson(tekst);
  const titel = str(o.titel).slice(0, 200);
  const inhoud = str(o.inhoud);
  if (!titel || !inhoud) throw new AiFout("De AI leverde geen bruikbare tekst. Probeer het opnieuw.");
  return {
    gebruik,
    gebruikId,
    concept: {
      titel,
      slug: maakSlug(str(o.slug) || titel),
      samenvatting: str(o.samenvatting).slice(0, 500),
      inhoud,
      tags: normaliseerTags(o.tags),
      seo_titel: str(o.seo_titel).slice(0, 70),
      seo_omschrijving: str(o.seo_omschrijving).slice(0, 170),
      omslag_suggestie: str(o.omslag_suggestie).slice(0, 300),
    },
  };
}

/** Herschrijft (een deel van) de tekst volgens een vaste bewerking. */
export async function bewerkMetAi(bewerking: Bewerking, tekst: string, berichtId: string | null): Promise<string> {
  if (!tekst.trim()) throw new AiFout("Er is geen tekst om te bewerken.");
  if (tekst.length > 60_000) throw new AiFout("De tekst is te lang om in één keer te bewerken. Selecteer een deel.");
  const { tekst: nieuw } = await vraag({ vraag: bewerkVraag(bewerking, tekst), maxTokens: 32_000, soort: bewerking, berichtId });
  if (!nieuw.trim()) throw new AiFout("De AI leverde geen tekst. Probeer het opnieuw.");
  return nieuw.trim();
}

export interface Suggesties {
  titels: string[];
  samenvatting: string;
  seo_titel: string;
  seo_omschrijving: string;
  tags: string[];
}

/** Stelt titels, samenvatting, SEO-teksten en tags voor bij een bestaand bericht. */
export async function stelVoor(titel: string, inhoud: string, berichtId: string | null): Promise<Suggesties> {
  if (!inhoud.trim()) throw new AiFout("Schrijf eerst wat tekst; daarna kan de AI voorstellen doen.");
  const { tekst } = await vraag({
    vraag: suggestieVraag(titel, inhoud),
    schema: SUGGESTIE_SCHEMA,
    maxTokens: 8_000,
    soort: "suggesties",
    berichtId,
  });
  const o = leesJson(tekst);
  return {
    titels: (Array.isArray(o.titels) ? o.titels : []).map(str).filter(Boolean).slice(0, 5),
    samenvatting: str(o.samenvatting).slice(0, 500),
    seo_titel: str(o.seo_titel).slice(0, 70),
    seo_omschrijving: str(o.seo_omschrijving).slice(0, 170),
    tags: normaliseerTags(o.tags),
  };
}
