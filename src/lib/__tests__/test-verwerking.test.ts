import { describe, it, expect } from "vitest";
import { verwerkTest, type TestInvoer } from "../test-verwerking";

function invoer(overrides: Partial<TestInvoer>): TestInvoer {
  return {
    lengte_cm: 172,
    gewicht_kg: 63,
    // Onderste zandloper -> letter 8.
    maten: { borst: 92, taille: 79, hogeHeup: 93, heup: 103 },
    controlemetingen: {},
    gekozen_silhouet: "8",
    pasvormantwoorden: {},
    hermeting: false,
    ...overrides,
  };
}

describe("verwerkTest: altijd een definitief type, nooit handmatige beoordeling", () => {
  it("geeft het berekende type als silhouet en maten overeenkomen", () => {
    const u = verwerkTest(invoer({}), "excel");
    expect(u).toMatchObject({ soort: "type", sleutel: "68", ffit_type: "Onderste zandloper" });
  });

  it("vraagt bij een silhouetverschil eerst om hermeting", () => {
    const u = verwerkTest(invoer({ gekozen_silhouet: "X" }), "excel");
    expect(u).toMatchObject({ soort: "silhouet_verschil", berekendeLetter: "8" });
  });

  it("laat na hermeting de maten winnen bij een blijvend silhouetverschil", () => {
    const u = verwerkTest(invoer({ gekozen_silhouet: "X", hermeting: true }), "excel");
    expect(u).toMatchObject({ soort: "type", sleutel: "68", letter: "8" });
  });

  it("gebruikt het gekozen silhouet als de maten bij geen figuurtype passen", () => {
    const u = verwerkTest(
      invoer({
        maten: { borst: 100, taille: 76, hogeHeup: 85, heup: 106 },
        gekozen_silhouet: "A",
      }),
      "excel",
    );
    expect(u).toMatchObject({ soort: "type", sleutel: "6A", ffit_type: "Geen type" });
  });
});

describe("verwerkTest: extra figuurtypes I en O (verfijning)", () => {
  // Rechthoek (H): borst 84, taille 72, hoge heup 82, heup 86.
  const recht = { borst: 84, taille: 72, hogeHeup: 82, heup: 86 };
  // Rechthoek met volle taille en hoge balans: O.
  const appel = { borst: 100, taille: 96, hogeHeup: 97, heup: 98 };
  const aan = { aan: true, beschikbaar: ["I", "O"] };

  it("verandert niets zonder verfijning (standaard) of als de schakelaar uit staat", () => {
    for (const verfijning of [undefined, { aan: false, beschikbaar: ["I", "O"] }]) {
      expect(
        verwerkTest(invoer({ maten: recht, gekozen_silhouet: "H", behamaat_band: 65 }), "excel", undefined, verfijning),
      ).toMatchObject({ soort: "type", sleutel: "6H", letter: "H", ffit_type: "Rechthoek" });
      expect(verwerkTest(invoer({ maten: appel, gekozen_silhouet: "H" }), "excel", undefined, verfijning)).toMatchObject(
        { soort: "type", letter: "H" },
      );
    }
  });

  it("geeft I bij H en bandmaat 70; H bij 75", () => {
    expect(
      verwerkTest(invoer({ maten: recht, gekozen_silhouet: "I", behamaat_band: 70 }), "excel", undefined, aan),
    ).toMatchObject({ soort: "type", sleutel: "6I", letter: "I", ffit_type: "Rechthoek" });
    expect(
      verwerkTest(invoer({ maten: recht, gekozen_silhouet: "H", behamaat_band: 75 }), "excel", undefined, aan),
    ).toMatchObject({ soort: "type", sleutel: "6H" });
  });

  it("geeft O bij volle taille en hoge balans", () => {
    expect(verwerkTest(invoer({ maten: appel, gekozen_silhouet: "O" }), "excel", undefined, aan)).toMatchObject({
      soort: "type",
      sleutel: "6O",
      letter: "O",
    });
  });

  it("vergelijkt het gekozen silhouet met de verfijnde letter", () => {
    expect(verwerkTest(invoer({ maten: appel, gekozen_silhouet: "H" }), "excel", undefined, aan)).toMatchObject({
      soort: "silhouet_verschil",
      berekendeLetter: "O",
    });
  });

  it("houdt de gewone letter als het type niet beschikbaar is", () => {
    expect(
      verwerkTest(invoer({ maten: appel, gekozen_silhouet: "H" }), "excel", undefined, { aan: true, beschikbaar: [] }),
    ).toMatchObject({ soort: "type", letter: "H" });
  });
});
