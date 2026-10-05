// Pure regels voor afspraken: statussen, invoercontrole (boeken, soorten,
// beschikbaarheid, blokkades), annuleren en instellingen. Zonder database.

import { eindtijdNaarMinuten, leesDatum, minutenNaarTijd, tijdNaarMinuten, vanAmsterdam } from "../datum";
import { geldigEmail } from "@/lib/email";
import { euroNaarCent, formatteerBedrag } from "../prijs";

export const AFSPRAAK_STATUSSEN = [
  "wacht_op_betaling",
  "aangevraagd",
  "bevestigd",
  "geannuleerd",
  "afgerond",
  "niet_verschenen",
] as const;
export type AfspraakStatus = (typeof AFSPRAAK_STATUSSEN)[number];

export const STATUS_LABEL: Record<AfspraakStatus, string> = {
  wacht_op_betaling: "Wacht op betaling",
  aangevraagd: "Aangevraagd",
  bevestigd: "Bevestigd",
  geannuleerd: "Geannuleerd",
  afgerond: "Afgerond",
  niet_verschenen: "Niet verschenen",
};

export function isAfspraakStatus(s: unknown): s is AfspraakStatus {
  return typeof s === "string" && (AFSPRAAK_STATUSSEN as readonly string[]).includes(s);
}

/** Statussen waarin een afspraak nog ‘open’ staat (kan worden geannuleerd). */
export const OPEN_STATUSSEN: readonly AfspraakStatus[] = ["wacht_op_betaling", "aangevraagd", "bevestigd"];

/** Welke statuswijzigingen het beheer mag doen vanuit een status. */
export function toegestaneOvergangen(status: AfspraakStatus, gestart: boolean): AfspraakStatus[] {
  switch (status) {
    case "wacht_op_betaling":
    case "aangevraagd":
      return ["bevestigd", "geannuleerd"];
    case "bevestigd":
      return gestart ? ["afgerond", "niet_verschenen", "geannuleerd"] : ["geannuleerd"];
    case "geannuleerd":
      return [];
    case "afgerond":
      return ["niet_verschenen"];
    case "niet_verschenen":
      return ["afgerond"];
  }
}

/** Of de klant de afspraak zelf nog mag annuleren (tot `minUren` uur vooraf). */
export function magAnnuleren(a: { status: string; start_op: string }, nu: Date, minUren: number): boolean {
  if (!(OPEN_STATUSSEN as readonly string[]).includes(a.status)) return false;
  return new Date(a.start_op).getTime() - nu.getTime() >= minUren * 3_600_000;
}

// Instellingen ----------------------------------------------------------------------

export interface AfspraakInstellingen {
  minVoorafUren: number;
  maxVooruitDagen: number;
  handmatigBevestigen: boolean;
}

export const INSTELLING_SLEUTELS = {
  minVoorafUren: "afspraak_min_vooraf_uren",
  maxVooruitDagen: "afspraak_max_vooruit_dagen",
  handmatigBevestigen: "afspraak_handmatig_bevestigen",
} as const;

function geheel(w: string | null | undefined, standaard: number, min: number, max: number): number {
  const n = Number(w);
  if (w === null || w === undefined || w.trim() === "" || !Number.isFinite(n)) return standaard;
  return Math.min(max, Math.max(min, Math.round(n)));
}

export function leesAfspraakInstellingen(map: Readonly<Record<string, string | null>>): AfspraakInstellingen {
  return {
    minVoorafUren: geheel(map[INSTELLING_SLEUTELS.minVoorafUren], 24, 0, 24 * 60),
    maxVooruitDagen: geheel(map[INSTELLING_SLEUTELS.maxVooruitDagen], 60, 1, 730),
    handmatigBevestigen: map[INSTELLING_SLEUTELS.handmatigBevestigen] === "ja",
  };
}

// Boeken ---------------------------------------------------------------------------

export const MAX = { naam: 120, email: 254, telefoon: 30, opmerking: 2_000, notitie: 5_000, reden: 1_000 } as const;
const TELEFOON = /^[0-9+()\-.\s/]{6,30}$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type BoekVeld = "soort" | "start" | "naam" | "email" | "telefoon" | "opmerking" | "privacy";

export interface BoekInvoer {
  soortId: string;
  start: string;
  naam: string;
  email: string;
  telefoon: string | null;
  opmerking: string | null;
}

export type Validatie<T, V extends string> = { ok: true; waarde: T } | { ok: false; fouten: Partial<Record<V, string>> };

const tekst = (v: unknown): string => (typeof v === "string" ? v : "");
const schoon = (s: string) => s.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "");
const eenRegel = (s: string) => schoon(s).replace(/\s+/g, " ").trim();

export function geldigeUuid(s: unknown): s is string {
  return typeof s === "string" && UUID.test(s);
}

/** Controleert de invoer van het boekingsformulier (klant én server). */
export function valideerBoeking(ruw: Readonly<Record<string, unknown>>): Validatie<BoekInvoer, BoekVeld> {
  const fouten: Partial<Record<BoekVeld, string>> = {};

  const soortId = tekst(ruw.soort).trim();
  if (!geldigeUuid(soortId)) fouten.soort = "Kies een soort afspraak.";

  const start = tekst(ruw.start).trim();
  const t = Date.parse(start);
  if (!start || !Number.isFinite(t) || !/^\d{4}-\d{2}-\d{2}T/.test(start)) fouten.start = "Kies een datum en tijd.";

  const naam = eenRegel(tekst(ruw.naam));
  if (!naam) fouten.naam = "Vul je naam in.";
  else if (naam.length > MAX.naam) fouten.naam = `Je naam mag maximaal ${MAX.naam} tekens zijn.`;

  const email = eenRegel(tekst(ruw.email)).toLowerCase();
  if (!email) fouten.email = "Vul je e-mailadres in.";
  else if (email.length > MAX.email || !geldigEmail(email)) fouten.email = "Dit lijkt geen geldig e-mailadres.";

  const telefoonRuw = eenRegel(tekst(ruw.telefoon));
  if (telefoonRuw && !TELEFOON.test(telefoonRuw)) fouten.telefoon = "Dit lijkt geen geldig telefoonnummer.";

  const opmerking = schoon(tekst(ruw.opmerking)).trim();
  if (opmerking.length > MAX.opmerking) fouten.opmerking = `Je opmerking mag maximaal ${MAX.opmerking} tekens zijn.`;

  if (ruw.privacy !== true && ruw.privacy !== "on" && ruw.privacy !== "1") {
    fouten.privacy = "Geef aan dat je akkoord gaat met de privacyverklaring.";
  }

  if (Object.keys(fouten).length) return { ok: false, fouten };
  return {
    ok: true,
    waarde: {
      soortId,
      start: new Date(t).toISOString(),
      naam,
      email,
      telefoon: telefoonRuw || null,
      opmerking: opmerking || null,
    },
  };
}

// Soorten (beheer) ------------------------------------------------------------------

export interface AfspraakSoort {
  id: string;
  naam: string;
  omschrijving: string;
  duur_minuten: number;
  prijs_cent: number;
  aanbetaling_cent: number;
  locatie: string;
  online: boolean;
  buffer_minuten: number;
  actief: boolean;
  volgorde: number;
}

export type SoortInvoer = Omit<AfspraakSoort, "id">;

export function centNaarEuroInvoer(cent: number): string {
  return cent ? (cent / 100).toFixed(2).replace(".", ",") : "";
}

/** Bedrag in euro's, bijv. "€ 75,00". */
export function bedragLabel(cent: number): string {
  return formatteerBedrag(cent);
}

export function duurLabel(minuten: number): string {
  if (minuten < 60) return `${minuten} minuten`;
  const u = Math.floor(minuten / 60);
  const m = minuten % 60;
  return m ? `${u} uur en ${m} minuten` : `${u} uur`;
}

export function valideerSoort(ruw: Readonly<Record<string, unknown>>): { ok: true; waarde: SoortInvoer } | { ok: false; fouten: string[] } {
  const fouten: string[] = [];
  const naam = eenRegel(tekst(ruw.naam));
  if (!naam) fouten.push("Geef de soort afspraak een naam.");
  if (naam.length > 120) fouten.push("De naam mag maximaal 120 tekens zijn.");
  const omschrijving = schoon(tekst(ruw.omschrijving)).trim();
  if (omschrijving.length > 2_000) fouten.push("De omschrijving mag maximaal 2000 tekens zijn.");
  const duur = Number(tekst(ruw.duur_minuten));
  if (!Number.isInteger(duur) || duur < 10 || duur > 480) fouten.push("De duur ligt tussen 10 en 480 minuten.");
  else if (duur % 5 !== 0) fouten.push("Kies een duur in stappen van 5 minuten.");
  const buffer = Number(tekst(ruw.buffer_minuten) || "0");
  if (!Number.isInteger(buffer) || buffer < 0 || buffer > 240) fouten.push("De buffer ligt tussen 0 en 240 minuten.");
  const prijs = euroNaarCent(tekst(ruw.prijs));
  if (prijs === null) fouten.push("Vul een geldige prijs in (bijv. 75 of 75,00).");
  const aanbetaling = euroNaarCent(tekst(ruw.aanbetaling));
  if (aanbetaling === null) fouten.push("Vul een geldige aanbetaling in (bijv. 25 of 25,00).");
  if (prijs !== null && aanbetaling !== null && prijs > 0 && aanbetaling > prijs) {
    fouten.push("De aanbetaling kan niet hoger zijn dan de prijs.");
  }
  if (aanbetaling !== null && aanbetaling > 0 && aanbetaling < 100) fouten.push("Een aanbetaling is minimaal € 1,00 (of 0 voor geen aanbetaling).");
  const locatie = eenRegel(tekst(ruw.locatie));
  if (locatie.length > 300) fouten.push("De locatie mag maximaal 300 tekens zijn.");
  const volgorde = Number(tekst(ruw.volgorde) || "0");
  if (!Number.isInteger(volgorde) || Math.abs(volgorde) > 10_000) fouten.push("De volgorde is een heel getal.");
  if (fouten.length) return { ok: false, fouten };
  const aan = (v: unknown) => v === "on" || v === "1" || v === true;
  return {
    ok: true,
    waarde: {
      naam,
      omschrijving,
      duur_minuten: duur,
      prijs_cent: prijs ?? 0,
      aanbetaling_cent: aanbetaling ?? 0,
      locatie,
      online: aan(ruw.online),
      buffer_minuten: buffer,
      actief: aan(ruw.actief),
      volgorde,
    },
  };
}

// Beschikbaarheid ---------------------------------------------------------------------

export const WEEKDAGEN = ["maandag", "dinsdag", "woensdag", "donderdag", "vrijdag", "zaterdag", "zondag"] as const;

export interface BlokInvoer {
  weekdag: number;
  van: string;
  tot: string;
}

/**
 * Controleert de weekplanning: per blok een geldige weekdag en van < tot, en
 * blokken op dezelfde dag mogen elkaar niet overlappen. Geeft de blokken
 * genormaliseerd ("09:00") en gesorteerd terug.
 */
export function valideerBeschikbaarheid(blokken: readonly { weekdag: unknown; van: unknown; tot: unknown }[]):
  | { ok: true; waarde: BlokInvoer[] }
  | { ok: false; fouten: string[] } {
  const fouten: string[] = [];
  const uit: { weekdag: number; van: number; tot: number }[] = [];
  if (blokken.length > 70) fouten.push("Maximaal 70 tijdblokken.");
  for (const b of blokken) {
    const weekdag = Number(b.weekdag);
    const van = tijdNaarMinuten(tekst(b.van));
    const tot = eindtijdNaarMinuten(tekst(b.tot));
    const dag = WEEKDAGEN[weekdag - 1];
    if (!Number.isInteger(weekdag) || !dag) {
      fouten.push("Onbekende weekdag.");
      continue;
    }
    if (van === null || tot === null) {
      fouten.push(`${dag}: vul een geldige begin- en eindtijd in.`);
      continue;
    }
    if (tot <= van) {
      fouten.push(`${dag}: de eindtijd moet na de begintijd liggen (${minutenNaarTijd(van)}–${minutenNaarTijd(tot)}).`);
      continue;
    }
    uit.push({ weekdag, van, tot });
  }
  uit.sort((a, b) => a.weekdag - b.weekdag || a.van - b.van);
  for (let i = 1; i < uit.length; i++) {
    const a = uit[i - 1];
    const b = uit[i];
    if (a.weekdag === b.weekdag && b.van < a.tot) {
      fouten.push(
        `${WEEKDAGEN[a.weekdag - 1]}: de blokken ${minutenNaarTijd(a.van)}–${minutenNaarTijd(a.tot)} en ${minutenNaarTijd(b.van)}–${minutenNaarTijd(b.tot)} overlappen.`,
      );
    }
  }
  if (fouten.length) return { ok: false, fouten };
  return {
    ok: true,
    // Einde van de dag wordt "24:00" (Postgres' time accepteert 24:00:00).
    waarde: uit.map((b) => ({ weekdag: b.weekdag, van: minutenNaarTijd(b.van), tot: minutenNaarTijd(b.tot) })),
  };
}

// Blokkades -------------------------------------------------------------------------

/**
 * Een blokkade uit het beheerformulier: van-datum (+ optionele tijd) tot
 * t/m-datum (+ optionele tijd), in Nederlandse tijd. Zonder tijden geldt de hele
 * dag (van 00:00 tot en met 23:59 → tot middernacht van de dag erna).
 */
export function valideerBlokkade(ruw: Readonly<Record<string, unknown>>):
  | { ok: true; waarde: { van: string; tot: string; reden: string } }
  | { ok: false; fout: string } {
  const vanDatum = tekst(ruw.van_datum).trim();
  const totDatum = tekst(ruw.tot_datum).trim() || vanDatum;
  if (!leesDatum(vanDatum) || !leesDatum(totDatum)) return { ok: false, fout: "Vul een geldige begin- en einddatum in." };
  const vanTijd = tekst(ruw.van_tijd).trim();
  const totTijd = tekst(ruw.tot_tijd).trim();
  const vanMin = vanTijd ? tijdNaarMinuten(vanTijd) : 0;
  const totMin = totTijd ? tijdNaarMinuten(totTijd) : 1440;
  if (vanMin === null || totMin === null) return { ok: false, fout: "Vul een geldige tijd in (bijv. 13:00)." };
  const van = vanAmsterdam(vanDatum, vanMin);
  const tot = vanAmsterdam(totDatum, totMin);
  if (tot <= van) return { ok: false, fout: "Het einde van de blokkade moet na het begin liggen." };
  const reden = eenRegel(tekst(ruw.reden)).slice(0, 200);
  return { ok: true, waarde: { van: van.toISOString(), tot: tot.toISOString(), reden } };
}
