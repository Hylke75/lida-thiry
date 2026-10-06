// Pure regels voor nieuwsbrief-aanmeldformulieren (Beheer → Nieuwsbrief →
// Formulieren): invoer controleren, slugs, de teksten die het publieke formulier
// toont, de aanmeldopties voor de API en de aanmeldstatistiek. Zonder database,
// dus bruikbaar in de browser, op de server en in tests.

import { opmaakNaarTekst } from "../inhoud/opmaak";
import { blokVoorFormulier } from "../paginas/regels";
import { normaliseerTag } from "./doelgroep";

export const NAAM_VELD_MODI = ["verborgen", "optioneel", "verplicht"] as const;
export type NaamVeld = (typeof NAAM_VELD_MODI)[number];

export const NAAM_VELD_LABEL: Record<NaamVeld, string> = {
  verborgen: "Niet vragen",
  optioneel: "Optioneel",
  verplicht: "Verplicht",
};

export interface Formulier {
  id: string;
  naam: string;
  slug: string;
  titel: string;
  tekst: string;
  knop: string;
  succes_tekst: string;
  toestemming_tekst: string;
  naam_veld: NaamVeld;
  tags: string[];
  dubbele_opt_in: boolean;
  eigen_pagina: boolean;
  actief: boolean;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export const FORMULIER_VELDEN =
  "id, naam, slug, titel, tekst, knop, succes_tekst, toestemming_tekst, naam_veld, tags, dubbele_opt_in, eigen_pagina, actief, aangemaakt_op, bijgewerkt_op";

/** De velden die de beheerder invult. */
export type FormulierInvoer = Omit<Formulier, "id" | "aangemaakt_op" | "bijgewerkt_op">;

export const MAX = {
  naam: 100,
  slug: 60,
  titel: 150,
  tekst: 2_000,
  knop: 60,
  succes_tekst: 500,
  toestemming_tekst: 1_000,
  tags: 10,
} as const;

export const STANDAARD_FORMULIER: FormulierInvoer = {
  naam: "",
  slug: "",
  titel: "Blijf op de hoogte",
  tekst: "Ontvang af en toe stijltips en inspiratie voor je garderobe in je mailbox.",
  knop: "Aanmelden",
  succes_tekst: "Bijna klaar! Check je mailbox en bevestig je aanmelding.",
  toestemming_tekst: "",
  naam_veld: "optioneel",
  tags: [],
  dubbele_opt_in: true,
  eigen_pagina: true,
  actief: true,
};

/** Paden onder /nieuwsbrief/ die al een eigen pagina hebben. */
export const GERESERVEERDE_FORMULIER_SLUGS = new Set(["bevestig", "afmelden", "aanmelden", "formulier"]);

export function geldigeFormulierSlug(slug: string): boolean {
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX.slug && !GERESERVEERDE_FORMULIER_SLUGS.has(slug);
}

/** Een vrije slug voor een kopie: "zomer-kopie", anders "zomer-kopie-2", enz. */
export function kopieSlug(slug: string, bestaand: readonly string[]): string {
  const basis = `${slug.slice(0, MAX.slug - 9).replace(/-+$/g, "")}-kopie`;
  const bezet = new Set(bestaand);
  if (!bezet.has(basis)) return basis;
  for (let i = 2; ; i++) {
    const kandidaat = `${basis}-${i}`;
    if (!bezet.has(kandidaat)) return kandidaat;
  }
}

/** De blokcode om dit formulier op een pagina te zetten, bijv. "{nieuwsbrief_zomer_actie}". */
export function blokCode(slug: string): string {
  return `{${blokVoorFormulier(slug)}}`;
}

const tekstVeld = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n/g, "\n").trim().slice(0, max) : "");

/**
 * Controleert de invoer uit het beheerformulier (onbetrouwbaar). Tags mogen een
 * lijst zijn of tekst met komma's. Geeft de schone waarden of de fouten.
 */
export function valideerFormulier(
  ruw: Readonly<Record<string, unknown>>,
): { ok: true; waarden: FormulierInvoer } | { ok: false; fouten: string[] } {
  const fouten: string[] = [];
  const naam = tekstVeld(ruw.naam, MAX.naam);
  const slug = tekstVeld(ruw.slug, 200).toLowerCase();
  const knop = tekstVeld(ruw.knop, MAX.knop);
  const succes = tekstVeld(ruw.succes_tekst, MAX.succes_tekst);
  const naamVeld = (NAAM_VELD_MODI as readonly string[]).includes(String(ruw.naam_veld)) ? (ruw.naam_veld as NaamVeld) : null;
  const tagLijst = Array.isArray(ruw.tags)
    ? ruw.tags.filter((t): t is string => typeof t === "string")
    : typeof ruw.tags === "string"
      ? ruw.tags.split(/[,;|]/)
      : [];
  const tags = [...new Set(tagLijst.map(normaliseerTag).filter(Boolean))];
  const ja = (v: unknown) => v === true || v === "on" || v === "true" || v === "1";

  if (!naam) fouten.push("Geef het formulier een naam.");
  if (!slug) fouten.push("Vul een slug in (het laatste deel van het webadres).");
  else if (slug.length > MAX.slug) fouten.push(`De slug mag maximaal ${MAX.slug} tekens lang zijn.`);
  else if (GERESERVEERDE_FORMULIER_SLUGS.has(slug)) fouten.push(`De slug ‘${slug}’ is al in gebruik door de website. Kies een andere.`);
  else if (!geldigeFormulierSlug(slug)) {
    fouten.push("De slug mag alleen kleine letters, cijfers en losse streepjes bevatten (bijv. ‘zomer-actie’).");
  }
  if (!knop) fouten.push("Vul een knoptekst in.");
  if (!succes) fouten.push("Vul de melding na aanmelden in.");
  if (!naamVeld) fouten.push("Kies of het naamveld getoond wordt.");
  if (tags.length > MAX.tags) fouten.push(`Gebruik maximaal ${MAX.tags} tags.`);
  for (const [veld, label] of [
    ["tekst", "De tekst"],
    ["toestemming_tekst", "De toestemmingstekst"],
    ["titel", "De titel"],
  ] as const) {
    if (typeof ruw[veld] === "string" && (ruw[veld] as string).trim().length > MAX[veld]) {
      fouten.push(`${label} mag maximaal ${MAX[veld].toLocaleString("nl-NL")} tekens lang zijn.`);
    }
  }
  if (fouten.length || !naamVeld) return { ok: false, fouten };

  return {
    ok: true,
    waarden: {
      naam,
      slug,
      titel: tekstVeld(ruw.titel, MAX.titel),
      tekst: tekstVeld(ruw.tekst, MAX.tekst),
      knop,
      succes_tekst: succes,
      toestemming_tekst: tekstVeld(ruw.toestemming_tekst, MAX.toestemming_tekst),
      naam_veld: naamVeld,
      tags,
      dubbele_opt_in: ja(ruw.dubbele_opt_in),
      eigen_pagina: ja(ruw.eigen_pagina),
      actief: ja(ruw.actief),
    },
  };
}

// Publieke weergave -------------------------------------------------------------------

/** De standaardteksten uit Teksten → Nieuwsbrief → Aanmeldblok die een formulier aanvult. */
export interface StandaardAanmeldTeksten {
  naam_label: string;
  email_label: string;
  fout: string;
  toestemming_tekst: string;
}

/** Wat het publieke formulier toont; tekst en toestemming zijn nog opmaak. */
export interface FormulierTeksten {
  titel: string;
  tekst: string;
  naamVeld: NaamVeld;
  naamLabel: string;
  emailLabel: string;
  knop: string;
  succes: string;
  fout: string;
  toestemming: string;
}

/** Het label bij het naamveld: zonder "(optioneel)" als het veld verplicht is. */
export function naamLabel(standaard: string, modus: NaamVeld): string {
  if (modus !== "verplicht") return standaard;
  return standaard.replace(/\s*\((optioneel|niet verplicht)\)\s*/i, " ").trim() || "Voornaam";
}

/** De toestemmingstekst van een formulier, of de standaardtekst als die leeg is. */
function toestemmingVan(f: Pick<Formulier, "toestemming_tekst">, standaard: string): string {
  return f.toestemming_tekst.trim() || standaard;
}

export function formulierTeksten(
  f: Pick<Formulier, "titel" | "tekst" | "naam_veld" | "knop" | "succes_tekst" | "toestemming_tekst">,
  standaard: StandaardAanmeldTeksten,
): FormulierTeksten {
  return {
    titel: f.titel,
    tekst: f.tekst,
    naamVeld: f.naam_veld,
    naamLabel: naamLabel(standaard.naam_label, f.naam_veld),
    emailLabel: standaard.email_label,
    knop: f.knop || "Aanmelden",
    succes: f.succes_tekst,
    fout: standaard.fout,
    toestemming: toestemmingVan(f, standaard.toestemming_tekst),
  };
}

// Aanmelden via de API ---------------------------------------------------------------

export interface AanmeldOpties {
  naam: string | null;
  toestemmingTekst: string;
  dubbeleOptIn: boolean;
  tags: string[];
  formulierId: string | null;
}

/**
 * Bepaalt hoe een aanmelding wordt verwerkt. Zonder formulier: het standaard
 * aanmeldblok (dubbele opt-in, toestemmingstekst uit Teksten, ongewijzigd gedrag).
 * Met formulier: de instellingen van dat formulier; een verplichte naam moet
 * ingevuld zijn en bij een verborgen naamveld wordt een naam genegeerd. De
 * toestemmingstekst wordt dan als platte tekst opgeslagen.
 */
export function aanmeldOpties(
  formulier: Pick<Formulier, "id" | "naam_veld" | "toestemming_tekst" | "dubbele_opt_in" | "tags"> | null,
  naamInvoer: string,
  standaardToestemming: string,
): { ok: true; opties: AanmeldOpties } | { ok: false; fout: string } {
  const naam = naamInvoer.trim().slice(0, 120);
  if (!formulier) {
    return {
      ok: true,
      opties: { naam: naam || null, toestemmingTekst: standaardToestemming, dubbeleOptIn: true, tags: [], formulierId: null },
    };
  }
  if (formulier.naam_veld === "verplicht" && !naam) return { ok: false, fout: "Vul je naam in." };
  return {
    ok: true,
    opties: {
      naam: formulier.naam_veld === "verborgen" ? null : naam || null,
      toestemmingTekst: opmaakNaarTekst(toestemmingVan(formulier, standaardToestemming)).trim(),
      dubbeleOptIn: formulier.dubbele_opt_in,
      tags: [...new Set(formulier.tags.map(normaliseerTag).filter(Boolean))],
      formulierId: formulier.id,
    },
  };
}

/** Een formulier-slug uit de aanvraag: undefined = geen formulier, null = ongeldig. */
export function leesFormulierSlug(v: unknown): string | null | undefined {
  if (v === undefined || v === null || v === "") return undefined;
  if (typeof v !== "string") return null;
  const slug = v.trim().toLowerCase();
  return /^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug) && slug.length <= MAX.slug ? slug : null;
}

// Statistiek -------------------------------------------------------------------------

export interface AanmeldRij {
  formulier_id: string | null;
  toestemming_op: string | null;
  aangemaakt_op: string;
  bevestigd_op: string | null;
}

export interface FormulierTelling {
  totaal: number;
  /** Aanmeldingen in de laatste 30 dagen. */
  recent: number;
  /** Bevestigd na de (laatste) aanmelding. */
  bevestigd: number;
}

const DAG_MS = 24 * 60 * 60 * 1000;

/** Aanmeldingen per formulier: totaal, laatste 30 dagen en hoeveel er bevestigd zijn. */
export function telAanmeldingen(rijen: readonly AanmeldRij[], nu: Date = new Date()): Map<string, FormulierTelling> {
  const grens = nu.getTime() - 30 * DAG_MS;
  const uit = new Map<string, FormulierTelling>();
  for (const r of rijen) {
    if (!r.formulier_id) continue;
    const t = uit.get(r.formulier_id) ?? { totaal: 0, recent: 0, bevestigd: 0 };
    const moment = new Date(r.toestemming_op ?? r.aangemaakt_op).getTime();
    t.totaal++;
    if (moment >= grens) t.recent++;
    if (r.bevestigd_op && new Date(r.bevestigd_op).getTime() >= moment - 1000) t.bevestigd++;
    uit.set(r.formulier_id, t);
  }
  return uit;
}

/** "75%" of "—" als er nog niemand is. */
export function bevestigdPercentage(t: FormulierTelling | undefined): string {
  if (!t || t.totaal === 0) return "—";
  return `${Math.round((t.bevestigd / t.totaal) * 100)}%`;
}
