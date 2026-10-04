import { describe, expect, it } from "vitest";
import { combineer, standaardWaarden } from "../inhoud/schema";
import { MAAT_GROEPEN, MAAT_VELDEN, MEET_TIP, PASVORMVRAGEN } from "../test-config";
import {
  TEST_MATEN,
  TEST_METEN,
  TEST_VRAGEN,
  maatVeldenMetTeksten,
  meetStapTitel,
  pasvormVragen,
  schoonPasvormAntwoorden,
} from "../inhoud/groepen/test";

describe("teksten van de test", () => {
  it("neemt de standaardteksten over uit test-config", () => {
    expect(maatVeldenMetTeksten(standaardWaarden(TEST_MATEN))).toEqual(MAAT_VELDEN);
    const meten = standaardWaarden(TEST_METEN);
    expect(meten.tip).toBe(MEET_TIP);
    expect(MAAT_GROEPEN.map((g) => meetStapTitel(meten, g.sleutel))).toEqual([
      "Bovenlichaam",
      "Taille",
      "Heupen en benen",
    ]);
  });

  it("gebruikt de sleutels uit de code als vaste ids van de pasvormvragen", () => {
    const vragen = pasvormVragen(standaardWaarden(TEST_VRAGEN));
    expect(vragen).toEqual(PASVORMVRAGEN);
  });

  it("leest aangepaste vragen en opties (één per regel)", () => {
    const vragen = pasvormVragen(
      combineer(TEST_VRAGEN, {
        vragen: [
          { _id: "nieuw", vraag: " Nieuwe vraag ", opties: "Ja\n\n Nee \nJa" },
          { _id: "leeg", vraag: "Zonder opties", opties: "" },
        ],
      }),
    );
    expect(vragen).toEqual([{ sleutel: "nieuw", vraag: "Nieuwe vraag", opties: ["Ja", "Nee"] }]);
  });

  it("bewaart alleen antwoorden op bestaande vragen en opties", () => {
    const vragen = pasvormVragen(standaardWaarden(TEST_VRAGEN));
    expect(
      schoonPasvormAntwoorden(
        { gewicht_erbij: "Bovenlichaam", taille_zichtbaar: "Misschien", weg: "Ja", x: 1 },
        vragen,
      ),
    ).toEqual({ gewicht_erbij: "Bovenlichaam" });
    expect(schoonPasvormAntwoorden(null, vragen)).toEqual({});
    expect(schoonPasvormAntwoorden(["a"], vragen)).toEqual({});
  });
});
