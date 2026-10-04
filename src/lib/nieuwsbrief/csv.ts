// CSV lezen (import van contacten) en schrijven (export). Puur, zonder database,
// zodat het in de browser (voorbeeld) én op de server (controle) werkt en te
// testen is. Kan overweg met een BOM, ; of , of tab als scheidingsteken, velden
// tussen aanhalingstekens (met "" voor een aanhalingsteken en regeleinden erin)
// en Windows-, Mac- of Unix-regeleinden.

import { geldigEmail, ontleedTags } from "./contactregels";

export const MAX_IMPORT_RIJEN = 5_000;
export const MAX_IMPORT_BYTES = 2 * 1024 * 1024;

export type Scheidingsteken = ";" | "," | "\t";

/** Kiest het scheidingsteken dat op de eerste regel (buiten aanhalingstekens) het vaakst voorkomt. */
export function raadScheidingsteken(tekst: string): Scheidingsteken {
  const tel: Record<Scheidingsteken, number> = { ";": 0, ",": 0, "\t": 0 };
  let inQuotes = false;
  for (const ch of tekst) {
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes && (ch === "\n" || ch === "\r")) break;
    else if (!inQuotes && ch in tel) tel[ch as Scheidingsteken]++;
  }
  if (tel[";"] >= tel[","] && tel[";"] >= tel["\t"] && tel[";"] > 0) return ";";
  if (tel["\t"] > tel[","]) return "\t";
  return ",";
}

/** Een rij uit een CSV-bestand, met het regelnummer waarop hij begint (1 = eerste regel). */
export interface CsvRij {
  regel: number;
  cellen: string[];
}

/** Splitst CSV-tekst in rijen met cellen en regelnummers. Lege regels vallen weg. */
export function parseerCsvRijen(invoer: string, scheiding?: Scheidingsteken): CsvRij[] {
  const tekst = invoer.replace(/^\uFEFF/, "");
  const sep = scheiding ?? raadScheidingsteken(tekst);
  const rijen: CsvRij[] = [];
  let rij: string[] = [];
  let cel = "";
  let inQuotes = false;
  let celBegon = false;
  let regel = 1;
  let rijBegin = 1;

  const sluitCel = () => {
    rij.push(cel);
    cel = "";
    celBegon = false;
  };
  const sluitRij = () => {
    sluitCel();
    if (rij.some((c) => c.trim() !== "")) rijen.push({ regel: rijBegin, cellen: rij });
    rij = [];
  };

  for (let i = 0; i < tekst.length; i++) {
    const ch = tekst[i];
    const regeleinde = ch === "\n" || (ch === "\r" && tekst[i + 1] !== "\n");
    if (inQuotes) {
      if (ch === '"') {
        if (tekst[i + 1] === '"') {
          cel += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cel += ch;
        if (regeleinde) regel++;
      }
      continue;
    }
    if (ch === '"' && !celBegon) {
      inQuotes = true;
      celBegon = true;
    } else if (ch === sep) {
      sluitCel();
    } else if (ch === "\r" || ch === "\n") {
      if (ch === "\r" && tekst[i + 1] === "\n") i++;
      sluitRij();
      regel++;
      rijBegin = regel;
    } else {
      cel += ch;
      if (ch !== " " && ch !== "\t") celBegon = true;
    }
  }
  if (cel !== "" || rij.length) sluitRij();
  return rijen;
}

/** Splitst CSV-tekst in rijen met cellen. Lege regels vallen weg. */
export function parseerCsv(invoer: string, scheiding?: Scheidingsteken): string[][] {
  return parseerCsvRijen(invoer, scheiding).map((r) => r.cellen);
}

export interface ImportRij {
  /** Regelnummer in het bestand (1 = eerste regel). */
  regel: number;
  email: string;
  naam: string | null;
  tags: string[];
}

export interface OngeldigeRij {
  regel: number;
  waarde: string;
  reden: string;
}

export interface ImportAnalyse {
  rijen: ImportRij[];
  ongeldig: OngeldigeRij[];
  /** Adressen die vaker in het bestand staan (alleen de eerste telt). */
  dubbel: number;
  /** Er stonden meer dan MAX_IMPORT_RIJEN rijen in; de rest is genegeerd. */
  teVeel: boolean;
  heeftKoprij: boolean;
  kolommen: { email: number; naam: number | null; tags: number | null };
}

const KOP_EMAIL = /^(e-?mail(adres)?|email address|mail)$/;
const KOP_NAAM = /^(naam|name|voornaam|first ?name|volledige naam|full ?name)$/;
const KOP_TAGS = /^(tags?|labels?|groep(en)?)$/;

const kop = (c: string) => c.trim().toLowerCase().replace(/[_]/g, " ");

/**
 * Leest contacten uit CSV-tekst. Met een koprij worden de kolommen op naam
 * gezocht (email/e-mail, naam/voornaam, tags); zonder koprij is de eerste
 * kolom met een @ het e-mailadres, de volgende de naam en daarna de tags.
 * Tags binnen een cel scheid je met ; of | (of een komma als het bestand ; gebruikt).
 */
export function analyseerImport(invoer: string, max = MAX_IMPORT_RIJEN): ImportAnalyse {
  const alle = parseerCsvRijen(invoer);
  const eerste = alle[0]?.cellen ?? [];
  const heeftKoprij = eerste.some((c) => KOP_EMAIL.test(kop(c)));
  let kolommen: ImportAnalyse["kolommen"];
  if (heeftKoprij) {
    const zoek = (re: RegExp) => {
      const i = eerste.findIndex((c) => re.test(kop(c)));
      return i >= 0 ? i : null;
    };
    kolommen = { email: zoek(KOP_EMAIL) ?? 0, naam: zoek(KOP_NAAM), tags: zoek(KOP_TAGS) };
  } else {
    const email = Math.max(0, eerste.findIndex((c) => c.includes("@")));
    kolommen = {
      email,
      naam: eerste.length > email + 1 ? email + 1 : null,
      tags: eerste.length > email + 2 ? email + 2 : null,
    };
  }

  const data = heeftKoprij ? alle.slice(1) : alle;
  const uit: ImportAnalyse = { rijen: [], ongeldig: [], dubbel: 0, teVeel: data.length > max, heeftKoprij, kolommen };
  const gezien = new Set<string>();

  data.slice(0, max).forEach(({ regel, cellen }) => {
    const ruw = (cellen[kolommen.email] ?? "").trim();
    const email = geldigEmail(ruw);
    if (!email) {
      uit.ongeldig.push({ regel, waarde: ruw.slice(0, 120), reden: ruw ? "Geen geldig e-mailadres" : "Geen e-mailadres" });
      return;
    }
    if (gezien.has(email)) {
      uit.dubbel++;
      return;
    }
    gezien.add(email);
    const naam = kolommen.naam !== null ? (cellen[kolommen.naam] ?? "").trim().slice(0, 120) || null : null;
    const tags = kolommen.tags !== null ? ontleedTags(cellen[kolommen.tags] ?? "") : [];
    uit.rijen.push({ regel, email, naam, tags });
  });
  return uit;
}

/**
 * Maakt een cel veilig voor CSV en spreadsheetprogramma's: aanhalingstekens waar
 * nodig, en een ' vóór tekst die met = + - @ begint (anders voert Excel het uit als formule).
 */
export function csvCel(waarde: unknown, scheiding: Scheidingsteken = ";"): string {
  let s = waarde === null || waarde === undefined ? "" : String(waarde);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return s.includes(scheiding) || /["\r\n]/.test(s) || s.startsWith(" ") || s.endsWith(" ")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

/**
 * CSV-tekst met BOM (zodat Excel UTF-8 herkent), standaard met ; als
 * scheidingsteken (zoals Excel in Nederland verwacht) en Windows-regeleinden.
 */
export function maakCsv(rijen: readonly (readonly unknown[])[], scheiding: Scheidingsteken = ";"): string {
  return "﻿" + rijen.map((r) => r.map((c) => csvCel(c, scheiding)).join(scheiding)).join("\r\n") + "\r\n";
}
