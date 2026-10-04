import { describe, expect, it } from "vitest";
import {
  afwijkingMinuten,
  dagenTussen,
  datumPlusDagen,
  leesDatum,
  maandagVan,
  minutenNaarTijd,
  naarAmsterdam,
  tijdNaarMinuten,
  vandaagAmsterdam,
  vanAmsterdam,
  weekdagVan,
} from "../afspraken/tijd";

const iso = (d: Date) => d.toISOString();

describe("afspraken/tijd: kalender", () => {
  it("leest alleen bestaande datums", () => {
    expect(leesDatum("2026-02-28")).toEqual({ jaar: 2026, maand: 2, dag: 28 });
    expect(leesDatum("2026-02-29")).toBeNull();
    expect(leesDatum("2028-02-29")).not.toBeNull();
    expect(leesDatum("5-10-2026")).toBeNull();
  });

  it("rekent met dagen over maand- en jaargrenzen", () => {
    expect(datumPlusDagen("2026-03-31", 1)).toBe("2026-04-01");
    expect(datumPlusDagen("2026-12-31", 1)).toBe("2027-01-01");
    expect(datumPlusDagen("2026-03-01", -1)).toBe("2026-02-28");
    expect(dagenTussen("2026-10-04", "2026-12-03")).toBe(60);
  });

  it("weekdag: 1 = maandag … 7 = zondag", () => {
    expect(weekdagVan("2026-10-05")).toBe(1);
    expect(weekdagVan("2026-10-04")).toBe(7);
    expect(weekdagVan("2026-03-29")).toBe(7);
    expect(maandagVan("2026-10-04")).toBe("2026-09-28");
    expect(maandagVan("2026-10-05")).toBe("2026-10-05");
  });

  it("tijden ↔ minuten", () => {
    expect(tijdNaarMinuten("09:30")).toBe(570);
    expect(tijdNaarMinuten("09:30:00")).toBe(570);
    expect(tijdNaarMinuten("24:00")).toBe(1440);
    expect(tijdNaarMinuten("24:15")).toBeNull();
    expect(tijdNaarMinuten("9:60")).toBeNull();
    expect(tijdNaarMinuten("")).toBeNull();
    expect(minutenNaarTijd(570)).toBe("09:30");
  });
});

describe("afspraken/tijd: Europe/Amsterdam", () => {
  it("winter- en zomertijd", () => {
    expect(afwijkingMinuten(new Date("2026-01-15T12:00:00Z"))).toBe(60);
    expect(afwijkingMinuten(new Date("2026-07-15T12:00:00Z"))).toBe(120);
    expect(iso(vanAmsterdam("2026-01-15", 600))).toBe("2026-01-15T09:00:00.000Z");
    expect(iso(vanAmsterdam("2026-07-01", 600))).toBe("2026-07-01T08:00:00.000Z");
  });

  it("overgang naar zomertijd (29 maart 2026, 02:00 → 03:00)", () => {
    expect(iso(vanAmsterdam("2026-03-29", 90))).toBe("2026-03-29T00:30:00.000Z"); // 01:30 CET
    expect(iso(vanAmsterdam("2026-03-29", 180))).toBe("2026-03-29T01:00:00.000Z"); // 03:00 CEST
    // 02:30 bestaat niet: schuift door naar 03:30.
    expect(iso(vanAmsterdam("2026-03-29", 150))).toBe("2026-03-29T01:30:00.000Z");
    expect(naarAmsterdam(new Date("2026-03-29T01:30:00Z")).tijd).toBe("03:30");
  });

  it("overgang naar wintertijd (25 oktober 2026, 03:00 → 02:00)", () => {
    // 02:30 bestaat twee keer: de eerste (zomertijd) geldt.
    expect(iso(vanAmsterdam("2026-10-25", 150))).toBe("2026-10-25T00:30:00.000Z");
    expect(naarAmsterdam(new Date("2026-10-25T00:30:00Z")).tijd).toBe("02:30");
    expect(naarAmsterdam(new Date("2026-10-25T01:30:00Z")).tijd).toBe("02:30");
    expect(iso(vanAmsterdam("2026-10-25", 240))).toBe("2026-10-25T03:00:00.000Z");
    // Middernacht aan het eind van de dag (1440) = begin van de volgende dag.
    expect(iso(vanAmsterdam("2026-10-25", 1440))).toBe("2026-10-25T23:00:00.000Z");
    expect(iso(vanAmsterdam("2026-10-26", 0))).toBe("2026-10-25T23:00:00.000Z");
  });

  it("vandaag volgt de Nederlandse kalender, niet UTC", () => {
    expect(vandaagAmsterdam(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
    expect(vandaagAmsterdam(new Date("2026-12-31T22:59:00Z"))).toBe("2026-12-31");
    expect(vandaagAmsterdam(new Date("2026-12-31T23:00:00Z"))).toBe("2027-01-01");
  });

  it("naarAmsterdam geeft datum, tijd en weekdag", () => {
    expect(naarAmsterdam(new Date("2026-10-05T07:15:00Z"))).toEqual({ datum: "2026-10-05", tijd: "09:15", minuten: 555, weekdag: 1 });
  });
});
