import { describe, expect, it } from "vitest";
import {
  ALLE_RECHTEN,
  heeftRecht,
  isRecht,
  isRol,
  leesRol,
  magPad,
  rechtenVan,
  rechtVoorPad,
  rolWijzigBezwaar,
  ROLLEN,
  startPagina,
  type Recht,
} from "../rollen";

describe("rechtenmatrix", () => {
  it("de eigenaar mag alles", () => {
    for (const r of ALLE_RECHTEN) expect(heeftRecht("eigenaar", r)).toBe(true);
  });

  it("de beheerder mag het dagelijkse werk, maar niet beheerders, instellingen, logboek en gevoelige verkoopacties", () => {
    const nee: Recht[] = [
      "beheerders",
      "instellingen",
      "website_instellingen",
      "logboek",
      "bestellingen_verwijderen",
      "kortingscodes_beheren",
    ];
    for (const r of ALLE_RECHTEN) expect(heeftRecht("beheerder", r)).toBe(!nee.includes(r));
  });

  it("de redacteur mag alleen website, nieuwsbrief (zonder contacten) en reviews", () => {
    expect(rechtenVan("redacteur").sort()).toEqual(
      ["ai", "blog", "homepage", "media", "nieuwsbrief", "paginas", "prullenbak", "reviews", "teksten"].sort(),
    );
    for (const r of ["bestellingen", "adresboek", "nieuwsbrief_contacten", "reviews_uitnodigen", "doorverwijzingen", "overzicht"] as Recht[]) {
      expect(heeftRecht("redacteur", r)).toBe(false);
    }
  });

  it("zonder rol niets", () => {
    expect(heeftRecht(null, "blog")).toBe(false);
    expect(heeftRecht(undefined, "reviews")).toBe(false);
  });

  it("elke rol heeft minstens de rechten van de rol eronder", () => {
    for (const r of rechtenVan("redacteur")) expect(heeftRecht("beheerder", r)).toBe(true);
    for (const r of rechtenVan("beheerder")) expect(heeftRecht("eigenaar", r)).toBe(true);
  });
});

describe("leesRol en controles", () => {
  it("leest geldige rollen", () => {
    for (const r of ROLLEN) expect(leesRol(r)).toBe(r);
  });
  it("onbekende waarde: minste rechten; ontbrekende kolom: eigenaar (zoals vóór de rollen)", () => {
    expect(leesRol("baas")).toBe("redacteur");
    expect(leesRol(42)).toBe("redacteur");
    expect(leesRol(null)).toBe("eigenaar");
    expect(leesRol(undefined)).toBe("eigenaar");
  });
  it("isRol en isRecht", () => {
    expect(isRol("beheerder")).toBe(true);
    expect(isRol("admin")).toBe(false);
    expect(isRecht("blog")).toBe(true);
    expect(isRecht("toString")).toBe(false);
    expect(isRecht(undefined)).toBe(false);
  });
});

describe("rechtVoorPad", () => {
  it("de langste prefix wint", () => {
    expect(rechtVoorPad("/admin")).toBe("overzicht");
    expect(rechtVoorPad("/admin/website")).toBe("website_instellingen");
    expect(rechtVoorPad("/admin/website/homepage")).toBe("homepage");
    expect(rechtVoorPad("/admin/blog/123")).toBe("blog");
    expect(rechtVoorPad("/admin/blog/ai")).toBe("ai");
    expect(rechtVoorPad("/admin/nieuwsbrief/campagnes/abc/rapport")).toBe("nieuwsbrief");
    expect(rechtVoorPad("/admin/nieuwsbrief/contacten/abc")).toBe("nieuwsbrief_contacten");
    expect(rechtVoorPad("/admin/order/abc?melding=x")).toBe("bestellingen");
    expect(rechtVoorPad("/admin/versies/prullenbak")).toBe("prullenbak");
  });
  it("Beveiliging en Geen toegang zijn voor iedereen", () => {
    expect(rechtVoorPad("/admin/beveiliging")).toBeNull();
    expect(rechtVoorPad("/admin/geen-toegang")).toBeNull();
    for (const r of ROLLEN) expect(magPad(r, "/admin/beveiliging")).toBe(true);
  });
  it("geen verwarring met gelijkende paden", () => {
    expect(rechtVoorPad("/admin/blogger")).toBe("overzicht");
  });
  it("elke link in de navigatie heeft een recht dat bestaat", () => {
    const navigatie = [
      "/admin", "/admin/statistieken", "/admin/adresboek", "/admin/berichten", "/admin/reviews", "/admin/afspraken",
      "/admin/afspraken/instellingen", "/admin/bestellingen", "/admin/kortingscodes", "/admin/cadeaubonnen",
      "/admin/lichaamstypes", "/admin/types", "/admin/beeldbank", "/admin/meetinstructies", "/admin/paginas",
      "/admin/website/homepage", "/admin/blog", "/admin/blog/ai", "/admin/teksten", "/admin/media",
      "/admin/doorverwijzingen", "/admin/versies/prullenbak", "/admin/website", "/admin/nieuwsbrief",
      "/admin/nieuwsbrief/campagnes", "/admin/nieuwsbrief/contacten", "/admin/nieuwsbrief/formulieren",
      "/admin/nieuwsbrief/automatisch", "/admin/nieuwsbrief/afleverbaarheid", "/admin/instellingen",
      "/admin/beheerders", "/admin/meldingen", "/admin/beveiliging", "/admin/logboek",
    ];
    for (const pad of navigatie) {
      const recht = rechtVoorPad(pad);
      expect(recht === null || isRecht(recht)).toBe(true);
      expect(magPad("eigenaar", pad)).toBe(true);
    }
  });
});

describe("startPagina", () => {
  it("eigenaar en beheerder beginnen op het overzicht, de redacteur bij de pagina's", () => {
    expect(startPagina("eigenaar")).toBe("/admin");
    expect(startPagina("beheerder")).toBe("/admin");
    expect(startPagina("redacteur")).toBe("/admin/paginas");
  });
  it("de startpagina is altijd toegankelijk", () => {
    for (const r of ROLLEN) expect(magPad(r, startPagina(r))).toBe(true);
  });
});

describe("rolWijzigBezwaar", () => {
  const basis = { mijnId: "ik", doelId: "ander", huidigeRol: "beheerder" as const, aantalEigenaren: 1 };
  it("een andere beheerder een andere rol geven mag", () => {
    expect(rolWijzigBezwaar({ ...basis, nieuweRol: "redacteur" })).toBeNull();
    expect(rolWijzigBezwaar({ ...basis, nieuweRol: "eigenaar" })).toBeNull();
  });
  it("nooit je eigen rol", () => {
    expect(rolWijzigBezwaar({ ...basis, doelId: "ik", nieuweRol: "redacteur" })).toMatch(/eigen rol/);
  });
  it("de laatste eigenaar blijft eigenaar", () => {
    expect(rolWijzigBezwaar({ ...basis, huidigeRol: "eigenaar", nieuweRol: "beheerder" })).toMatch(/laatste eigenaar/);
    expect(rolWijzigBezwaar({ ...basis, huidigeRol: "eigenaar", nieuweRol: "beheerder", aantalEigenaren: 2 })).toBeNull();
  });
  it("ongeldige of gelijke rol", () => {
    expect(rolWijzigBezwaar({ ...basis, nieuweRol: "admin" })).toMatch(/geldige rol/);
    expect(rolWijzigBezwaar({ ...basis, nieuweRol: "beheerder" })).toMatch(/al/);
  });
});
