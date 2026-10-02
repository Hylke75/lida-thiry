import { describe, it, expect } from "vitest";
import {
  snapVerhouding,
  minFormaat,
  eisenUitAfmetingen,
  controleerAfmetingen,
  isTeKlein,
  naamSuggestie,
  slug,
  NAAM_PATROON,
} from "../beeldbank-regels";

describe("verhouding", () => {
  it("rondt af naar een gangbare verhouding", () => {
    expect(snapVerhouding(300, 400)).toEqual([3, 4]);
    expect(snapVerhouding(612, 600)).toEqual([1, 1]);
    expect(snapVerhouding(1920, 1080)).toEqual([16, 9]);
  });

  it("valt terug op de eigen verhouding als niets in de buurt komt", () => {
    expect(snapVerhouding(1150, 1000)).toEqual([7, 6]);
  });
});

describe("minimaal formaat", () => {
  it("geeft de kortste zijde MIN_KORTE_ZIJDE", () => {
    expect(minFormaat(3, 4)).toEqual({ min_breedte: 600, min_hoogte: 800 });
    expect(minFormaat(16, 9)).toEqual({ min_breedte: 1067, min_hoogte: 600 });
    expect(minFormaat(1, 1)).toEqual({ min_breedte: 600, min_hoogte: 600 });
  });

  it("leidt eisen af van het origineel", () => {
    expect(eisenUitAfmetingen(240, 320)).toEqual({
      verhouding_b: 3,
      verhouding_h: 4,
      min_breedte: 600,
      min_hoogte: 800,
    });
  });
});

describe("controleerAfmetingen", () => {
  const eisen = { verhouding_b: 3, verhouding_h: 4, min_breedte: 600, min_hoogte: 800 };

  it("keurt een goed beeld goed", () => {
    expect(controleerAfmetingen(1200, 1600, eisen)).toEqual([]);
    expect(controleerAfmetingen(1200, 1620, eisen)).toEqual([]); // binnen 3%
  });

  it("meldt een verkeerde verhouding", () => {
    const f = controleerAfmetingen(1600, 1200, eisen);
    expect(f).toHaveLength(1);
    expect(f[0]).toContain("4:3 (liggend)");
    expect(f[0]).toContain("3:4 (staand)");
  });

  it("meldt een te klein beeld", () => {
    const f = controleerAfmetingen(300, 400, eisen);
    expect(f).toHaveLength(1);
    expect(f[0]).toContain("600 × 800");
  });

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
