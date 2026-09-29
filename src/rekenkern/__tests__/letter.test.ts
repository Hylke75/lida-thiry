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

  it("mapt de met Lida vastgestelde FFIT-types", () => {
    expect(bepaalLetter("Rechthoek")).toBe("H");
    expect(bepaalLetter("Lepel")).toBe("A");
    expect(bepaalLetter("Onderste zandloper")).toBe("8");
    expect(bepaalLetter("Bovenste zandloper")).toBe("8");
  });

  it("is productie-gereed nu de mapping compleet is", () => {
    expect(isMappingCompleet()).toBe(true);
    expect(ontbrekendeLetters().length).toBe(0);
  });

  it("vergelijkt gekozen silhouet met de berekende letter", () => {
    expect(vergelijkSilhouet("X", "X")).toBe("gelijk");
    expect(vergelijkSilhouet("X", "A")).toBe("verschil");
    expect(vergelijkSilhouet("X", null)).toBe("verschil");
  });
});
