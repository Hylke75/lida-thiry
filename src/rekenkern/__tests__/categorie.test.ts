import { describe, it, expect } from "vitest";
import { bepaalCategorie } from "../categorie";
import { CATEGORIE_TABEL } from "../config/categorie-tabel";

describe("A. Categorie uit lengte en gewicht", () => {
  it("plaatst een maat binnen een bekende band in de juiste categorie", () => {
    // 148 cm / 42 kg -> categorie 1 (kort-tenger, 145-149: 41-44)
    expect(bepaalCategorie(148, 42).nummer).toBe(1);
    // 148 cm / 55 kg -> categorie 2 (kort-gemiddeld, 145-149: 45-60)
    expect(bepaalCategorie(148, 55).nummer).toBe(2);
    // 166 cm / 70 kg -> categorie 7 (gemiddeld-vol, 165-167: 75-85? nee 70 valt in 6? check)
    // 165-167: gemiddeld 54-74, vol 75-85 -> 70 -> categorie 6
    expect(bepaalCategorie(166, 70).nummer).toBe(6);
    // 181 cm / 110 kg -> categorie 12 (lang-plus)
    expect(bepaalCategorie(181, 110).nummer).toBe(12);
  });

  it("valt onder de laagste grens terug op tenger", () => {
    // 148 cm / 30 kg -> onder tenger-min -> categorie 1 (tenger)
    expect(bepaalCategorie(148, 30).nummer).toBe(1);
  });

  it("valt boven de hoogste grens terug op plus", () => {
    // 148 cm / 150 kg -> boven plus-max -> categorie 4 (kort-plus)
    expect(bepaalCategorie(148, 150).nummer).toBe(4);
  });

  it("lengte onder 145 telt als kort, boven 183 als lang", () => {
    expect(bepaalCategorie(140, 45).categorie.lengtegroep).toBe("kort");
    expect(bepaalCategorie(190, 70).categorie.lengtegroep).toBe("lang");
  });

  it("rondt lengte en gewicht af op hele getallen", () => {
    expect(bepaalCategorie(147.6, 42.4).nummer).toBe(
      bepaalCategorie(148, 42).nummer,
    );
  });

  it("levert voor elke combinatie 140–200 cm x 35–160 kg precies een geldige categorie (geen gaten/overlap)", () => {
    const geldigeNummers = new Set(CATEGORIE_TABEL.map((c) => c.nummer));
    for (let lengte = 140; lengte <= 200; lengte++) {
      for (let gewicht = 35; gewicht <= 160; gewicht++) {
        const res = bepaalCategorie(lengte, gewicht);
        expect(geldigeNummers.has(res.nummer)).toBe(true);
        expect(res.nummer).toBeGreaterThanOrEqual(1);
        expect(res.nummer).toBeLessThanOrEqual(12);
      }
    }
  });
});
