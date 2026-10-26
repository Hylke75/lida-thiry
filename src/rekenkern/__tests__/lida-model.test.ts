import { describe, expect, it } from "vitest";
import { bepaalSilhouetLida, lidaKengetallen } from "../lida-model";
import { LIDA_GRENZEN_STANDAARD } from "../config/lida-model";

const m = (borst: number, taille: number, hogeHeup: number, heup: number) => ({ borst, taille, hogeHeup, heup });

describe("F. Rekenmethode van Lida", () => {
  it("rekent in procenten", () => {
    const k = lidaKengetallen(m(87, 71, 85, 100));
    expect(k.heupVoorsprong).toBeCloseTo(13 / 87);
    expect(k.tailleRatio).toBeCloseTo(0.71);
    expect(k.hogeHeupRatio).toBeCloseTo(0.85);
  });

  describe("Lida's voorbeelden (antwoorden 26-10-2026)", () => {
    it("a. borst 94, taille 78, hoge heup 90, heup 101: H ('kan goed zijn')", () => {
      expect(bepaalSilhouetLida({ maten: m(94, 78, 90, 101), breedstePunt: "gelijk" }).letter).toBe("H");
    });

    it("b. borst 86, taille 67, hoge heup 85, heup 89: V met brede schouders", () => {
      expect(bepaalSilhouetLida({ maten: m(86, 67, 85, 89), breedstePunt: "schouders" }).letter).toBe("V");
    });

    it("c. borst 95, taille 81, hoge heup 103, heup 103: eerder een Lepel (hoge en lage heup gelijk)", () => {
      expect(bepaalSilhouetLida({ maten: m(95, 81, 103, 103), breedstePunt: "heupen" }).letter).toBe("8");
    });
  });

  it("Lepel tegenover Peer: de vorm van de heup beslist", () => {
    // Recht ("plankje"): hoge heup bijna even breed als de lage heup.
    expect(bepaalSilhouetLida({ maten: m(87, 71, 97, 100) }).letter).toBe("8");
    // Ronde overgang: hoge heup duidelijk smaller.
    expect(bepaalSilhouetLida({ maten: m(87, 71, 85, 100) }).letter).toBe("A");
  });

  it("bij twijfel over de heupvorm beslist het bovenlichaam, en anders geen type", () => {
    const twijfel = m(87, 71, 92, 100); // hoge heup 92%: tussen Peer (≤ 90%) en Lepel (≥ 95%)
    expect(bepaalSilhouetLida({ maten: twijfel, bovenlichaam: "kort" }).letter).toBe("8");
    expect(bepaalSilhouetLida({ maten: twijfel, bovenlichaam: "lang" }).letter).toBe("A");
    expect(bepaalSilhouetLida({ maten: twijfel, bovenlichaam: "gemiddeld" }).letter).toBeNull();
  });

  it("Zandloper: in balans met een taille van minstens 25% kleiner; anders Rechthoek", () => {
    expect(bepaalSilhouetLida({ maten: m(96, 70, 90, 98), breedstePunt: "gelijk" }).letter).toBe("X");
    expect(bepaalSilhouetLida({ maten: m(96, 80, 92, 98), breedstePunt: "gelijk" }).letter).toBe("H");
  });

  it("borst voller dan de heup: X met taille, anders V", () => {
    expect(bepaalSilhouetLida({ maten: m(108, 76, 90, 98) }).letter).toBe("X");
    expect(bepaalSilhouetLida({ maten: m(108, 90, 92, 98) }).letter).toBe("V");
  });

  it("schouders het breedst: V; tegenstrijdig met de maten: geen type", () => {
    expect(bepaalSilhouetLida({ maten: m(96, 80, 92, 98), breedstePunt: "schouders" }).letter).toBe("V");
    const tegen = bepaalSilhouetLida({ maten: m(85, 70, 90, 105), breedstePunt: "schouders" });
    expect(tegen.letter).toBeNull();
    expect(tegen.uitleg).toMatch(/tegen/);
    expect(bepaalSilhouetLida({ maten: m(112, 80, 92, 95), breedstePunt: "heupen" }).letter).toBeNull();
  });

  it("O alleen als O beschikbaar is", () => {
    const appel = m(104, 96, 97, 98);
    expect(bepaalSilhouetLida({ maten: appel }).letter).not.toBe("O");
    expect(bepaalSilhouetLida({ maten: appel }, LIDA_GRENZEN_STANDAARD, ["O"]).letter).toBe("O");
  });

  it("volgt aangepaste grenzen uit het beheer", () => {
    const maten = m(94, 78, 90, 101); // heup 7% voller
    expect(bepaalSilhouetLida({ maten }).letter).toBe("H");
    expect(bepaalSilhouetLida({ maten }, { ...LIDA_GRENZEN_STANDAARD, heupBredMin: 0.05 }).letter).toBe("A");
  });

  it("geeft altijd een uitleg in gewone taal", () => {
    const u = bepaalSilhouetLida({ maten: m(87, 71, 85, 100) });
    expect(u.uitleg).toMatch(/Peer/);
    expect(u.uitleg).toMatch(/15%/);
  });
});
