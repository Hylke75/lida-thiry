// Pure regels voor het contactbeheer (zonder database): e-mail en tags
// controleren, de filters van de contactenlijst lezen en de toestemmingstekst bij
// handmatig toevoegen. Te gebruiken in de browser en op de server.

import { BRONNEN, STATUSSEN, normaliseerTag, type Bron, type ContactStatus } from "./doelgroep";
import { normaliseerEmail } from "@/lib/email";
import { TIJDZONE } from "../datum";

/** Genormaliseerd e-mailadres of null (zelfde regels als normaliseerEmail in @/lib/email). */
export function geldigEmail(email: string): string | null {
  return normaliseerEmail(email);
}

/** Tags uit vrije invoer, gescheiden door komma, puntkomma of |. Uniek, maximaal 20. */
export function ontleedTags(invoer: string): string[] {
  return [...new Set(invoer.split(/[,;|]/).map(normaliseerTag).filter(Boolean))].slice(0, 20);
}

export const PER_PAGINA = 50;

export interface ContactFilter {
  q?: string;
  status?: ContactStatus;
  tag?: string;
  bron?: Bron;
  /** Id van een aanmeldformulier (Beheer → Nieuwsbrief → Formulieren). */
  formulier?: string;
}

/** Leest de filters uit de URL; onbekende waarden vallen weg. */
export function leesFilter(p: Readonly<Record<string, string | string[] | undefined>>): ContactFilter & { pagina: number } {
  const een = (k: string) => {
    const v = p[k];
    return (Array.isArray(v) ? v[0] : v)?.trim() ?? "";
  };
  const f: ContactFilter & { pagina: number } = { pagina: 1 };
  const q = een("q").slice(0, 100);
  if (q) f.q = q;
  const status = een("status");
  if ((STATUSSEN as readonly string[]).includes(status)) f.status = status as ContactStatus;
  const tag = normaliseerTag(een("tag"));
  if (tag) f.tag = tag;
  const bron = een("bron");
  if ((BRONNEN as readonly string[]).includes(bron)) f.bron = bron as Bron;
  const formulier = een("formulier").toLowerCase();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(formulier)) f.formulier = formulier;
  const pagina = Number(een("pagina"));
  if (Number.isInteger(pagina) && pagina > 1 && pagina < 100_000) f.pagina = pagina;
  return f;
}

/** Querystring van een filter (zonder lege waarden), bijv. voor links en de export. */
export function filterQuery(f: ContactFilter & { pagina?: number }): string {
  const p = new URLSearchParams();
  if (f.q) p.set("q", f.q);
  if (f.status) p.set("status", f.status);
  if (f.tag) p.set("tag", f.tag);
  if (f.bron) p.set("bron", f.bron);
  if (f.formulier) p.set("formulier", f.formulier);
  if (f.pagina && f.pagina > 1) p.set("pagina", String(f.pagina));
  return p.toString();
}

/** Tekst letterlijk in een (i)like-patroon: % en _ zijn anders jokertekens (_ komt vaak voor in e-mailadressen). */
export function likeLetterlijk(s: string): string {
  return s.replace(/[\\%_]/g, (c) => `\\${c}`);
}

export function datumTijd(iso: string | Date): string {
  return new Date(iso).toLocaleString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIJDZONE,
  });
}

/** Toestemmingsbewijs wanneer een beheerder iemand zelf toevoegt of importeert. */
export function handmatigeToestemming(
  soort: "toegevoegd" | "geïmporteerd" | "opnieuw aangemeld",
  beheerder: string,
  op: Date = new Date(),
): string {
  const wat =
    soort === "toegevoegd"
      ? "Handmatig toegevoegd"
      : soort === "geïmporteerd"
        ? "Geïmporteerd (CSV)"
        : "Handmatig opnieuw aangemeld";
  return `${wat} door beheerder ${beheerder} op ${datumTijd(op)}: toestemming bevestigd`;
}
