import { describe, expect, it } from "vitest";
import { normaliseerEmail, veiligVervolg, verwijderBezwaar, wachtwoordBezwaar } from "../beheerder-regels";

describe("normaliseerEmail", () => {
  it("accepteert en normaliseert geldige adressen", () => {
    expect(normaliseerEmail("  Lida@Voorbeeld.NL ")).toBe("lida@voorbeeld.nl");
  });
  it("weigert ongeldige invoer", () => {
    for (const v of ["", "lida", "lida@", "@voorbeeld.nl", "a b@c.nl", "a@b", null, 3]) {
      expect(normaliseerEmail(v)).toBeNull();
    }
  });
});

describe("verwijderBezwaar", () => {
  it("niet jezelf", () => {
    expect(verwijderBezwaar({ mijnId: "a", doelId: "a", aantalBeheerders: 3 })).toMatch(/jezelf/);
  });
  it("niet de laatste", () => {
    expect(verwijderBezwaar({ mijnId: "a", doelId: "b", aantalBeheerders: 1 })).toMatch(/laatste/);
  });
  it("een andere beheerder mag wel", () => {
    expect(verwijderBezwaar({ mijnId: "a", doelId: "b", aantalBeheerders: 2 })).toBeNull();
  });
});

describe("wachtwoordBezwaar", () => {
  it("minimaal 10 tekens", () => {
    expect(wachtwoordBezwaar("kort", "kort")).toMatch(/minstens 10/);
    expect(wachtwoordBezwaar("", "")).toMatch(/Vul/);
  });
  it("twee keer hetzelfde", () => {
    expect(wachtwoordBezwaar("lang-genoeg-1", "lang-genoeg-2")).toMatch(/niet gelijk/);
  });
  it("geen spaties aan de randen en niet te lang", () => {
    expect(wachtwoordBezwaar(" lang-genoeg", " lang-genoeg")).toMatch(/spatie/);
    expect(wachtwoordBezwaar("x".repeat(73), "x".repeat(73))).toMatch(/hoogstens/);
  });
  it("goed wachtwoord", () => {
    expect(wachtwoordBezwaar("paarse-jas-2026", "paarse-jas-2026")).toBeNull();
  });
});

describe("veiligVervolg", () => {
  it("laat alleen interne paden toe", () => {
    expect(veiligVervolg("/admin/beheerders?welkom=1")).toBe("/admin/beheerders?welkom=1");
    expect(veiligVervolg("//kwaad.nl")).toBe("/admin");
    expect(veiligVervolg("https://kwaad.nl")).toBe("/admin");
    expect(veiligVervolg("/\\kwaad.nl")).toBe("/admin");
    expect(veiligVervolg(undefined)).toBe("/admin");
  });
});
