import { describe, it, expect } from "vitest";
import {
  bepaalLetter,
  isMappingCompleet,
  ontbrekendeLetters,
  vergelijkSilhouet,
} from "../letter";

describe("C. FFIT-type naar figuurletter", () => {
  it("mapt de bekende voorbeelden uit de prompt", () => {
    expect(bepaalLetter("Zandloper")).toBe("X");
    expect(bepaalLetter("Driehoek / peer")).toBe("A");
    expect(bepaalLetter("Omgekeerde driehoek")).toBe("V");
  });

  it("geeft null (twijfelgeval) voor 'Geen type'", () => {
    expect(bepaalLetter("Geen type")).toBeNull();
  });

  it("geeft null voor nog niet toegewezen FFIT-types (OPEN-punt)", () => {
    expect(bepaalLetter("Rechthoek")).toBeNull();
    expect(bepaalLetter("Lepel")).toBeNull();
  });

  it("is niet productie-gereed zolang de mapping incompleet is", () => {
    expect(isMappingCompleet()).toBe(false);
    expect(ontbrekendeLetters().length).toBeGreaterThan(0);
  });

  it("vergelijkt gekozen silhouet met de berekende letter", () => {
    expect(vergelijkSilhouet("X", "X")).toBe("gelijk");
    expect(vergelijkSilhouet("X", "A")).toBe("verschil");
    expect(vergelijkSilhouet("X", null)).toBe("verschil");
  });
});
