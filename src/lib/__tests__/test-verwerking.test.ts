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
