import { describe, expect, it } from "vitest";
import { factorNaam, geverifieerdeFactoren, mfaUitkomst, mfaVerplicht, normaliseerCode } from "../mfa-regels";

describe("mfaUitkomst", () => {
  it("met een app: alleen door met een bevestigde sessie (aal2)", () => {
    expect(mfaUitkomst({ heeftFactor: true, niveau: "aal2", verplicht: false })).toBe("ok");
    expect(mfaUitkomst({ heeftFactor: true, niveau: "aal1", verplicht: false })).toBe("code_nodig");
    expect(mfaUitkomst({ heeftFactor: true, niveau: null, verplicht: true })).toBe("code_nodig");
  });
  it("zonder app: verplicht → eerst instellen, anders door", () => {
    expect(mfaUitkomst({ heeftFactor: false, niveau: "aal1", verplicht: true })).toBe("instellen_nodig");
    expect(mfaUitkomst({ heeftFactor: false, niveau: "aal1", verplicht: false })).toBe("ok");
  });
});

describe("geverifieerdeFactoren", () => {
  it("telt alleen geverifieerde factoren (geen half afgemaakte of herstelcodes)", () => {
    const f = [
      { id: "1", status: "verified", factor_type: "totp" },
      { id: "2", status: "unverified", factor_type: "totp" },
      { id: "3", status: "verified", factor_type: "recovery_code" },
      { id: "4", status: "verified", factor_type: "phone" },
    ];
    expect(geverifieerdeFactoren(f).map((x) => x.id)).toEqual(["1", "4"]);
    expect(geverifieerdeFactoren(undefined)).toEqual([]);
  });
});

describe("mfaVerplicht", () => {
  it("alleen 'ja' zet het aan", () => {
    expect(mfaVerplicht("ja")).toBe(true);
    expect(mfaVerplicht(" JA ")).toBe(true);
    expect(mfaVerplicht("nee")).toBe(false);
    expect(mfaVerplicht(null)).toBe(false);
    expect(mfaVerplicht("")).toBe(false);
  });
});

describe("normaliseerCode", () => {
  it("6 cijfers, spaties en streepjes mogen", () => {
    expect(normaliseerCode("123456")).toBe("123456");
    expect(normaliseerCode(" 123 456 ")).toBe("123456");
    expect(normaliseerCode("123-456")).toBe("123456");
  });
  it("weigert de rest", () => {
    for (const v of ["12345", "1234567", "abcdef", "", null, 123456]) expect(normaliseerCode(v)).toBeNull();
  });
});

describe("factorNaam", () => {
  it("standaardnaam en uniek maken", () => {
    expect(factorNaam([])).toBe("Authenticator-app");
    expect(factorNaam([], "  Telefoon  ")).toBe("Telefoon");
    expect(factorNaam([{ friendly_name: "Telefoon" }], "Telefoon")).toBe("Telefoon 2");
    expect(factorNaam([{ friendly_name: "Authenticator-app" }, { friendly_name: "Authenticator-app 2" }])).toBe(
      "Authenticator-app 3",
    );
  });
});
