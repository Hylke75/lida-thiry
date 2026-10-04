// Pure regels voor de versiegeschiedenis: momentopnames maken, beslissen of een
// nieuwe versie nodig is, en een versie als leesbare tekst tonen (voor de
// vergelijking). Geen database of netwerk.

import type { Pagina } from "../paginas/beheer";
import type { BlogBericht } from "../blog/regels";
import { combineer, type Sectie } from "../inhoud/schema";

export type VersieSoort = "pagina" | "blog" | "tekst";

export const VERSIE_SOORTEN: readonly VersieSoort[] = ["pagina", "blog", "tekst"];

/** Hoeveel versies per pagina/bericht/tekst bewaard blijven. */
export const MAX_VERSIES = 50;

/** Opslaan binnen dit venster (door dezelfde persoon) maakt geen nieuwe versie. */
export const SAMENVOEG_MS = 5 * 60 * 1000;

export interface VersieRij {
  id: string;
  soort: VersieSoort;
  ref: string;
  inhoud: unknown;
  omschrijving: string;
  gemaakt_door: string | null;
  op: string;
}

export type VersieMeta = Omit<VersieRij, "inhoud">;

export function isVersieSoort(s: unknown): s is VersieSoort {
  return typeof s === "string" && (VERSIE_SOORTEN as readonly string[]).includes(s);
}

// Vergelijken ---------------------------------------------------------------------------

/** JSON met gesorteerde sleutels: dezelfde inhoud geeft altijd dezelfde tekst. */
export function stabielJson(waarde: unknown): string {
  return JSON.stringify(sorteerSleutels(waarde)) ?? "null";
}

function sorteerSleutels(w: unknown): unknown {
  if (Array.isArray(w)) return w.map((x) => (x === undefined ? null : sorteerSleutels(x)));
  if (w && typeof w === "object") {
    const uit: Record<string, unknown> = {};
    for (const k of Object.keys(w).sort()) {
      const v = (w as Record<string, unknown>)[k];
      if (v !== undefined) uit[k] = sorteerSleutels(v);
    }
    return uit;
  }
  return w;
}

export type VersieBesluit = "toevoegen" | "overslaan-gelijk" | "overslaan-samenvoegen";

/**
 * Moet er een nieuwe versie bij? Niet als de inhoud gelijk is aan de laatste
 * versie. En ook niet als dezelfde persoon minder dan 5 minuten geleden al een
 * versie maakte (snel na elkaar opslaan = één bewerkronde): de oudste
 * momentopname van die ronde (de toestand vóór de ronde) blijft dan bewaard,
 * want een momentopname wordt gemaakt vóórdat er wordt opgeslagen.
 * `forceer` (terugzetten, verwijderen) slaat alleen gelijke inhoud over.
 */
export function beslisVersie(
  laatste: Pick<VersieRij, "inhoud" | "gemaakt_door" | "op"> | null,
  nieuw: { inhoud: unknown; door: string | null },
  nu: Date = new Date(),
  forceer = false,
): VersieBesluit {
  if (!laatste) return "toevoegen";
  if (stabielJson(laatste.inhoud) === stabielJson(nieuw.inhoud)) return "overslaan-gelijk";
  if (forceer) return "toevoegen";
  const leeftijd = nu.getTime() - new Date(laatste.op).getTime();
  if (laatste.gemaakt_door && laatste.gemaakt_door === nieuw.door && leeftijd >= 0 && leeftijd < SAMENVOEG_MS) {
    return "overslaan-samenvoegen";
  }
  return "toevoegen";
}

// Momentopnames -------------------------------------------------------------------------

export const PAGINA_SNAPSHOT_VELDEN = [
  "titel",
  "slug",
  "intro",
  "inhoud",
  "omslag_url",
  "omslag_alt",
  "status",
  "in_menu",
  "in_footer",
  "menu_label",
  "volgorde",
  "seo_titel",
  "seo_omschrijving",
  "niet_indexeren",
] as const satisfies readonly (keyof Pagina)[];

export const BLOG_SNAPSHOT_VELDEN = [
  "titel",
  "slug",
  "samenvatting",
  "inhoud",
  "omslag_url",
  "omslag_alt",
  "categorie",
  "tags",
  "status",
  "gepubliceerd_op",
  "seo_titel",
  "seo_omschrijving",
  "auteur",
  "uitgelicht",
  "ai_gegenereerd",
  "ai_opdracht",
] as const satisfies readonly (keyof BlogBericht)[];

export type PaginaSnapshot = Pick<Pagina, (typeof PAGINA_SNAPSHOT_VELDEN)[number]>;
export type BlogSnapshot = Pick<BlogBericht, (typeof BLOG_SNAPSHOT_VELDEN)[number]>;
/** Een tekstsectie: de opgeslagen aanpassing, of null = de standaardtekst. */
export interface TekstSnapshot {
  waarde: Record<string, unknown> | null;
}

function kies<T extends object, K extends keyof T>(bron: T, velden: readonly K[]): Pick<T, K> {
  const uit = {} as Pick<T, K>;
  for (const k of velden) uit[k] = bron[k];
  return uit;
}

/** De inhoud van een pagina zonder id en tijdstempels (die veranderen bij elke opslag). */
export const paginaSnapshot = (p: Pagina): PaginaSnapshot => kies(p, PAGINA_SNAPSHOT_VELDEN);
export const blogSnapshot = (b: BlogBericht): BlogSnapshot => kies(b, BLOG_SNAPSHOT_VELDEN);
export const tekstSnapshot = (waarde: unknown): TekstSnapshot => ({
  waarde: waarde && typeof waarde === "object" && !Array.isArray(waarde) ? (waarde as Record<string, unknown>) : null,
});

/** Leest een opgeslagen momentopname terug (onbekende of kapotte velden worden leeg). */
export function leesSnapshot(inhoud: unknown): Record<string, unknown> {
  return inhoud && typeof inhoud === "object" && !Array.isArray(inhoud) ? (inhoud as Record<string, unknown>) : {};
}

/** Een standaard-omschrijving voor een momentopname van de opgeslagen toestand. */
export function omschrijvingVoor(snapshot: { status?: unknown }): string {
  return snapshot.status === "gepubliceerd" ? "Gepubliceerd" : "Opgeslagen";
}

// Als tekst (voor de vergelijking) ------------------------------------------------------

const s = (v: unknown) => (v === null || v === undefined ? "" : String(v));
const janee = (v: unknown) => (v === true ? "ja" : "nee");

function blok(label: string, waarde: string): string[] {
  if (!waarde.includes("\n")) return [`${label}: ${waarde}`];
  return [`${label}:`, ...waarde.split("\n")];
}

/** Een pagina-momentopname als regels tekst. */
export function paginaAlsTekst(inhoud: unknown): string {
  const p = leesSnapshot(inhoud);
  return [
    ...blok("Titel", s(p.titel)),
    `Webadres: /${s(p.slug)}`,
    `Status: ${p.status === "gepubliceerd" ? "online" : "concept"}`,
    ...blok("Intro", s(p.intro)),
    "",
    "--- Tekst ---",
    ...s(p.inhoud).split("\n"),
    "--- Einde tekst ---",
    "",
    `Omslagfoto: ${s(p.omslag_url)}`,
    `Omschrijving foto: ${s(p.omslag_alt)}`,
    `In het menu: ${janee(p.in_menu)}`,
    `In de footer: ${janee(p.in_footer)}`,
    `Naam in het menu: ${s(p.menu_label)}`,
    `Volgorde: ${s(p.volgorde)}`,
    `SEO-titel: ${s(p.seo_titel)}`,
    `SEO-omschrijving: ${s(p.seo_omschrijving)}`,
    `Niet tonen in Google: ${janee(p.niet_indexeren)}`,
  ].join("\n");
}

/** Een blog-momentopname als regels tekst. */
export function blogAlsTekst(inhoud: unknown): string {
  const b = leesSnapshot(inhoud);
  const tags = Array.isArray(b.tags) ? b.tags.map(String).join(", ") : "";
  return [
    ...blok("Titel", s(b.titel)),
    `Webadres: /blog/${s(b.slug)}`,
    `Status: ${b.status === "gepubliceerd" ? `gepubliceerd (${s(b.gepubliceerd_op)})` : "concept"}`,
    ...blok("Samenvatting", s(b.samenvatting)),
    "",
    "--- Tekst ---",
    ...s(b.inhoud).split("\n"),
    "--- Einde tekst ---",
    "",
    `Omslagfoto: ${s(b.omslag_url)}`,
    `Omschrijving foto: ${s(b.omslag_alt)}`,
    `Categorie: ${s(b.categorie)}`,
    `Tags: ${tags}`,
    `Auteur: ${s(b.auteur)}`,
    `Uitgelicht: ${janee(b.uitgelicht)}`,
    `SEO-titel: ${s(b.seo_titel)}`,
    `SEO-omschrijving: ${s(b.seo_omschrijving)}`,
  ].join("\n");
}

/** Een tekstsectie-momentopname als regels tekst (met de standaardtekst aangevuld). */
export function tekstAlsTekst(sectie: Sectie, inhoud: unknown): string {
  const snap = leesSnapshot(inhoud);
  const waarden = combineer(sectie, snap.waarde) as Record<string, unknown>;
  const regels: string[] = [snap.waarde ? "(eigen tekst)" : "(standaardtekst)"];
  for (const [k, veld] of Object.entries(sectie.velden)) {
    const w = waarden[k];
    if (veld.soort === "lijst") {
      const items = Array.isArray(w) ? (w as Record<string, unknown>[]) : [];
      regels.push(`${veld.label}: ${items.length} ${veld.itemNaam}`);
      items.forEach((item, i) => {
        for (const [v, def] of Object.entries(veld.velden)) regels.push(...blok(`  ${i + 1}. ${def.label}`, s(item[v])));
      });
    } else {
      regels.push(...blok(veld.label, s(w)));
    }
  }
  return regels.join("\n");
}

/** Korte naam van wat er in een momentopname staat (titel), voor de prullenbak. */
export function snapshotTitel(inhoud: unknown): string {
  return s(leesSnapshot(inhoud).titel).trim() || "(zonder titel)";
}
