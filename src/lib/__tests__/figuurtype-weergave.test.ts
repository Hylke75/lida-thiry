import { describe, expect, it } from "vitest";
import { andereTypes, figuurtypeSleutel, vergelijkMetEigen, verhoudingen, vormAfstand } from "../figuurtype-weergave";

const ZANDLOPER = { schouder: 40, borst: 38, taille: 20, hogeHeup: 30, heup: 40 };
const PEER = { schouder: 28, borst: 28, taille: 23, hogeHeup: 34, heup: 46 };
const OMGEKEERD = { schouder: 48, borst: 42, taille: 28, hogeHeup: 28, heup: 29 };
const RECHTHOEK = { schouder: 34, borst: 33, taille: 32, hogeHeup: 33, heup: 34 };

describe("verhoudingen", () => {
  it("beschrijft een zandloper", () => {
    expect(verhoudingen(ZANDLOPER)).toEqual([
      "Je schouders en heupen zijn ongeveer even breed.",
      "Je taille is duidelijk smaller dan je borst en heupen.",
    ]);
  });
  it("beschrijft een peer en een omgekeerde driehoek", () => {
    expect(verhoudingen(PEER)).toEqual([
      "Je heupen zijn breder dan je schouders.",
      "Je taille is iets smaller dan je borst en heupen.",
      "Je onderlichaam is voller dan je bovenlichaam.",
    ]);
    expect(verhoudingen(OMGEKEERD)[0]).toBe("Je schouders zijn breder dan je heupen.");
    expect(verhoudingen(OMGEKEERD)).toContain("Je bovenlichaam is voller dan je onderlichaam.");
  });
  it("beschrijft een rechthoek", () => {
    expect(verhoudingen(RECHTHOEK)[1]).toBe("Je taille is nauwelijks smaller dan je borst en heupen.");
  });
});

describe("vergelijkMetEigen", () => {
  it("noemt de verschillen ten opzichte van het eigen type", () => {
    expect(vergelijkMetEigen(RECHTHOEK, PEER)).toBe("Smallere schouders, bredere heupen en een meer uitgesproken taille dan jouw type.");
    expect(vergelijkMetEigen(RECHTHOEK, ZANDLOPER)).toBe(
      "Bredere schouders, bredere heupen en een meer uitgesproken taille dan jouw type.",
    );
    expect(vergelijkMetEigen(ZANDLOPER, RECHTHOEK)).toContain("een minder uitgesproken taille");
  });
  it("zegt het als de verhoudingen vergelijkbaar zijn", () => {
    expect(vergelijkMetEigen(RECHTHOEK, { ...RECHTHOEK, heup: 36 })).toBe("Vergelijkbare verhoudingen als jouw type.");
  });
});

describe("andereTypes", () => {
  const types = [
    { letter: "X", vorm: ZANDLOPER },
    { letter: "A", vorm: PEER },
    { letter: "V", vorm: OMGEKEERD },
    { letter: "H", vorm: RECHTHOEK },
  ];
  it("laat het eigen type weg en zet het meest verwante vooraan", () => {
    const uit = andereTypes(types[3], types).map((t) => t.letter);
    expect(uit).not.toContain("H");
    expect(uit).toHaveLength(3);
    const afstanden = uit.map((l) => vormAfstand(RECHTHOEK, types.find((t) => t.letter === l)!.vorm));
    expect([...afstanden].sort((a, b) => a - b)).toEqual(afstanden);
  });
  it("afstand tot zichzelf is nul", () => {
    expect(vormAfstand(PEER, PEER)).toBe(0);
  });
});

describe("figuurtypeSleutel (toegang tot 'Jouw figuurtype')", () => {
  const order = (status: string, toegekend_type: string | null = "6H") => ({ status, toegekend_type });
  it("geeft de sleutel bij een afgeronde, betaalde test", () => {
    expect(figuurtypeSleutel({ toestand: "al_afgerond", order: order("advies_verzonden") })).toBe("6H");
    expect(figuurtypeSleutel({ toestand: "al_afgerond", order: order("test_afgerond") })).toBe("6H");
  });
  it("weigert alles zonder afgeronde test of type", () => {
    expect(figuurtypeSleutel({ toestand: "geldig", order: order("betaald") })).toBeNull();
    expect(figuurtypeSleutel({ toestand: "onbekend" })).toBeNull();
    expect(figuurtypeSleutel({ toestand: "verlopen" })).toBeNull();
    expect(figuurtypeSleutel({ toestand: "niet_betaald", order: order("aangemaakt") })).toBeNull();
    expect(figuurtypeSleutel({ toestand: "al_afgerond", order: order("advies_verzonden", null) })).toBeNull();
    expect(figuurtypeSleutel({ toestand: "al_afgerond", order: order("verlopen") })).toBeNull();
  });
});
