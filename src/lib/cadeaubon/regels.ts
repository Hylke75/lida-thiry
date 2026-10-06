// Pure regels voor het kopen van een cadeaubon: bedrag, invoer en datums.
// Geen server-only imports, zodat dit los te testen is.

import { euroNaarCent, formatteerBedrag } from "../prijs";
import { EMAIL_PATROON, MAX_EMAIL_LENGTE } from "@/lib/email";
import { datumLang, TIJDZONE } from "../datum";

/**
 * Instelbare regels voor cadeaubonnen (Beheer → Cadeaubonnen → Instellingen). De
 * standaardwaarden zijn de vaste waarden van vóór die instellingen.
 */
export interface CadeaubonInstellingen {
  /** Vaste bedragen op het formulier (centen), oplopend. */
  vasteBedragen: number[];
  /** Minimaal bedrag (centen). */
  minCent: number;
  /**
   * Absoluut maximum (centen). De bon is één keer te gebruiken en dekt hooguit de
   * prijs van de test, dus het werkelijke maximum is de prijs van de test (maxBedragCent).
   */
  maxCent: number;
  /** Zo lang is een cadeaubon geldig na betaling (of na de geplande verzenddatum). */
  geldigMaanden: number;
  /** Zo ver vooruit mag de bon gepland worden (dagen). */
  maxVooruitDagen: number;
}

export const CADEAUBON_STANDAARD: Readonly<CadeaubonInstellingen> = {
  vasteBedragen: [2000, 3500, 5000],
  minCent: 500,
  maxCent: 50_000,
  geldigMaanden: 12,
  maxVooruitDagen: 183,
};

/** Sleutels in de tabel instellingen. */
export const CADEAUBON_SLEUTELS = {
  vasteBedragen: "cadeaubon_vaste_bedragen",
  minCent: "cadeaubon_min_cent",
  maxCent: "cadeaubon_max_cent",
  geldigMaanden: "cadeaubon_geldig_maanden",
  maxVooruitDagen: "cadeaubon_max_vooruit_dagen",
} as const satisfies Record<keyof CadeaubonInstellingen, string>;

/** Grenzen: de database staat 5–1000 euro toe; redelijke termijnen. */
export const CADEAUBON_GRENZEN = {
  bedragCent: { min: 500, max: 100_000 },
  geldigMaanden: { min: 1, max: 60 },
  maxVooruitDagen: { min: 1, max: 366 },
  vasteBedragen: 6,
} as const;

/** Zo ver vooruit mag de bon standaard gepland worden. */
export const MAX_VOORUIT_DAGEN = CADEAUBON_STANDAARD.maxVooruitDagen;
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

function heelGetal(w: string | null | undefined): number | null {
  const t = (w ?? "").trim();
  return /^\d+$/.test(t) ? Number(t) : null;
}

/** Centen als "20" of "27,50" (voor invoervelden in euro's). */
export function centNaarEuroInvoer(cent: number): string {
  return cent % 100 === 0 ? String(cent / 100) : (cent / 100).toFixed(2).replace(".", ",");
}

/** Lijst bedragen "2000,3500" (centen) → oplopend, uniek en binnen de grenzen; anders null. */
function leesBedragenlijst(w: string): number[] | null {
  const t = w.trim();
  if (!t) return [];
  const delen = t.split(",").map((d) => heelGetal(d));
  if (delen.some((d) => d === null)) return null;
  const lijst = [...new Set(delen as number[])].sort((a, b) => a - b);
  const { min, max } = CADEAUBON_GRENZEN.bedragCent;
  if (lijst.some((c) => c < min || c > max) || lijst.length > CADEAUBON_GRENZEN.vasteBedragen) return null;
  return lijst;
}

/**
 * Leest de cadeaubon-instellingen uit de instellingen (key/value). Ontbrekende of
 * ongeldige waarden vallen terug op de standaard; het maximum ligt nooit onder het minimum.
 */
export function leesCadeaubonInstellingen(
  inst: Readonly<Record<string, string | null | undefined>>,
): CadeaubonInstellingen {
  const S = CADEAUBON_SLEUTELS;
  const d = CADEAUBON_STANDAARD;
  const g = CADEAUBON_GRENZEN;
  const binnen = (w: number | null, min: number, max: number, standaard: number) =>
    w !== null && w >= min && w <= max ? w : standaard;
  const minCent = binnen(heelGetal(inst[S.minCent]), g.bedragCent.min, g.bedragCent.max, d.minCent);
  let maxCent = binnen(heelGetal(inst[S.maxCent]), g.bedragCent.min, g.bedragCent.max, d.maxCent);
  if (maxCent < minCent) maxCent = Math.max(d.maxCent, minCent);
  const ruweLijst = inst[S.vasteBedragen];
  const lijst = typeof ruweLijst === "string" ? leesBedragenlijst(ruweLijst) : null;
  return {
    vasteBedragen: lijst ?? [...d.vasteBedragen],
    minCent,
    maxCent,
    geldigMaanden: binnen(heelGetal(inst[S.geldigMaanden]), g.geldigMaanden.min, g.geldigMaanden.max, d.geldigMaanden),
    maxVooruitDagen: binnen(
      heelGetal(inst[S.maxVooruitDagen]),
      g.maxVooruitDagen.min,
      g.maxVooruitDagen.max,
      d.maxVooruitDagen,
    ),
  };
}

/**
 * Controleert het instellingenformulier (bedragen in euro's, vaste bedragen
 * gescheiden door spaties, puntkomma's of regels) en geeft de op te slaan waarden per sleutel.
 */
export function valideerCadeaubonInstellingen(ruw: {
  vaste_bedragen?: unknown;
  min?: unknown;
  max?: unknown;
  geldig_maanden?: unknown;
  max_vooruit_dagen?: unknown;
}): Uitkomst<{ instellingen: CadeaubonInstellingen; waarden: Record<string, string> }> {
  const s = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const g = CADEAUBON_GRENZEN;
  const euro = (v: unknown, label: string): Uitkomst<number> => {
    const c = euroNaarCent(s(v));
    if (c === null || c === 0) return { ok: false, fout: `${label}: vul een bedrag in, bijvoorbeeld 25 of 27,50.` };
    if (c < g.bedragCent.min || c > g.bedragCent.max) {
      return {
        ok: false,
        fout: `${label}: kies een bedrag tussen ${formatteerBedrag(g.bedragCent.min)} en ${formatteerBedrag(g.bedragCent.max)}.`,
      };
    }
    return { ok: true, waarde: c };
  };
  const min = euro(ruw.min, "Minimaal bedrag");
  if (!min.ok) return min;
  const max = euro(ruw.max, "Maximaal bedrag");
  if (!max.ok) return max;
  if (max.waarde < min.waarde) return { ok: false, fout: "Het maximale bedrag is lager dan het minimale bedrag." };

  const vaste: number[] = [];
  for (const deel of s(ruw.vaste_bedragen).split(/[;\s]+/).filter(Boolean)) {
    const c = euroNaarCent(deel);
    if (c === null || c === 0) return { ok: false, fout: `Vaste bedragen: "${deel}" is geen geldig bedrag.` };
    if (c < min.waarde || c > max.waarde) {
      return { ok: false, fout: `Vaste bedragen: ${formatteerBedrag(c)} ligt buiten het minimum en maximum.` };
    }
    vaste.push(c);
  }
  const uniek = [...new Set(vaste)].sort((a, b) => a - b);
  if (uniek.length > g.vasteBedragen) return { ok: false, fout: `Vaste bedragen: hooguit ${g.vasteBedragen} bedragen.` };

  const geheel = (v: unknown, label: string, grens: { min: number; max: number }): Uitkomst<number> => {
    const n = heelGetal(s(v));
    if (n === null || n < grens.min || n > grens.max) {
      return { ok: false, fout: `${label}: kies een heel getal tussen ${grens.min} en ${grens.max}.` };
    }
    return { ok: true, waarde: n };
  };
  const maanden = geheel(ruw.geldig_maanden, "Geldigheid (maanden)", g.geldigMaanden);
  if (!maanden.ok) return maanden;
  const vooruit = geheel(ruw.max_vooruit_dagen, "Maximaal vooruit plannen (dagen)", g.maxVooruitDagen);
  if (!vooruit.ok) return vooruit;

  const instellingen: CadeaubonInstellingen = {
    vasteBedragen: uniek,
    minCent: min.waarde,
    maxCent: max.waarde,
    geldigMaanden: maanden.waarde,
    maxVooruitDagen: vooruit.waarde,
  };
  const S = CADEAUBON_SLEUTELS;
  return {
    ok: true,
    waarde: {
      instellingen,
      waarden: {
        [S.vasteBedragen]: uniek.join(","),
        [S.minCent]: String(min.waarde),
        [S.maxCent]: String(max.waarde),
        [S.geldigMaanden]: String(maanden.waarde),
        [S.maxVooruitDagen]: String(vooruit.waarde),
      },
    },
  };
}

export function geldigEmail(email: string): boolean {
  return EMAIL_PATROON.test(email) && email.length <= MAX_EMAIL_LENGTE;
}

/** Hoogste bedrag van een bon: de prijs van de test (en nooit boven het ingestelde maximum). */
export function maxBedragCent(prijsCent: number, inst: CadeaubonInstellingen = CADEAUBON_STANDAARD): number {
  return Math.min(prijsCent, inst.maxCent);
}

/** Vaste bedragen die onder de prijs van de test liggen (de prijs zelf is een eigen keuze). */
export function vasteBedragenOnder(prijsCent: number, inst: CadeaubonInstellingen = CADEAUBON_STANDAARD): number[] {
  return inst.vasteBedragen.filter((c) => c >= inst.minCent && c < maxBedragCent(prijsCent, inst));
}

/**
 * Bepaalt het bedrag van de bon uit de keuze op het formulier: een vast bedrag
 * (in centen), "prijs" (de prijs van één test) of "anders" met een eigen bedrag.
 * Zonder bekende prijs is er geen bon te koop; meer dan de prijs kan niet.
 */
export function bepaalBedrag(
  keuze: string,
  eigenBedrag: string,
  prijsCent: number | null,
  inst: CadeaubonInstellingen = CADEAUBON_STANDAARD,
): Uitkomst<number> {
  if (!prijsCent || prijsCent <= 0) {
    return { ok: false, fout: "Cadeaubonnen zijn op dit moment niet te koop. Probeer het later opnieuw." };
  }
  let cent: number | null;
  if (keuze === "prijs") {
    cent = prijsCent;
  } else if (keuze === "anders") {
    cent = eigenBedrag.trim() ? euroNaarCent(eigenBedrag) : null;
    if (cent === null) return { ok: false, fout: "Vul een geldig bedrag in, bijvoorbeeld 25 of 27,50." };
  } else {
    cent = Number(keuze);
    if (!vasteBedragenOnder(prijsCent, inst).includes(cent)) {
      return { ok: false, fout: "Kies een bedrag." };
    }
  }
  const max = maxBedragCent(prijsCent, inst);
  const min = Math.min(inst.minCent, max);
  const minLabel = min % 100 === 0 ? `€ ${min / 100}` : formatteerBedrag(min);
  if (cent < min) return { ok: false, fout: `Een cadeaubon is minimaal ${minLabel}.` };
  if (cent > max) {
    return {
      ok: false,
      fout:
        max === prijsCent
          ? `Een cadeaubon is maximaal de prijs van de test (${formatteerBedrag(max)}).`
          : `Een cadeaubon is maximaal ${formatteerBedrag(max)}.`,
    };
  }
  return { ok: true, waarde: cent };
}

/** Datum (yyyy-mm-dd) van een moment in Nederlandse tijd. */
export function datumInNederland(moment: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TIJDZONE,
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
  opts: { prijsCent: number | null; nu?: Date; inst?: CadeaubonInstellingen },
): Uitkomst<CadeaubonInvoer> {
  const inst = opts.inst ?? CADEAUBON_STANDAARD;
  const bedrag = bepaalBedrag(tekst(ruw.bedrag, 20), tekst(ruw.eigen_bedrag, 20), opts.prijsCent, inst);
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
    if (datum > plusDagen(vandaag, inst.maxVooruitDagen)) {
      return {
        ok: false,
        fout:
          inst.maxVooruitDagen === CADEAUBON_STANDAARD.maxVooruitDagen
            ? "De verzenddatum mag maximaal een half jaar vooruit liggen."
            : `De verzenddatum mag maximaal ${inst.maxVooruitDagen} dagen vooruit liggen.`,
      };
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
 * Tot wanneer de bon geldig is: `maanden` (instelling, standaard 12) na betaling,
 * of na de geplande verzenddatum als die later is. Einde van die dag (Nederlandse tijd).
 */
export function cadeaubonGeldigTot(
  betaaldOp: Date,
  verzendOp: string | null,
  maanden: number = CADEAUBON_STANDAARD.geldigMaanden,
): string {
  const start = verzendOp && verzendOp > datumInNederland(betaaldOp) ? verzendOp : datumInNederland(betaaldOp);
  const d = new Date(`${start}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + maanden);
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
  return datumLang(waarde);
}
