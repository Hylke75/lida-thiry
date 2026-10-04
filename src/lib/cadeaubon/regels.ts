// Pure regels voor het kopen van een cadeaubon: bedrag, invoer en datums.
// Geen server-only imports, zodat dit los te testen is.

/** Vaste bedragen op het formulier (centen). */
export const VASTE_BEDRAGEN = [2000, 3500, 5000] as const;
/** Minimaal en maximaal bedrag van een cadeaubon (centen); de database staat 5–1000 euro toe. */
export const MIN_BEDRAG_CENT = 500;
export const MAX_BEDRAG_CENT = 50_000;
/** Zo lang is een cadeaubon geldig na betaling (of na de geplande verzenddatum). */
export const GELDIG_MAANDEN = 12;
/** Zo ver vooruit mag de bon gepland worden. */
export const MAX_VOORUIT_DAGEN = 183;
export const MAX_BOODSCHAP = 500;

export type Bezorging = "koper" | "ontvanger";

export interface CadeaubonInvoer {
  bedragCent: number;
  koperNaam: string;
  koperEmail: string;
  ontvangerNaam: string | null;
  ontvangerEmail: string | null;
  boodschap: string | null;
  bezorging: Bezorging;
  /** yyyy-mm-dd, alleen bij bezorging aan de ontvanger op een latere dag. */
  verzendOp: string | null;
}

export type Uitkomst<T> = { ok: true; waarde: T } | { ok: false; fout: string };

export function geldigEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;
}

/** "12,50", "12.50", "€ 12" → centen; null bij ongeldige invoer. */
export function euroNaarCent(invoer: string): number | null {
  const tekst = invoer.replace(/€|\s/g, "").replace(",", ".");
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(tekst)) return null;
  return Math.round(Number(tekst) * 100);
}

/**
 * Bepaalt het bedrag van de bon uit de keuze op het formulier: een vast bedrag
 * (in centen), "prijs" (de prijs van één test) of "anders" met een eigen bedrag.
 */
export function bepaalBedrag(
  keuze: string,
  eigenBedrag: string,
  prijsCent: number | null,
): Uitkomst<number> {
  let cent: number | null;
  if (keuze === "prijs") {
    if (!prijsCent) return { ok: false, fout: "De prijs van de test is nog niet bekend. Kies een ander bedrag." };
    cent = prijsCent;
  } else if (keuze === "anders") {
    cent = euroNaarCent(eigenBedrag);
    if (cent === null) return { ok: false, fout: "Vul een geldig bedrag in, bijvoorbeeld 25 of 27,50." };
  } else {
    cent = Number(keuze);
    if (!VASTE_BEDRAGEN.includes(cent as (typeof VASTE_BEDRAGEN)[number])) {
      return { ok: false, fout: "Kies een bedrag." };
    }
  }
  if (cent < MIN_BEDRAG_CENT) return { ok: false, fout: "Een cadeaubon is minimaal € 5." };
  if (cent > MAX_BEDRAG_CENT) return { ok: false, fout: "Een cadeaubon is maximaal € 500." };
  return { ok: true, waarde: cent };
}

/** Datum (yyyy-mm-dd) van een moment in Nederlandse tijd. */
export function datumInNederland(moment: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: "Europe/Amsterdam",
  }).format(moment);
}

/** Telt dagen op bij een datum (yyyy-mm-dd). */
export function plusDagen(datum: string, dagen: number): string {
  const d = new Date(`${datum}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + dagen);
  return d.toISOString().slice(0, 10);
}

function tekst(v: unknown, max: number): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/** Controleert de invoer van het cadeaubonformulier (server-side). */
export function valideerCadeaubon(
  ruw: Record<string, unknown>,
  opts: { prijsCent: number | null; nu?: Date },
): Uitkomst<CadeaubonInvoer> {
  const bedrag = bepaalBedrag(tekst(ruw.bedrag, 20), tekst(ruw.eigen_bedrag, 20), opts.prijsCent);
  if (!bedrag.ok) return bedrag;

  const koperNaam = tekst(ruw.koper_naam, 120);
  const koperEmail = tekst(ruw.koper_email, 254).toLowerCase();
  if (koperNaam.length < 2) return { ok: false, fout: "Vul je naam in." };
  if (!geldigEmail(koperEmail)) return { ok: false, fout: "Vul een geldig e-mailadres in." };

  const bezorging: Bezorging = ruw.bezorging === "ontvanger" ? "ontvanger" : "koper";
  const ontvangerNaam = tekst(ruw.ontvanger_naam, 120) || null;
  const ontvangerEmail = tekst(ruw.ontvanger_email, 254).toLowerCase() || null;
  if (ontvangerEmail && !geldigEmail(ontvangerEmail)) {
    return { ok: false, fout: "Vul een geldig e-mailadres van de ontvanger in." };
  }
  if (bezorging === "ontvanger") {
    if (!ontvangerEmail) return { ok: false, fout: "Vul het e-mailadres van de ontvanger in." };
    if (!ontvangerNaam) return { ok: false, fout: "Vul de naam van de ontvanger in." };
  }

  const ruweBoodschap = typeof ruw.boodschap === "string" ? ruw.boodschap.replace(/\r\n?/g, "\n").trim() : "";
  if (ruweBoodschap.length > MAX_BOODSCHAP) {
    return { ok: false, fout: `De boodschap mag maximaal ${MAX_BOODSCHAP} tekens zijn.` };
  }

  let verzendOp: string | null = null;
  const datum = tekst(ruw.verzend_op, 10);
  if (bezorging === "ontvanger" && datum) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(datum) || Number.isNaN(Date.parse(`${datum}T12:00:00Z`))) {
      return { ok: false, fout: "Kies een geldige verzenddatum." };
    }
    const vandaag = datumInNederland(opts.nu ?? new Date());
    if (datum < vandaag) return { ok: false, fout: "De verzenddatum ligt in het verleden." };
    if (datum > plusDagen(vandaag, MAX_VOORUIT_DAGEN)) {
      return { ok: false, fout: "De verzenddatum mag maximaal een half jaar vooruit liggen." };
    }
    // Vandaag = direct versturen.
    verzendOp = datum > vandaag ? datum : null;
  }

  if (ruw.voorwaarden_akkoord !== true) {
    return { ok: false, fout: "Akkoord met de voorwaarden is verplicht." };
  }

  return {
    ok: true,
    waarde: {
      bedragCent: bedrag.waarde,
      koperNaam,
      koperEmail,
      ontvangerNaam,
      ontvangerEmail,
      boodschap: ruweBoodschap || null,
      bezorging,
      verzendOp,
    },
  };
}

/**
 * Tot wanneer de bon geldig is: GELDIG_MAANDEN na betaling, of na de geplande
 * verzenddatum als die later is. Einde van die dag (Nederlandse tijd).
 */
export function cadeaubonGeldigTot(betaaldOp: Date, verzendOp: string | null): string {
  const start = verzendOp && verzendOp > datumInNederland(betaaldOp) ? verzendOp : datumInNederland(betaaldOp);
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + GELDIG_MAANDEN);
  return eindeVanDagNl(d.toISOString().slice(0, 10));
}

/** 23:59:59 Nederlandse tijd op een datum (yyyy-mm-dd), als ISO-moment. */
export function eindeVanDagNl(datum: string): string {
  const winter = new Date(`${datum}T23:59:59+01:00`);
  // In de zomertijd valt 23:59:59+01:00 al op de volgende dag.
  return (datumInNederland(winter) === datum ? winter : new Date(`${datum}T23:59:59+02:00`)).toISOString();
}

/** Moet de bon nu (al) verstuurd worden? */
export function verzendenIsAanDeBeurt(verzendOp: string | null, nu: Date = new Date()): boolean {
  return !verzendOp || verzendOp <= datumInNederland(nu);
}

/** Leesbare datum, bijv. "12 oktober 2026". Accepteert yyyy-mm-dd of ISO. */
export function leesbareDatum(waarde: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(waarde) ? `${waarde}T12:00:00Z` : waarde;
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}
