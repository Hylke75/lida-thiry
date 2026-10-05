// Agendabestand (.ics, RFC 5545) voor een afspraak, als pure functie. Tijden in
// UTC (…Z), zodat elke agenda ze in de eigen tijdzone goed toont. Regels worden
// gevouwen op 75 octets en teksten ge-escaped.

import { BEDRIJFSNAAM_STANDAARD } from "../site";

export interface IcsAfspraak {
  /** Uniek en stabiel per afspraak, bijv. "<id>@lidathiry.nl". */
  uid: string;
  start: Date;
  eind: Date;
  titel: string;
  omschrijving?: string;
  locatie?: string;
  url?: string;
  /** Organisator (verplicht bij METHOD:CANCEL volgens de standaard). */
  organisator?: { naam?: string; email: string } | null;
  /** Gewijzigd bij elke herziening; geannuleerd = hoger dan de bevestiging. */
  volgnummer?: number;
  geannuleerd?: boolean;
  /** Tijdstip van aanmaken van dit bestand (DTSTAMP); standaard nu. */
  gemaaktOp?: Date;
}

const CRLF = "\r\n";

/** 20261005T123000Z */
export function icsTijd(t: Date): string {
  return t.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Escape volgens RFC 5545 (backslash, puntkomma, komma, regeleinde). */
export function icsTekst(s: string): string {
  return s
    .replace(/\r\n?/g, "\n")
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

/** Vouwt een regel op maximaal 75 octets (UTF-8), vervolgregels beginnen met een spatie. */
export function vouw(regel: string): string {
  const encoder = new TextEncoder();
  if (encoder.encode(regel).length <= 75) return regel;
  const delen: string[] = [];
  let huidig = "";
  let lengte = 0;
  for (const teken of regel) {
    const n = encoder.encode(teken).length;
    const max = delen.length === 0 ? 75 : 74; // vervolgregels: 1 octet voor de spatie
    if (lengte + n > max) {
      delen.push(huidig);
      huidig = "";
      lengte = 0;
    }
    huidig += teken;
    lengte += n;
  }
  delen.push(huidig);
  return delen.join(`${CRLF} `);
}

/** Het volledige .ics-bestand (VCALENDAR met één VEVENT). */
export function maakIcs(a: IcsAfspraak): string {
  const regels = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    `PRODID:-//${BEDRIJFSNAAM_STANDAARD}//Afspraken//NL`,
    "CALSCALE:GREGORIAN",
    `METHOD:${a.geannuleerd ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${icsTekst(a.uid)}`,
    `DTSTAMP:${icsTijd(a.gemaaktOp ?? new Date())}`,
    `DTSTART:${icsTijd(a.start)}`,
    `DTEND:${icsTijd(a.eind)}`,
    `SEQUENCE:${a.volgnummer ?? (a.geannuleerd ? 1 : 0)}`,
    `STATUS:${a.geannuleerd ? "CANCELLED" : "CONFIRMED"}`,
    `SUMMARY:${icsTekst(a.titel)}`,
    a.omschrijving ? `DESCRIPTION:${icsTekst(a.omschrijving)}` : null,
    a.locatie ? `LOCATION:${icsTekst(a.locatie)}` : null,
    a.url ? `URL:${a.url}` : null,
    a.organisator
      ? `ORGANIZER${a.organisator.naam ? `;CN="${a.organisator.naam.replace(/["\r\n]/g, "")}"` : ""}:mailto:${a.organisator.email}`
      : null,
    "TRANSP:OPAQUE",
    // Herinnering een dag van tevoren (alleen bij een bevestigde afspraak).
    ...(a.geannuleerd
      ? []
      : ["BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${icsTekst(a.titel)}`, "TRIGGER:-P1D", "END:VALARM"]),
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((r): r is string => r !== null);
  return regels.map(vouw).join(CRLF) + CRLF;
}
