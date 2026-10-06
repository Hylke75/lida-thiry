import { describe, expect, it } from "vitest";
import { INSTELLING_VELDEN, naarInvoer, vanInvoer, veldVoor } from "../instelling-velden";

const prijs = INSTELLING_VELDEN.prijs_cent;
const dagen = INSTELLING_VELDEN.token_geldigheid_dagen;

describe("instelling-velden", () => {
  it("toont centen als euro's", () => {
    expect(naarInvoer(prijs, "2995")).toBe("29,95");
    expect(naarInvoer(prijs, null)).toBe("");
  });

  it("slaat euro's op als centen", () => {
    expect(vanInvoer(prijs, "29,95")).toEqual({ ok: true, waarde: "2995" });
    expect(vanInvoer(prijs, "€ 30")).toEqual({ ok: true, waarde: "3000" });
    expect(vanInvoer(prijs, "12.5")).toEqual({ ok: true, waarde: "1250" });
    expect(vanInvoer(prijs, "")).toEqual({ ok: true, waarde: null });
    expect(vanInvoer(prijs, "abc").ok).toBe(false);
    expect(vanInvoer(prijs, "0").ok).toBe(false);
  });

  it("valideert gehele getallen binnen grenzen", () => {
    expect(vanInvoer(dagen, "30")).toEqual({ ok: true, waarde: "30" });
    expect(vanInvoer(dagen, "0").ok).toBe(false);
    expect(vanInvoer(dagen, "3,5").ok).toBe(false);
    expect(vanInvoer(dagen, "").ok).toBe(false);
  });

  it("valideert e-mail en keuzes", () => {
    expect(vanInvoer(INSTELLING_VELDEN.adviseur_email, "lida@voorbeeld.nl").ok).toBe(true);
    expect(vanInvoer(INSTELLING_VELDEN.adviseur_email, "geen-mail").ok).toBe(false);
    expect(vanInvoer(INSTELLING_VELDEN.zandloper_variant, "excel").ok).toBe(true);
    expect(vanInvoer(INSTELLING_VELDEN.zandloper_variant, "anders").ok).toBe(false);
  });

  it("geeft onbekende sleutels een tekstveld", () => {
    const v = veldVoor("nieuwe_instelling", "Uitleg uit de database");
    expect(v.soort).toBe("tekst");
    expect(v.label).toBe("Nieuwe instelling");
    expect(v.uitleg).toBe("Uitleg uit de database");
  });
});
