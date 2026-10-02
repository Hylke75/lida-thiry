import { describe, it, expect } from "vitest";
import {
  berekenKorting,
  btwSplitsing,
  cadeauboncode,
  controleerKortingscode,
  formatteerFactuurnummer,
  jaarInNederland,
  normaliseerCode,
  type Kortingscode,
} from "../prijs";

function code(overrides: Partial<Kortingscode> = {}): Kortingscode {
  return {
    code: "WELKOM10",
    soort: "percentage",
    waarde: 10,
    geldig_tot: null,
    max_gebruik: null,
    aantal_gebruikt: 0,
    actief: true,
    ...overrides,
  };
}

describe("berekenKorting", () => {
  it("geeft geen korting zonder code", () => {
    expect(berekenKorting(2495, null)).toEqual({ kortingCent: 0, eindbedragCent: 2495 });
  });

  it("berekent een percentage en rondt af op centen", () => {
    expect(berekenKorting(2495, { soort: "percentage", waarde: 10 })).toEqual({
      kortingCent: 250,
      eindbedragCent: 2245,
    });
  });

  it("100% maakt de bestelling gratis", () => {
    expect(berekenKorting(2495, { soort: "percentage", waarde: 100 })).toEqual({
      kortingCent: 2495,
      eindbedragCent: 0,
    });
  });

  it("trekt een vast bedrag af", () => {
    expect(berekenKorting(2495, { soort: "bedrag", waarde: 500 })).toEqual({
      kortingCent: 500,
      eindbedragCent: 1995,
    });
  });

  it("korting is nooit hoger dan de prijs", () => {
    expect(berekenKorting(2495, { soort: "bedrag", waarde: 5000 })).toEqual({
      kortingCent: 2495,
      eindbedragCent: 0,
    });
    expect(berekenKorting(2495, { soort: "percentage", waarde: 150 }).eindbedragCent).toBe(0);
  });
});

describe("controleerKortingscode", () => {
  const nu = new Date("2026-10-02T12:00:00Z");

  it("accepteert een geldige code", () => {
    expect(controleerKortingscode(code(), nu)).toBeNull();
  });

  it("weigert onbekende of inactieve codes", () => {
    expect(controleerKortingscode(null, nu)).toMatch(/niet geldig/);
    expect(controleerKortingscode(code({ actief: false }), nu)).toMatch(/niet geldig/);
  });

  it("weigert verlopen codes", () => {
    expect(controleerKortingscode(code({ geldig_tot: "2026-10-01T00:00:00Z" }), nu)).toMatch(/verlopen/);
    expect(controleerKortingscode(code({ geldig_tot: "2026-10-03T00:00:00Z" }), nu)).toBeNull();
  });

  it("weigert opgebruikte codes", () => {
    expect(controleerKortingscode(code({ max_gebruik: 1, aantal_gebruikt: 1 }), nu)).toMatch(/al gebruikt/);
    expect(controleerKortingscode(code({ max_gebruik: 2, aantal_gebruikt: 1 }), nu)).toBeNull();
  });
});

describe("btwSplitsing", () => {
  it("splitst 21% btw uit een bedrag inclusief btw", () => {
    expect(btwSplitsing(2495)).toEqual({ exclCent: 2062, btwCent: 433, inclCent: 2495 });
    expect(btwSplitsing(12100)).toEqual({ exclCent: 10000, btwCent: 2100, inclCent: 12100 });
  });

  it("excl + btw is altijd precies het totaal", () => {
    for (const incl of [1, 99, 1999, 2495, 3333, 4999]) {
      const s = btwSplitsing(incl);
      expect(s.exclCent + s.btwCent).toBe(incl);
    }
  });

  it("nul blijft nul", () => {
    expect(btwSplitsing(0)).toEqual({ exclCent: 0, btwCent: 0, inclCent: 0 });
  });
});

describe("factuurnummer", () => {
  it("vult aan tot vier cijfers", () => {
    expect(formatteerFactuurnummer(2026, 1)).toBe("LT-2026-0001");
    expect(formatteerFactuurnummer(2026, 123)).toBe("LT-2026-0123");
    expect(formatteerFactuurnummer(2027, 12345)).toBe("LT-2027-12345");
  });

  it("gebruikt het Nederlandse kalenderjaar", () => {
    // 31 dec 23:30 UTC is in Amsterdam al 1 januari.
    expect(jaarInNederland(new Date("2026-12-31T23:30:00Z"))).toBe(2027);
    expect(jaarInNederland(new Date("2026-06-15T10:00:00Z"))).toBe(2026);
  });
});

describe("codes", () => {
  it("normaliseert invoer", () => {
    expect(normaliseerCode("  welkom 10 ")).toBe("WELKOM10");
  });

  it("maakt een leesbare cadeauboncode", () => {
    const c = cadeauboncode(new Uint8Array([0, 1, 2, 3, 4, 5, 6, 7]));
    expect(c).toBe("CADEAU-ABCD-EFGH");
    expect(cadeauboncode(new Uint8Array(8).fill(255))).toMatch(/^CADEAU-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
  });
});
