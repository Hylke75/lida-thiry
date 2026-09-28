import { describe, it, expect } from "vitest";
import { bepaalFiguurtype } from "../figuurtype";
import type { FfitType, Maten } from "../types";

// Verplichte testgevallen uit de prompt: borst, taille, hoge heup, heup
// -> verwacht bij FFIT-standaard | bij Excel-variant.
const gevallen: {
  maten: Maten;
  ffit: FfitType;
  excel: FfitType;
}[] = [
  { maten: m(100, 75, 90, 105), ffit: "Zandloper", excel: "Geen type" },
  { maten: m(96, 72, 88, 97), ffit: "Zandloper", excel: "Zandloper" },
  { maten: m(104, 78, 92, 98), ffit: "Bovenste zandloper", excel: "Zandloper" },
  { maten: m(92, 74, 86, 105), ffit: "Onderste zandloper", excel: "Onderste zandloper" },
  { maten: m(92, 70, 90, 102), ffit: "Lepel", excel: "Lepel" },
  { maten: m(90, 80, 88, 100), ffit: "Driehoek / peer", excel: "Driehoek / peer" },
  { maten: m(104, 90, 98, 94), ffit: "Omgekeerde driehoek", excel: "Omgekeerde driehoek" },
  { maten: m(96, 84, 92, 98), ffit: "Rechthoek", excel: "Rechthoek" },
  { maten: m(130, 120, 135, 125), ffit: "Rechthoek", excel: "Rechthoek" },
];

function m(borst: number, taille: number, hogeHeup: number, heup: number): Maten {
  return { borst, taille, hogeHeup, heup };
}

describe("B. Figuurtype uit maten (FFIT)", () => {
  it("FFIT-standaardvariant: alle verplichte testgevallen", () => {
    for (const g of gevallen) {
      expect(bepaalFiguurtype(g.maten, "ffit"), JSON.stringify(g.maten)).toBe(
        g.ffit,
      );
    }
  });

  it("Excel-variant: alle verplichte testgevallen", () => {
    for (const g of gevallen) {
      expect(bepaalFiguurtype(g.maten, "excel"), JSON.stringify(g.maten)).toBe(
        g.excel,
      );
    }
  });

  it("gebruikt standaard de Excel-variant (besluit Lida Thiry)", () => {
    // Geval 1 verschilt tussen de varianten; zonder argument moet Excel gelden.
    expect(bepaalFiguurtype(m(100, 75, 90, 105))).toBe("Geen type");
    // Geval 3: onder Excel wordt dit 'Zandloper' i.p.v. 'Bovenste zandloper'.
    expect(bepaalFiguurtype(m(104, 78, 92, 98))).toBe("Zandloper");
  });
});
