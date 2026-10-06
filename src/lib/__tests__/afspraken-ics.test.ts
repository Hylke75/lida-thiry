import { describe, expect, it } from "vitest";
import { icsTekst, icsTijd, maakIcs, vouw } from "../afspraken/ics";

const basis = {
  uid: "afspraak-123@lidathiry.nl",
  start: new Date("2026-10-05T07:00:00Z"),
  eind: new Date("2026-10-05T08:30:00Z"),
  titel: "Kleuradvies – Lida Thiry",
  omschrijving: "Regel 1\nRegel 2; met, tekens\\",
  locatie: "Dorpsstraat 1, 1234 AB Ergens",
  url: "https://lidathiry.nl/afspraak/abc",
  organisator: { naam: "Lida Thiry", email: "info@lidathiry.nl" },
  gemaaktOp: new Date("2026-10-01T12:00:00Z"),
};

/** Ontvouwen volgens RFC 5545 (CRLF + spatie weg). */
const ontvouw = (ics: string) => ics.replace(/\r\n /g, "");

describe("afspraken/ics", () => {
  it("tijden in UTC-notatie", () => {
    expect(icsTijd(new Date("2026-10-05T07:00:00.000Z"))).toBe("20261005T070000Z");
  });

  it("escapet tekst", () => {
    expect(icsTekst("a,b;c\\d\ne")).toBe("a\\,b\\;c\\\\d\\ne");
    expect(icsTekst("x\r\ny")).toBe("x\\ny");
  });

  it("maakt een geldige VCALENDAR met één VEVENT", () => {
    const ics = maakIcs(basis);
    expect(ics.endsWith("\r\n")).toBe(true);
    expect(ics.split("\r\n").filter(Boolean).every((r) => !r.includes("\n"))).toBe(true);
    const r = ontvouw(ics).split("\r\n");
    expect(r[0]).toBe("BEGIN:VCALENDAR");
    expect(r).toContain("VERSION:2.0");
    expect(r).toContain("METHOD:PUBLISH");
    expect(r).toContain("BEGIN:VEVENT");
    expect(r).toContain("UID:afspraak-123@lidathiry.nl");
    expect(r).toContain("DTSTAMP:20261001T120000Z");
    expect(r).toContain("DTSTART:20261005T070000Z");
    expect(r).toContain("DTEND:20261005T083000Z");
    expect(r).toContain("STATUS:CONFIRMED");
    expect(r).toContain("SEQUENCE:0");
    expect(r).toContain("SUMMARY:Kleuradvies – Lida Thiry");
    expect(r).toContain("DESCRIPTION:Regel 1\\nRegel 2\\; met\\, tekens\\\\");
    expect(r).toContain("LOCATION:Dorpsstraat 1\\, 1234 AB Ergens");
    expect(r).toContain("URL:https://lidathiry.nl/afspraak/abc");
    expect(r).toContain('ORGANIZER;CN="Lida Thiry":mailto:info@lidathiry.nl');
    expect(r).toContain("BEGIN:VALARM");
    expect(r).toContain("TRIGGER:-P1D");
    expect(r.filter((x) => x === "BEGIN:VEVENT")).toHaveLength(1);
    expect(r.at(-2)).toBe("END:VCALENDAR");
  });

  it("annulering: METHOD:CANCEL, STATUS:CANCELLED, hogere SEQUENCE en geen alarm", () => {
    const r = ontvouw(maakIcs({ ...basis, geannuleerd: true })).split("\r\n");
    expect(r).toContain("METHOD:CANCEL");
    expect(r).toContain("STATUS:CANCELLED");
    expect(r).toContain("SEQUENCE:1");
    expect(r).toContain("UID:afspraak-123@lidathiry.nl");
    expect(r).not.toContain("BEGIN:VALARM");
  });

  it("laat optionele velden weg", () => {
    const ics = maakIcs({ uid: "x", start: basis.start, eind: basis.eind, titel: "T" });
    expect(ics).not.toMatch(/^(LOCATION|ORGANIZER|URL)[:;]/m);
    // Alleen de DESCRIPTION van het alarm (verplicht bij ACTION:DISPLAY).
    expect(ics.match(/^DESCRIPTION:/gm)).toHaveLength(1);
  });

  it("vouwt lange regels op maximaal 75 octets, ook met meerbytetekens", () => {
    const lang = `DESCRIPTION:${"é".repeat(100)}${"a".repeat(100)}`;
    const gevouwen = vouw(lang);
    const regels = gevouwen.split("\r\n");
    expect(regels.length).toBeGreaterThan(1);
    const enc = new TextEncoder();
    for (const regel of regels) expect(enc.encode(regel).length).toBeLessThanOrEqual(75);
    expect(regels.slice(1).every((r) => r.startsWith(" "))).toBe(true);
    expect(gevouwen.replace(/\r\n /g, "")).toBe(lang);
    expect(vouw("kort")).toBe("kort");
  });
});
