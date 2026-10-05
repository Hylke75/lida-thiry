import { describe, it, expect } from "vitest";
import {
  minFormaat,
  STANDAARD_EISEN,
  isTeKlein,
  naamSuggestie,
  slug,
  NAAM_PATROON,
  kaderAfmetingen,
  controleerUpload,
} from "../beeldbank-regels";

describe("2:3-kader", () => {
  it("vult een breed beeld aan in de hoogte", () => {
    expect(kaderAfmetingen(1000, 1000)).toEqual({ breedte: 1000, hoogte: 1500, aangevuld: true });
  });
  it("vult een lang beeld aan in de breedte", () => {
    expect(kaderAfmetingen(500, 1500)).toEqual({ breedte: 1000, hoogte: 1500, aangevuld: true });
  });
  it("laat een 2:3-beeld ongemoeid", () => {
    expect(kaderAfmetingen(1000, 1500)).toEqual({ breedte: 1000, hoogte: 1500, aangevuld: false });
  });
  it("accepteert een groot genoeg beeld met melding over aanvullen", () => {
    const r = controleerUpload(800, 800);
    expect(r.fouten).toEqual([]);
    expect(r.melding).toContain("aangevuld met wit");
  });
  it("weigert een te klein beeld", () => {
    expect(controleerUpload(300, 400).fouten).toHaveLength(1);
  });
});

describe("minimaal formaat", () => {
  it("geeft de kortste zijde MIN_KORTE_ZIJDE", () => {
    expect(minFormaat(3, 4)).toEqual({ min_breedte: 600, min_hoogte: 800 });
    expect(minFormaat(16, 9)).toEqual({ min_breedte: 1067, min_hoogte: 600 });
    expect(minFormaat(1, 1)).toEqual({ min_breedte: 600, min_hoogte: 600 });
  });

  it("gebruikt altijd de standaard 2:3, minimaal 600 × 900", () => {
    expect(STANDAARD_EISEN).toEqual({
      verhouding_b: 2,
      verhouding_h: 3,
      min_breedte: 600,
      min_hoogte: 900,
    });
  });
});

describe("isTeKlein", () => {
  it("herkent een te klein huidig beeld", () => {
    expect(isTeKlein({ breedte: 300, hoogte: 400, min_breedte: 600, min_hoogte: 800 })).toBe(true);
    expect(isTeKlein({ breedte: null, hoogte: null, min_breedte: 600, min_hoogte: 800 })).toBe(false);
  });
});

describe("naamgeving", () => {
  it("maakt een naam volgens de conventie", () => {
    expect(
      naamSuggestie({ onderdeel: "tops", omschrijving: "V-hals", figuur: "A", advies: "goed" }),
    ).toBe("tops-v-hals-a-goed");
    expect(naamSuggestie({ onderdeel: "rokken", omschrijving: "Wijde rok (één stuk)" })).toBe(
      "rokken-wijde-rok-een-stuk",
    );
  });

  it("slug en patroon passen bij elkaar", () => {
    expect(NAAM_PATROON.test(slug("  Jasjes & Mantels  "))).toBe(true);
    expect(NAAM_PATROON.test("Tops_V")).toBe(false);
  });
});
