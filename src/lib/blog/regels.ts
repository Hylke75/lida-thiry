// Pure regels voor de blog: slugs, leestijd, zichtbaarheid en validatie.

import { opmaakNaarTekst, parseerOpmaak } from "../inhoud/opmaak";
import { slugify } from "../slug";

export interface BlogBericht {
  id: string;
  slug: string;
  titel: string;
  samenvatting: string;
  inhoud: string;
  omslag_url: string | null;
  omslag_alt: string;
  categorie: string | null;
  tags: string[];
  status: "concept" | "gepubliceerd";
  gepubliceerd_op: string | null;
  seo_titel: string;
  seo_omschrijving: string;
  auteur: string;
  uitgelicht: boolean;
  ai_gegenereerd: boolean;
  ai_opdracht: Record<string, unknown> | null;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export const BERICHT_VELDEN =
  "id, slug, titel, samenvatting, inhoud, omslag_url, omslag_alt, categorie, tags, status, gepubliceerd_op, seo_titel, seo_omschrijving, auteur, uitgelicht, ai_gegenereerd, ai_opdracht, aangemaakt_op, bijgewerkt_op";

export function geldigeSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= 100;
}

/** Aantal woorden in de (opgemaakte) tekst. */
export function woorden(inhoud: string): number {
  const tekst = opmaakNaarTekst(inhoud).trim();
  return tekst ? tekst.split(/\s+/).length : 0;
}

/** Leestijd in minuten (ongeveer 220 woorden per minuut, minimaal 1). */
export function leestijdMinuten(inhoud: string): number {
  return Math.max(1, Math.round(woorden(inhoud) / 220));
}

export type Zichtbaarheid = "concept" | "ingepland" | "online";

export function zichtbaarheid(b: Pick<BlogBericht, "status" | "gepubliceerd_op">, nu = new Date()): Zichtbaarheid {
  if (b.status !== "gepubliceerd" || !b.gepubliceerd_op) return "concept";
  return new Date(b.gepubliceerd_op) > nu ? "ingepland" : "online";
}

/** Eerste afbeelding uit de tekst, als er geen omslagfoto is. */
export function eersteAfbeelding(inhoud: string): { url: string; alt: string } | null {
  for (const b of parseerOpmaak(inhoud)) if (b.soort === "afbeelding") return { url: b.url, alt: b.alt };
  return null;
}

/** Meta-omschrijving: de SEO-omschrijving, anders de samenvatting, anders het begin van de tekst. */
export function metaOmschrijving(b: Pick<BlogBericht, "seo_omschrijving" | "samenvatting" | "inhoud">): string {
  const bron = b.seo_omschrijving.trim() || b.samenvatting.trim() || opmaakNaarTekst(b.inhoud);
  return bron.length > 160 ? `${bron.slice(0, 157).replace(/\s+\S*$/, "")}…` : bron;
}

export function normaliseerTags(ruw: unknown): string[] {
  if (!Array.isArray(ruw)) return [];
  return [
    ...new Set(
      ruw
        .filter((t): t is string => typeof t === "string")
        .map((t) => t.trim().toLowerCase().replace(/\s+/g, " ").slice(0, 40))
        .filter(Boolean),
    ),
  ].slice(0, 15);
}

export interface BerichtInvoer {
  titel: string;
  slug: string;
  samenvatting: string;
  inhoud: string;
  omslag_url: string | null;
  omslag_alt: string;
  categorie: string | null;
  tags: string[];
  seo_titel: string;
  seo_omschrijving: string;
  auteur: string;
  uitgelicht: boolean;
}

const tekst = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "");

/** Controleert invoer uit het beheer; geeft schone waarden of foutmeldingen. */
export function valideerBericht(ruw: unknown): { ok: true; waarde: BerichtInvoer } | { ok: false; fouten: string[] } {
  const o = ruw && typeof ruw === "object" ? (ruw as Record<string, unknown>) : {};
  const fouten: string[] = [];
  const titel = tekst(o.titel, 200);
  if (!titel) fouten.push("Geef het bericht een titel.");
  const slug = tekst(o.slug, 100) || slugify(titel);
  if (!geldigeSlug(slug)) fouten.push("Het webadres mag alleen kleine letters, cijfers en streepjes bevatten.");
  const omslag = tekst(o.omslag_url, 2000) || null;
  if (omslag && !/^https:\/\//.test(omslag)) fouten.push("De omslagfoto moet een https-adres hebben.");
  const inhoud = tekst(o.inhoud, 100_000);
  const waarde: BerichtInvoer = {
    titel,
    slug,
    samenvatting: tekst(o.samenvatting, 500),
    inhoud,
    omslag_url: omslag,
    omslag_alt: tekst(o.omslag_alt, 300),
    categorie: tekst(o.categorie, 60) || null,
    tags: normaliseerTags(o.tags),
    seo_titel: tekst(o.seo_titel, 70),
    seo_omschrijving: tekst(o.seo_omschrijving, 170),
    auteur: tekst(o.auteur, 80) || "Lida Thiry",
    uitgelicht: o.uitgelicht === true,
  };
  if (omslag && !waarde.omslag_alt) fouten.push("Geef de omslagfoto een korte omschrijving (voor slechtzienden en Google).");
  return fouten.length ? { ok: false, fouten } : { ok: true, waarde };
}

/** Wat er nog ontbreekt om te publiceren. */
export function publicatieProblemen(b: Pick<BerichtInvoer, "titel" | "inhoud" | "samenvatting">): string[] {
  const p: string[] = [];
  if (!b.titel.trim()) p.push("Titel ontbreekt.");
  if (woorden(b.inhoud) < 50) p.push("De tekst is nog erg kort (minder dan 50 woorden).");
  if (/\[(aan te vullen|invullen|bron nodig|foto)[^\]]*\]/i.test(b.inhoud)) p.push("Er staan nog [invulplekken] in de tekst.");
  return p;
}
