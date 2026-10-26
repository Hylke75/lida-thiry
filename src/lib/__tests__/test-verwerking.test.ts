import { describe, it, expect } from "vitest";
import { verwerkTest, type TestInvoer } from "../test-verwerking";

function invoer(overrides: Partial<TestInvoer>): TestInvoer {
  return {
    lengte_cm: 172,
    gewicht_kg: 63,
    // Onderste zandloper -> letter X (sinds 26-10-2026; daarvoor 8).
    maten: { borst: 92, taille: 79, hogeHeup: 93, heup: 103 },
    controlemetingen: {},
    gekozen_silhouet: "X",
    pasvormantwoorden: {},
    hermeting: false,
    ...overrides,
  };
}

describe("verwerkTest: altijd een definitief type, nooit handmatige beoordeling", () => {
  it("geeft het berekende type als silhouet en maten overeenkomen", () => {
    const u = verwerkTest(invoer({}), "excel");
    expect(u).toMatchObject({ soort: "type", sleutel: "6X", ffit_type: "Onderste zandloper", rekenmodel: "ffit" });
  });

  it("vraagt bij een silhouetverschil eerst om hermeting", () => {
    const u = verwerkTest(invoer({ gekozen_silhouet: "8" }), "excel");
    expect(u).toMatchObject({ soort: "silhouet_verschil", berekendeLetter: "X" });
  });

  it("laat na hermeting de maten winnen bij een blijvend silhouetverschil", () => {
    const u = verwerkTest(invoer({ gekozen_silhouet: "8", hermeting: true }), "excel");
    expect(u).toMatchObject({ soort: "type", sleutel: "6X", letter: "X" });
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

describe("verwerkTest: rekenmethode van Lida", () => {
  const lida = {
    model: "lida" as const,
    grenzen: { zandloperTailleMax: 0.75, heupBredMin: 0.08, borstBredMin: 0.08, lepelHogeHeupMin: 0.95, peerHogeHeupMax: 0.9 },
  };
  // Lida's voorbeeld c: borst 95, taille 81, hoge heup 103, heup 103 -> Lepel (8).
  const lepel = { borst: 95, taille: 81, hogeHeup: 103, heup: 103 };
  const proporties = { schouderbreedte: 38, breedste_punt: "heupen" as const, bovenlichaam: "kort" as const };

  it("geeft de Lepel waar FFIT ook een Lepel zag, en bewaart de FFIT-uitkomst", () => {
    const u = verwerkTest(
      invoer({ maten: lepel, gekozen_silhouet: "8", proporties }),
      "excel",
      undefined,
      undefined,
      lida,
    );
    expect(u).toMatchObject({ soort: "type", letter: "8", rekenmodel: "lida", ffit_type: "Lepel" });
  });

  it("geen duidelijk silhouet: eerst de keuze, met eigen keuze het gekozen silhouet", () => {
    const tegen = { borst: 85, taille: 70, hogeHeup: 90, heup: 105 };
    const p = { ...proporties, breedste_punt: "schouders" as const };
    expect(
      verwerkTest(invoer({ maten: tegen, gekozen_silhouet: "A", proporties: p }), "excel", undefined, undefined, lida),
    ).toMatchObject({ soort: "geen_type" });
    expect(
      verwerkTest(
        invoer({ maten: tegen, gekozen_silhouet: "A", proporties: p, eigen_keuze: true }),
        "excel",
        undefined,
        undefined,
        lida,
      ),
    ).toMatchObject({ soort: "type", letter: "A", rekenmodel: "lida" });
  });

  it("vraagt ook bij Lida's methode eerst om hermeting als het gekozen silhouet afwijkt", () => {
    expect(
      verwerkTest(invoer({ maten: lepel, gekozen_silhouet: "A", proporties }), "excel", undefined, undefined, lida),
    ).toMatchObject({ soort: "silhouet_verschil", berekendeLetter: "8" });
  });
});
