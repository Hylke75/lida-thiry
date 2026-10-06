// Pure regels voor verkoop en bestelbeheer: instellingen lezen (btw, productnaam,
// betaalomschrijving, termijnen), terugbetalingen, handmatige bestellingen en het
// wijzigen van een bestelling. Geen database of netwerk, zodat alles los te testen is.

import { euroNaarCent, FACTUURVELDEN, schoonFactuurgegevens } from "../prijs";
import { geldigEmail } from "../email";
import { TESTLINK_ZICHTBAAR_UREN } from "../order-status";
import { leesDatum } from "../datum";

export type Uitkomst<T> = { ok: true; waarde: T } | { ok: false; fout: string };

// Instellingen ----------------------------------------------------------------------

/** Sleutels (tabel instellingen) met hun standaardwaarde (zoals vóór deze instellingen). */
export const VERKOOP_STANDAARD = {
  btw_procent: "21",
  product_naam: "Persoonlijke kledingadviestest",
  betaling_omschrijving: "Kledingadviestest – Lida Thiry",
  betaalherinnering_max_dagen: "7",
  betaalherinnering_link_dagen: "7",
  review_max_dagen: "60",
  testlink_zichtbaar_uren: String(TESTLINK_ZICHTBAAR_UREN),
} as const;

export type VerkoopSleutel = keyof typeof VERKOOP_STANDAARD;

/** Heel getal uit een instelling, begrensd; leeg of ongeldig = de standaard. */
export function leesGeheelGetal(waarde: string | null | undefined, standaard: number, min: number, max: number): number {
  const t = (waarde ?? "").trim();
  if (!/^\d+$/.test(t)) return standaard;
  return Math.min(Math.max(Number(t), min), max);
}

/** Btw-tarief in hele procenten (0 mag, bijv. bij de kleineondernemersregeling). */
export function leesBtwProcent(waarde: string | null | undefined): number {
  return leesGeheelGetal(waarde, Number(VERKOOP_STANDAARD.btw_procent), 0, 99);
}

/** Productnaam in mails, op de factuur en in de gestructureerde gegevens. */
export function leesProductNaam(waarde: string | null | undefined): string {
  return (waarde ?? "").trim().slice(0, 120) || VERKOOP_STANDAARD.product_naam;
}

/** Mollie staat hooguit 255 tekens toe in de omschrijving. */
const MAX_OMSCHRIJVING = 255;

/**
 * Omschrijving van de Mollie-betaling (zichtbaar op het bankafschrift van de
 * klant). Voor een cadeaubon komt er "Cadeaubon" voor; begint de omschrijving met
 * een gewoon woord ("Kledingadviestest …"), dan met een kleine letter erachter.
 */
export function betaalOmschrijving(waarde: string | null | undefined, soort: "test" | "cadeaubon" = "test"): string {
  const basis = (waarde ?? "").replace(/\s+/g, " ").trim() || VERKOOP_STANDAARD.betaling_omschrijving;
  if (soort === "test") return basis.slice(0, MAX_OMSCHRIJVING);
  const gewoonWoord = /^[A-Z][a-zà-ÿ]/.test(basis);
  const rest = gewoonWoord ? basis.charAt(0).toLowerCase() + basis.slice(1) : basis;
  return `Cadeaubon ${rest}`.slice(0, MAX_OMSCHRIJVING);
}

export interface VerkoopTijden {
  /** Bestellingen ouder dan dit krijgen geen betaalherinnering meer. */
  herinneringMaxDagen: number;
  /** Zo lang blijft de link in de betaalherinnering geldig. */
  herinneringLinkDagen: number;
  /** Afgerond langer geleden dan dit: geen automatische reviewuitnodiging. */
  reviewMaxDagen: number;
  /** Zo lang na betalen toont de bedankpagina de testlink. */
  testlinkZichtbaarUren: number;
}

/** De termijnen uit de instellingen (ongeldig of leeg = de standaard). */
export function leesVerkoopTijden(inst: Readonly<Record<string, string | null | undefined>>): VerkoopTijden {
  return {
    herinneringMaxDagen: leesGeheelGetal(inst.betaalherinnering_max_dagen, 7, 2, 60),
    herinneringLinkDagen: leesGeheelGetal(inst.betaalherinnering_link_dagen, 7, 1, 60),
    reviewMaxDagen: leesGeheelGetal(inst.review_max_dagen, 60, 14, 365),
    testlinkZichtbaarUren: leesGeheelGetal(inst.testlink_zichtbaar_uren, TESTLINK_ZICHTBAAR_UREN, 0, 72),
  };
}

// Terugbetalen ----------------------------------------------------------------------

export interface Terugbetaling {
  /** Nu terug te betalen (centen). */
  bedragCent: number;
  /** Totaal terugbetaald na deze terugbetaling. */
  nieuwTotaalCent: number;
  /** Is daarmee het hele betaalde bedrag terugbetaald? */
  volledig: boolean;
}

/**
 * Bepaalt en controleert een terugbetaling: het volledige restbedrag, of een
 * ingevoerd deelbedrag (in euro's) dat niet hoger is dan wat nog terug kan.
 */
export function bepaalTerugbetaling(o: {
  betaaldCent: number;
  alTerugCent: number;
  volledig: boolean;
  invoer?: string | null;
}): Uitkomst<Terugbetaling> {
  const betaald = Math.max(0, Math.round(o.betaaldCent));
  const al = Math.max(0, Math.round(o.alTerugCent));
  const rest = betaald - al;
  if (betaald <= 0) return { ok: false, fout: "Er is niets betaald, dus er valt niets terug te betalen." };
  if (rest <= 0) return { ok: false, fout: "Dit bedrag is al volledig terugbetaald." };
  let bedrag: number;
  if (o.volledig) {
    bedrag = rest;
  } else {
    const c = euroNaarCent(o.invoer ?? "");
    if (c === null || c <= 0) return { ok: false, fout: "Vul een geldig bedrag in, bijvoorbeeld 10 of 12,50." };
    if (c > rest) {
      return { ok: false, fout: `Je kunt hooguit ${(rest / 100).toFixed(2).replace(".", ",")} euro terugbetalen.` };
    }
    bedrag = c;
  }
  const nieuwTotaal = al + bedrag;
  return { ok: true, waarde: { bedragCent: bedrag, nieuwTotaalCent: nieuwTotaal, volledig: nieuwTotaal >= betaald } };
}

/**
 * Trekt de terugbetaling de toegang tot de test in? Alleen bij een volledige
 * terugbetaling, en niet als de beheerder heeft aangevinkt dat die blijft.
 */
export function trektToegangIn(volledig: boolean, toegangBehouden: boolean): boolean {
  return volledig && !toegangBehouden;
}

/** Omschrijving van een terugbetaling bij Mollie (ook zichtbaar voor de klant). */
export function terugbetaalOmschrijving(nummer: string | null, reden: string | null): string {
  const r = (reden ?? "").replace(/\s+/g, " ").trim();
  const basis = nummer ? `Terugbetaling factuur ${nummer}` : "Terugbetaling";
  return (r ? `${basis}: ${r}` : basis).slice(0, MAX_OMSCHRIJVING);
}

// Handmatige bestelling ------------------------------------------------------------

export type HandmatigeSoort = "gratis" | "overboeking";

export interface HandmatigeBestelling {
  klantnaam: string;
  email: string;
  soort: HandmatigeSoort;
  /** 0 bij gratis. */
  bedragCent: number;
  /** yyyy-mm-dd: datum van de betaling (overboeking); null = vandaag. */
  betaaldOp: string | null;
  factuurgegevens: Partial<Record<keyof typeof FACTUURVELDEN, string>>;
  notitie: string | null;
}

/** Hoogste bedrag van een handmatige bestelling (centen). */
export const MAX_HANDMATIG_CENT = 1_000_000;

function tekst(v: unknown, max: number): string {
  return typeof v === "string" ? v.replace(/\s+/g, " ").trim().slice(0, max) : "";
}

function geldigeDatum(d: string): boolean {
  return leesDatum(d) !== null;
}

/** Controleert het formulier 'Nieuwe bestelling' in het beheer. `vandaag` als yyyy-mm-dd (NL). */
export function valideerHandmatigeBestelling(
  ruw: Record<string, unknown>,
  vandaag: string,
): Uitkomst<HandmatigeBestelling> {
  const klantnaam = tekst(ruw.klantnaam, 120);
  const email = tekst(ruw.email, 254).toLowerCase();
  if (klantnaam.length < 2) return { ok: false, fout: "Vul de naam van de klant in." };
  if (!geldigEmail(email)) return { ok: false, fout: "Vul een geldig e-mailadres in." };
  const soort: HandmatigeSoort | null = ruw.soort === "gratis" ? "gratis" : ruw.soort === "overboeking" ? "overboeking" : null;
  if (!soort) return { ok: false, fout: "Kies of de bestelling gratis is of buiten Mollie is betaald." };

  let bedragCent = 0;
  let betaaldOp: string | null = null;
  if (soort === "overboeking") {
    const c = euroNaarCent(tekst(ruw.bedrag, 20));
    if (c === null || c <= 0) return { ok: false, fout: "Vul het ontvangen bedrag in, bijvoorbeeld 29,95." };
    if (c > MAX_HANDMATIG_CENT) return { ok: false, fout: "Dat bedrag is te hoog." };
    bedragCent = c;
    const d = tekst(ruw.betaald_op, 10);
    if (d) {
      if (!geldigeDatum(d)) return { ok: false, fout: "Kies een geldige betaaldatum." };
      if (d > vandaag) return { ok: false, fout: "De betaaldatum ligt in de toekomst." };
      betaaldOp = d < vandaag ? d : null;
    }
  }
  const notitie = tekst(ruw.notitie, 500) || null;
  return {
    ok: true,
    waarde: {
      klantnaam,
      email,
      soort,
      bedragCent,
      betaaldOp,
      factuurgegevens: schoonFactuurgegevens(ruw),
      notitie,
    },
  };
}

// Bestelling wijzigen --------------------------------------------------------------

export interface OrderWijziging {
  klantnaam: string;
  email: string;
  factuurgegevens: Partial<Record<keyof typeof FACTUURVELDEN, string>>;
  /** yyyy-mm-dd: nieuwe einddatum van de testlink, of null = niet wijzigen. */
  tokenGeldigTot: string | null;
}

/** Controleert het formulier 'Gegevens wijzigen' van een bestelling. `vandaag` als yyyy-mm-dd (NL). */
export function valideerOrderWijziging(ruw: Record<string, unknown>, vandaag: string): Uitkomst<OrderWijziging> {
  const klantnaam = tekst(ruw.klantnaam, 120);
  const email = tekst(ruw.email, 254).toLowerCase();
  if (klantnaam.length < 2) return { ok: false, fout: "Vul de naam van de klant in." };
  if (!geldigEmail(email)) return { ok: false, fout: "Vul een geldig e-mailadres in." };
  const d = tekst(ruw.token_geldig_tot, 10);
  let tokenGeldigTot: string | null = null;
  if (d) {
    if (!geldigeDatum(d)) return { ok: false, fout: "Kies een geldige datum voor de testlink." };
    if (d < vandaag) return { ok: false, fout: "De testlink kan niet geldig zijn tot een datum in het verleden." };
    tokenGeldigTot = d;
  }
  return { ok: true, waarde: { klantnaam, email, factuurgegevens: schoonFactuurgegevens(ruw), tokenGeldigTot } };
}

// Kortingscode wijzigen ------------------------------------------------------------

export interface CodeWijziging {
  omschrijving: string | null;
  /** Procent (1-100) of centen, net als in de tabel. */
  waarde: number;
  maxGebruik: number | null;
  /** yyyy-mm-dd (t/m), of null = altijd geldig. */
  geldigTot: string | null;
}

/**
 * Controleert het formulier 'Wijzigen' van een kortingscode. De soort ligt vast;
 * het maximale gebruik mag niet onder het al geteld gebruik komen.
 */
export function controleerCodeWijziging(
  ruw: { omschrijving?: unknown; waarde?: unknown; max_gebruik?: unknown; geldig_tot?: unknown },
  o: { soort: string; aantalGebruikt: number },
): Uitkomst<CodeWijziging> {
  const omschrijving = tekst(ruw.omschrijving, 200) || null;
  let waarde: number;
  if (o.soort === "percentage") {
    const t = tekst(ruw.waarde, 10).replace(/%$/, "").trim();
    if (!/^\d+$/.test(t)) return { ok: false, fout: "Vul een heel percentage in (1 tot en met 100)." };
    waarde = Number(t);
    if (waarde < 1 || waarde > 100) return { ok: false, fout: "Een percentage ligt tussen 1 en 100." };
  } else {
    const c = euroNaarCent(tekst(ruw.waarde, 20));
    if (c === null || c <= 0) return { ok: false, fout: "Vul een geldig bedrag in, bijvoorbeeld 10 of 7,50." };
    waarde = c;
  }
  const maxTekst = tekst(ruw.max_gebruik, 10);
  let maxGebruik: number | null = null;
  if (maxTekst) {
    if (!/^\d+$/.test(maxTekst) || Number(maxTekst) < 1) {
      return { ok: false, fout: "Maximaal gebruik moet leeg zijn of minstens 1." };
    }
    maxGebruik = Number(maxTekst);
    if (maxGebruik < o.aantalGebruikt) {
      return { ok: false, fout: `De code is al ${o.aantalGebruikt} keer gebruikt; kies minstens ${o.aantalGebruikt}.` };
    }
  }
  const d = tekst(ruw.geldig_tot, 10);
  let geldigTot: string | null = null;
  if (d) {
    if (!geldigeDatum(d)) return { ok: false, fout: "Kies een geldige datum." };
    geldigTot = d;
  }
  return { ok: true, waarde: { omschrijving, waarde, maxGebruik, geldigTot } };
}

/** Welke velden zijn gewijzigd (voor het logboek)? */
export function gewijzigdeVelden(
  oud: Readonly<Record<string, unknown>>,
  nieuw: Readonly<Record<string, unknown>>,
): string[] {
  // Sleutelvolgorde maakt niet uit (jsonb sorteert de sleutels zelf); lege objecten = leeg.
  const vast = (v: unknown): string => {
    if (v === undefined || v === null) return "null";
    if (typeof v !== "object" || Array.isArray(v)) return JSON.stringify(v);
    const paren = Object.entries(v as Record<string, unknown>)
      .filter(([, w]) => w !== undefined && w !== null && w !== "")
      .sort(([a], [b]) => a.localeCompare(b));
    return paren.length ? JSON.stringify(paren) : "null";
  };
  return Object.keys(nieuw).filter((k) => vast(oud[k]) !== vast(nieuw[k]));
}
