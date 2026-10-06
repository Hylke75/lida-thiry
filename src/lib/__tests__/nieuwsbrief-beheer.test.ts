import { describe, expect, it } from "vitest";
import {
  csvVeld,
  leesFilter,
  naarCsv,
  percentage,
  toonPercentage,
  totalenUitRij,
} from "../nieuwsbrief/rapport";
import { amsterdamNaarUtc, controleerInplanmoment, standaardInplanmoment, utcNaarAmsterdamInvoer } from "../datum";
import { SJABLONEN, beschrijfMoment, normaliseerVertraging, vindSjabloon } from "../nieuwsbrief/sjablonen";
import { controleerVoorVerzenden, valideerBlokken } from "../nieuwsbrief/blokken";

describe("nieuwsbrief: statistiek", () => {
  it("leest rijen van de databasefunctie, ook met getallen als tekst", () => {
    expect(totalenUitRij({ totaal: "10", verzonden: 8, geopend: "3", mislukt: null, geklikt: -1 })).toMatchObject({
      totaal: 10,
      verzonden: 8,
      geopend: 3,
      mislukt: 0,
      geklikt: 0,
    });
  });

  it("berekent percentages ten opzichte van verzonden", () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(2, 0)).toBeNull();
    expect(percentage(5, 4)).toBe(100);
    expect(toonPercentage(1, 8)).toBe("12,5%");
    expect(toonPercentage(0, 0)).toBe("—");
    expect(toonPercentage(3, 3)).toBe("100%");
  });

  it("filtert en zoekt veilig", () => {
    expect(leesFilter("geopend")).toBe("geopend");
    expect(leesFilter("onzin")).toBe("alle");
    expect(leesFilter(undefined)).toBe("alle");
  });

  it("maakt CSV voor Excel zonder formule-injectie", () => {
    expect(csvVeld("=SOM(A1)")).toBe("'=SOM(A1)");
    expect(csvVeld('a;"b"')).toBe('"a;""b"""');
    expect(csvVeld(null)).toBe("");
    expect(csvVeld(3)).toBe("3");
    expect(naarCsv(["a", "b"], [["x", 1]])).toBe("﻿a;b\r\nx;1\r\n");
  });
});

describe("nieuwsbrief: inplannen in Nederlandse tijd", () => {
  it("rekent wintertijd (UTC+1) en zomertijd (UTC+2) om", () => {
    expect(amsterdamNaarUtc("2026-12-01T09:00")?.toISOString()).toBe("2026-12-01T08:00:00.000Z");
    expect(amsterdamNaarUtc("2026-07-01T09:00")?.toISOString()).toBe("2026-07-01T07:00:00.000Z");
  });

  it("gaat goed rond de klokwissel", () => {
    // 25 oktober 2026: om 03:00 zomertijd gaat de klok terug naar 02:00.
    expect(amsterdamNaarUtc("2026-10-25T01:30")?.toISOString()).toBe("2026-10-24T23:30:00.000Z");
    expect(amsterdamNaarUtc("2026-10-25T04:00")?.toISOString()).toBe("2026-10-25T03:00:00.000Z");
    // 29 maart 2026: 02:30 bestaat niet en schuift een uur op (03:30 zomertijd = 01:30 UTC).
    expect(amsterdamNaarUtc("2026-03-29T02:30")?.toISOString()).toBe("2026-03-29T01:30:00.000Z");
  });

  it("weigert ongeldige invoer", () => {
    expect(amsterdamNaarUtc("")).toBeNull();
    expect(amsterdamNaarUtc("2026-02-31T10:00")).toBeNull();
    expect(amsterdamNaarUtc("2026-13-01T10:00")).toBeNull();
    expect(amsterdamNaarUtc("morgen")).toBeNull();
  });

  it("zet UTC terug naar een datetime-local-waarde", () => {
    expect(utcNaarAmsterdamInvoer("2026-12-01T08:00:00Z")).toBe("2026-12-01T09:00");
    expect(utcNaarAmsterdamInvoer("2026-07-01T22:30:00Z")).toBe("2026-07-02T00:30");
    expect(utcNaarAmsterdamInvoer("onzin")).toBe("");
    for (const s of ["2026-01-15T07:05", "2026-06-15T23:59", "2026-10-25T12:00"]) {
      expect(utcNaarAmsterdamInvoer(amsterdamNaarUtc(s)!)).toBe(s);
    }
  });

  it("stelt morgen 9:00 voor", () => {
    expect(standaardInplanmoment(new Date("2026-10-04T23:30:00Z"))).toBe("2026-10-06T09:00");
    expect(standaardInplanmoment(new Date("2026-10-04T10:00:00Z"))).toBe("2026-10-05T09:00");
  });

  it("controleert het inplanmoment", () => {
    const nu = new Date("2026-10-04T10:00:00Z");
    expect(controleerInplanmoment(null, nu)).toMatch(/geldige/);
    expect(controleerInplanmoment(new Date("2026-10-04T10:02:00Z"), nu)).toMatch(/5 minuten/);
    expect(controleerInplanmoment(new Date("2027-11-01T10:00:00Z"), nu)).toMatch(/jaar/);
    expect(controleerInplanmoment(new Date("2026-10-05T07:00:00Z"), nu)).toBeNull();
  });
});

describe("nieuwsbrief: automatische mails", () => {
  it("heeft geldige sjablonen die direct verstuurd kunnen worden", () => {
    expect(SJABLONEN.map((s) => [s.sleutel, s.trigger, s.vertraging_dagen])).toEqual([
      ["welkom", "aanmelding", 0],
      ["advies", "advies", 7],
    ]);
    for (const s of SJABLONEN) {
      const { blokken, fouten } = valideerBlokken(s.blokken("https://lidathiry.nl"));
      expect(fouten).toEqual([]);
      expect(controleerVoorVerzenden({ onderwerp: s.onderwerp, blokken })).toEqual([]);
    }
    expect(vindSjabloon("welkom")?.titel).toBe("Welkomstmail");
    expect(vindSjabloon("x")).toBeUndefined();
  });

  it("begrenst de vertraging en beschrijft het moment", () => {
    expect(normaliseerVertraging("7")).toBe(7);
    expect(normaliseerVertraging(-3)).toBe(0);
    expect(normaliseerVertraging(1000)).toBe(365);
    expect(normaliseerVertraging("abc")).toBe(0);
    expect(normaliseerVertraging(2.9)).toBe(2);
    expect(beschrijfMoment("aanmelding", 0)).toBe("Direct na het bevestigen van de aanmelding");
    expect(beschrijfMoment("advies", 7)).toBe("7 dagen nadat het advies is verstuurd");
    expect(beschrijfMoment("advies", 1)).toBe("1 dag nadat het advies is verstuurd");
  });
});
