import { describe, it, expect } from "vitest";
import {
  VERFIJNING_UIT,
  pastBijI,
  pastBijO,
  verfijnLetter,
  verfijningsRegel,
  type VerfijningInvoer,
} from "../verfijning";
import { VERFIJNING_GRENZEN, O_VANUIT_FFIT } from "../config/verfijning";
import { bepaalFiguurtype } from "../figuurtype";
import { bepaalLetter } from "../letter";
import type { FfitType } from "../types";

const ALLES_AAN = { aan: true, beschikbaar: ["I", "O"] } as const;

// Rechthoek met volle taille en hoge balans: borst 100, taille 96, heup 98.
const O_MATEN = { borst: 100, taille: 96, heup: 98 };
// Rechthoek, slank en recht: borst 84, taille 72, heup 86 (taille 0,84 x heup).
const RECHT = { borst: 84, taille: 72, heup: 86 };

function invoer(over: Partial<VerfijningInvoer> = {}): VerfijningInvoer {
  return { ffit: "Rechthoek", letter: "H", maten: RECHT, bandmaat: null, ...over };
}

describe("grenzen (VOORLOPIG)", () => {
  it("staan in de configuratie", () => {
    expect(VERFIJNING_GRENZEN.iMaxBandmaat).toBe(70);
    expect(VERFIJNING_GRENZEN.oMinTailleHeupRatio).toBe(0.95);
    expect(VERFIJNING_GRENZEN.oMinBorstMinHeup).toBe(0);
    expect([...O_VANUIT_FFIT]).toEqual(["Rechthoek", "Omgekeerde driehoek"]);
  });
});

describe("pastBijI", () => {
  it("geeft I bij letter H en bandmaat 70 of kleiner (grens inclusief)", () => {
    expect(pastBijI("H", 70)).toBe(true);
    expect(pastBijI("H", 65)).toBe(true);
    expect(pastBijI("H", 60)).toBe(true);
  });

  it("geeft geen I vanaf 71 (75 = H)", () => {
    expect(pastBijI("H", 71)).toBe(false);
    expect(pastBijI("H", 75)).toBe(false);
    expect(pastBijI("H", 90)).toBe(false);
  });

  it("geeft geen I zonder (geldige) bandmaat", () => {
    expect(pastBijI("H", null)).toBe(false);
    expect(pastBijI("H", undefined)).toBe(false);
    expect(pastBijI("H", Number.NaN)).toBe(false);
    expect(pastBijI("H", 0)).toBe(false);
  });

  it("geeft alleen I vanuit H", () => {
    for (const l of ["X", "A", "V", "8", null]) expect(pastBijI(l, 65)).toBe(false);
  });
});

describe("pastBijO", () => {
  it("geeft O bij Rechthoek of Omgekeerde driehoek met volle taille en hoge balans", () => {
    expect(pastBijO("Rechthoek", O_MATEN)).toBe(true);
    expect(pastBijO("Omgekeerde driehoek", { borst: 110, taille: 96, heup: 98 })).toBe(true);
  });

  it("taille / heup = 0,95 telt mee (grens inclusief); net eronder niet", () => {
    expect(pastBijO("Rechthoek", { borst: 101, taille: 95, heup: 100 })).toBe(true);
    expect(pastBijO("Rechthoek", { borst: 81, taille: 76, heup: 80 })).toBe(true);
    expect(pastBijO("Rechthoek", { borst: 101, taille: 94, heup: 100 })).toBe(false);
    expect(pastBijO("Rechthoek", { borst: 101, taille: 94.99, heup: 100 })).toBe(false);
  });

  it("taille breder dan de heup telt ook als O", () => {
    expect(pastBijO("Rechthoek", { borst: 104, taille: 102, heup: 100 })).toBe(true);
  });

  it("vraagt een borst strikt groter dan de heup", () => {
    expect(pastBijO("Rechthoek", { borst: 100, taille: 96, heup: 100 })).toBe(false);
    expect(pastBijO("Rechthoek", { borst: 99, taille: 96, heup: 100 })).toBe(false);
    expect(pastBijO("Rechthoek", { borst: 101, taille: 96, heup: 100 })).toBe(true);
  });

  it("geldt niet voor de andere FFIT-uitkomsten (ook niet bij 'Geen type')", () => {
    const anders: FfitType[] = ["Zandloper", "Onderste zandloper", "Bovenste zandloper", "Lepel", "Driehoek / peer", "Geen type"];
    for (const f of anders) expect(pastBijO(f, O_MATEN)).toBe(false);
  });

  it("is veilig bij een ongeldige heup", () => {
    expect(pastBijO("Rechthoek", { borst: 100, taille: 96, heup: 0 })).toBe(false);
  });
});

describe("verfijningsRegel", () => {
  it("O gaat voor I", () => {
    expect(verfijningsRegel(invoer({ maten: O_MATEN, bandmaat: 65 }))).toBe("O");
  });
  it("I als alleen de bandmaat klopt", () => {
    expect(verfijningsRegel(invoer({ bandmaat: 70 }))).toBe("I");
  });
  it("niets bij 'Geen type' (letter null): dan kiest de klant", () => {
    expect(verfijningsRegel(invoer({ ffit: "Geen type", letter: null, maten: O_MATEN, bandmaat: 65 }))).toBeNull();
  });
});

describe("verfijnLetter", () => {
  it("verandert niets als de schakelaar uit staat", () => {
    const gevallen: VerfijningInvoer[] = [
      invoer({ bandmaat: 65 }),
      invoer({ maten: O_MATEN }),
      invoer({ ffit: "Omgekeerde driehoek", letter: "V", maten: { borst: 110, taille: 96, heup: 98 } }),
      invoer({ ffit: "Geen type", letter: null }),
    ];
    for (const g of gevallen) {
      expect(verfijnLetter(g, VERFIJNING_UIT)).toBe(g.letter);
      expect(verfijnLetter(g, { aan: false, beschikbaar: ["I", "O"] })).toBe(g.letter);
    }
  });

  it("geeft I of O als de schakelaar aan staat en het type beschikbaar is", () => {
    expect(verfijnLetter(invoer({ bandmaat: 70 }), ALLES_AAN)).toBe("I");
    expect(verfijnLetter(invoer({ bandmaat: 75 }), ALLES_AAN)).toBe("H");
    expect(verfijnLetter(invoer({ maten: O_MATEN }), ALLES_AAN)).toBe("O");
    expect(
      verfijnLetter(
        invoer({ ffit: "Omgekeerde driehoek", letter: "V", maten: { borst: 110, taille: 96, heup: 98 } }),
        ALLES_AAN,
      ),
    ).toBe("O");
  });

  it("houdt de letter als het type niet beschikbaar is (niet actief of zonder advies)", () => {
    expect(verfijnLetter(invoer({ bandmaat: 65 }), { aan: true, beschikbaar: ["O"] })).toBe("H");
    expect(verfijnLetter(invoer({ maten: O_MATEN }), { aan: true, beschikbaar: ["I"] })).toBe("H");
    expect(verfijnLetter(invoer({ bandmaat: 65 }), { aan: true, beschikbaar: [] })).toBe("H");
  });

  it("valt niet terug op I als de maten op O wijzen maar O niet beschikbaar is", () => {
    expect(verfijnLetter(invoer({ maten: O_MATEN, bandmaat: 65 }), { aan: true, beschikbaar: ["I"] })).toBe("H");
  });

  it("laat 'Geen type' (letter null) ongemoeid", () => {
    expect(verfijnLetter(invoer({ ffit: "Geen type", letter: null, bandmaat: 65 }), ALLES_AAN)).toBeNull();
  });

  it("geeft geen I vanuit een andere letter dan H", () => {
    expect(verfijnLetter(invoer({ ffit: "Zandloper", letter: "X", bandmaat: 65 }), ALLES_AAN)).toBe("X");
  });
});

describe("samen met de FFIT-regels", () => {
  it("de O-voorbeeldmaten zijn echt een Rechthoek (H)", () => {
    const ffit = bepaalFiguurtype({ ...O_MATEN, hogeHeup: 97 }, "excel");
    expect(ffit).toBe("Rechthoek");
    expect(bepaalLetter(ffit)).toBe("H");
  });

  it("de rechte voorbeeldmaten zijn een Rechthoek (H)", () => {
    expect(bepaalFiguurtype({ ...RECHT, hogeHeup: 82 }, "excel")).toBe("Rechthoek");
  });

  it("een zandloper wordt nooit O, ook niet met dezelfde borst en heup", () => {
    const maten = { borst: 100, taille: 75, hogeHeup: 90, heup: 98 };
    const ffit = bepaalFiguurtype(maten, "excel");
    expect(ffit).toBe("Zandloper");
    expect(verfijnLetter({ ffit, letter: bepaalLetter(ffit), maten }, ALLES_AAN)).toBe("X");
  });
});
