import { describe, expect, it } from "vitest";
import {
  fragment,
  ilikeWaarde,
  isIdBegin,
  likeLetterlijk,
  markeer,
  metZoekterm,
  normaliseerZoekterm,
  orGroep,
  orGroepen,
  uuidBereik,
  veiligeZoekterm,
  zoekWoorden,
} from "../zoeken/regels";

describe("veiligeZoekterm", () => {
  it("haalt tekens weg die een PostgREST-filter breken en voegt witruimte samen", () => {
    expect(veiligeZoekterm(" a,b(c)*d%e\"f'g:h\\i ")).toBe("a b c d e f g h i");
    expect(veiligeZoekterm("anna%,(x)*")).toBe("anna x");
    expect(veiligeZoekterm("  v-hals, (goed)%  ")).toBe("v-hals goed");
  });
  it("laat _ standaard staan (e-mailadressen), of haalt die weg op verzoek", () => {
    expect(veiligeZoekterm("an_de@x.nl")).toBe("an_de@x.nl");
    expect(veiligeZoekterm("a_b*c", { underscoreWeg: true })).toBe("a b c");
  });
  it("kort in en geeft lege tekst bij iets anders dan tekst", () => {
    expect(veiligeZoekterm("x".repeat(200))).toHaveLength(100);
    expect(veiligeZoekterm("x".repeat(200), { max: 80 })).toHaveLength(80);
    expect(veiligeZoekterm(["x"])).toBe("");
    expect(veiligeZoekterm(undefined)).toBe("");
  });
});

describe("normaliseerZoekterm", () => {
  it("knipt, voegt witruimte samen en haalt stuurtekens weg", () => {
    expect(normaliseerZoekterm("  Anna \n  de\tVries  ")).toBe("Anna de Vries");
    expect(normaliseerZoekterm("a\u0000b")).toBe("a b");
    expect(normaliseerZoekterm(["eerste", "tweede"])).toBe("eerste");
    expect(normaliseerZoekterm(undefined)).toBe("");
    expect(normaliseerZoekterm(42)).toBe("");
    expect(normaliseerZoekterm("x".repeat(500))).toHaveLength(100);
  });
});

describe("zoekWoorden", () => {
  it("splitst op spaties, zonder dubbelen of sterretjes, hooguit vijf", () => {
    expect(zoekWoorden("Anna anna  de*Vries")).toEqual(["Anna", "de", "Vries"]);
    expect(zoekWoorden("a b c d e f g")).toEqual(["a", "b", "c", "d", "e"]);
    expect(zoekWoorden("  ")).toEqual([]);
    expect(zoekWoorden("***")).toEqual([]);
  });
});

describe("filters", () => {
  it("maakt jokertekens letterlijk", () => {
    expect(likeLetterlijk("50%_korting\\")).toBe("50\\%\\_korting\\\\");
  });

  it("zet de waarde tussen aanhalingstekens met escapes voor PostgREST", () => {
    expect(ilikeWaarde("anna")).toBe('"%anna%"');
    expect(ilikeWaarde("a,b(c)")).toBe('"%a,b(c)%"');
    // % → \% (like) → \\% (tussen aanhalingstekens)
    expect(ilikeWaarde("50%")).toBe('"%50\\\\%%"');
    expect(ilikeWaarde('zeg "hoi"')).toBe('"%zeg \\"hoi\\"%"');
    expect(ilikeWaarde("jan_de")).toBe('"%jan\\\\_de%"');
  });

  it("bouwt een or-groep over de kolommen", () => {
    expect(orGroep(["naam", "email"], "anna")).toBe('naam.ilike."%anna%",email.ilike."%anna%"');
  });

  it("voegt een id-bereik toe bij iets dat op een bestelnummer lijkt", () => {
    expect(orGroep(["email"], "3f2a9c", { idBereik: true })).toBe(
      'email.ilike."%3f2a9c%",and(id.gte.3f2a9c00-0000-0000-0000-000000000000,id.lte.3f2a9cff-ffff-ffff-ffff-ffffffffffff)',
    );
    expect(orGroep(["email"], "anna", { idBereik: true })).toBe('email.ilike."%anna%"');
  });

  it("maakt één groep per woord", () => {
    expect(orGroepen(["naam"], ["a", "b"])).toEqual(['naam.ilike."%a%"', 'naam.ilike."%b%"']);
  });
});

describe("id-begin", () => {
  it("herkent het begin van een uuid", () => {
    expect(isIdBegin("3f2a")).toBe(true);
    expect(isIdBegin("3F2A9C1D-12")).toBe(true);
    expect(isIdBegin("3f2")).toBe(false);
    expect(isIdBegin("3f2a-9c")).toBe(false); // streepje op de verkeerde plek
    expect(isIdBegin("anna")).toBe(false);
    expect(isIdBegin("a".repeat(33))).toBe(false);
  });

  it("geeft het bereik van uuid's", () => {
    expect(uuidBereik("3f2a9c1d-12")).toEqual({
      van: "3f2a9c1d-1200-0000-0000-000000000000",
      tot: "3f2a9c1d-12ff-ffff-ffff-ffffffffffff",
    });
    const heel = "3f2a9c1d-1234-4abc-8def-0123456789ab";
    expect(uuidBereik(heel)).toEqual({ van: heel, tot: heel });
    expect(uuidBereik("geen")).toBeNull();
  });
});

describe("markeer", () => {
  it("markeert treffers hoofdletterongevoelig", () => {
    expect(markeer("Anna de Vries", ["vries", "an"])).toEqual([
      { tekst: "An", treffer: true },
      { tekst: "na de ", treffer: false },
      { tekst: "Vries", treffer: true },
    ]);
  });

  it("gaat goed met speciale tekens en lege invoer", () => {
    expect(markeer("prijs (50%)", ["(50%)"])).toEqual([
      { tekst: "prijs ", treffer: false },
      { tekst: "(50%)", treffer: true },
    ]);
    expect(markeer("", ["a"])).toEqual([]);
    expect(markeer("tekst", [])).toEqual([{ tekst: "tekst", treffer: false }]);
  });

  it("geeft bij overlap voorrang aan het langste woord", () => {
    expect(markeer("annabel", ["anna", "annabel"])).toEqual([{ tekst: "annabel", treffer: true }]);
  });
});

describe("fragment", () => {
  it("laat korte tekst heel", () => {
    expect(fragment("  korte   tekst ", ["x"])).toBe("korte tekst");
  });

  it("toont een stuk rond de eerste treffer", () => {
    const tekst = `${"a ".repeat(100)}NAALD${" b".repeat(100)}`;
    const f = fragment(tekst, ["naald"], 60);
    expect(f).toContain("NAALD");
    expect(f.startsWith("…")).toBe(true);
    expect(f.endsWith("…")).toBe(true);
    expect(f.length).toBeLessThanOrEqual(62);
  });

  it("begint vooraan zonder treffer", () => {
    const f = fragment("x".repeat(300), ["y"], 50);
    expect(f.startsWith("x")).toBe(true);
    expect(f.endsWith("…")).toBe(true);
  });
});

describe("metZoekterm", () => {
  it("zet de zoekterm in de link", () => {
    expect(metZoekterm("/admin/blog", "zoek", "rok & jurk")).toBe("/admin/blog?zoek=rok+%26+jurk");
    expect(metZoekterm("/admin/paginas", null, "x")).toBe("/admin/paginas");
  });
});
