import { describe, it, expect } from "vitest";
import {
  alsSilhouet,
  controleerLichaamstype,
  ontleedTypeSleutel,
  sorteerWaarde,
  typeSleutel,
  STANDAARD_VORM,
} from "../lichaamstype-regels";
import { bepaalLetter, isMappingCompleet } from "@/rekenkern/letter";

describe("typesleutels", () => {
  it("ontleedt bestaande en nieuwe sleutels", () => {
    expect(ontleedTypeSleutel("6A")).toEqual({ categorie: 6, code: "A" });
    expect(ontleedTypeSleutel("12X")).toEqual({ categorie: 12, code: "X" });
    expect(ontleedTypeSleutel("18")).toEqual({ categorie: 1, code: "8" });
    expect(ontleedTypeSleutel("108")).toEqual({ categorie: 10, code: "8" });
    expect(ontleedTypeSleutel("3OV")).toEqual({ categorie: 3, code: "OV" });
    expect(ontleedTypeSleutel("13A")).toBeNull();
    expect(ontleedTypeSleutel("6a")).toBeNull();
    expect(typeSleutel(7, "Y")).toBe("7Y");
  });

  it("sorteert op categorie en daarna op lichaamstype", () => {
    const lijst = ["2A", "1Y", "1X", "18", "10X", "1A"];
    expect([...lijst].sort((a, b) => sorteerWaarde(a) - sorteerWaarde(b))).toEqual(["1X", "1A", "18", "1Y", "2A", "10X"]);
    // Met eigen volgorde uit beheer
    const volgorde = { Y: 0, X: 1, A: 2, "8": 3 };
    expect(["1X", "1Y"].sort((a, b) => sorteerWaarde(a, volgorde) - sorteerWaarde(b, volgorde))).toEqual(["1Y", "1X"]);
  });
});

describe("invoercontrole lichaamstype", () => {
  const basis = { naam: "Lepel", vorm: STANDAARD_VORM };
  it("accepteert een geldig nieuw type", () => {
    expect(controleerLichaamstype({ ...basis, code: "L" }, { nieuw: true, bestaandeCodes: ["X"] })).toEqual([]);
  });
  it("weigert ongeldige of bestaande codes en een lege naam", () => {
    expect(controleerLichaamstype({ ...basis, code: "1" }, { nieuw: true, bestaandeCodes: [] })).toHaveLength(1);
    expect(controleerLichaamstype({ ...basis, code: "X" }, { nieuw: true, bestaandeCodes: ["X"] })[0]).toContain("bestaat al");
    expect(controleerLichaamstype({ code: "Q", naam: " ", vorm: STANDAARD_VORM }, { nieuw: true, bestaandeCodes: [] })).toHaveLength(1);
  });
  it("bewaakt de grenzen van de tekening", () => {
    const f = controleerLichaamstype({ ...basis, vorm: { ...STANDAARD_VORM, taille: 2 } }, { nieuw: false, bestaandeCodes: [] });
    expect(f[0]).toContain("taille");
  });
});

describe("silhouet en koppeling", () => {
  it("zet kenmerken om naar een lijst", () => {
    const s = alsSilhouet({
      code: "X", naam: "Zandloper", alias: null, korte_omschrijving: "", uitleg: "",
      kenmerken: "- smalle taille\n\n• volle heupen", vorm: STANDAARD_VORM, beeld_id: null, volgorde: 1, actief: true,
    });
    expect(s.kenmerken).toEqual(["smalle taille", "volle heupen"]);
  });
  it("gebruikt de koppeling uit beheer voor de berekening", () => {
    expect(bepaalLetter("Lepel", { Lepel: "L" })).toBe("L");
    expect(bepaalLetter("Lepel")).toBe("A"); // standaard
    expect(isMappingCompleet({ Zandloper: "X" })).toBe(false);
  });
});
