import { describe, it, expect } from "vitest";
import {
  controleerMetadata,
  filterBeelden,
  filterHref,
  gebruikZin,
  groepeerGebruik,
  leesFilters,
  pagineer,
  tellers,
  vergelijkCode,
  type LijstBeeld,
} from "../beeldbank-beheer";

function beeld(p: Partial<LijstBeeld> & { id: string; code: string }): LijstBeeld {
  return {
    naam: null,
    onderdeel: null,
    omschrijving: null,
    bijschrift: null,
    status: "origineel",
    breedte: 800,
    hoogte: 800,
    min_breedte: 600,
    min_hoogte: 600,
    ...p,
  };
}

function formulier(velden: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(velden)) fd.set(k, v);
  return fd;
}

describe("filters in de URL", () => {
  it("leest en normaliseert de zoekparameters", () => {
    expect(leesFilters({ zoek: "  hals ", status: "onzin", pagina: "0", teklein: "1" })).toEqual({
      zoek: "hals",
      onderdeel: "",
      status: "",
      teKlein: true,
      ongebruikt: false,
      pagina: 1,
    });
    expect(leesFilters({ pagina: ["3", "4"], status: "goedgekeurd" }).pagina).toBe(3);
  });

  it("bouwt een nette URL en laat lege filters weg", () => {
    const f = leesFilters({});
    expect(filterHref(f)).toBe("/admin/beeldbank");
    expect(filterHref(f, { zoek: "v hals", ongebruikt: true, pagina: 2 })).toBe(
      "/admin/beeldbank?zoek=v+hals&ongebruikt=1&pagina=2",
    );
  });
});

describe("filteren en sorteren", () => {
  const rijen = [
    beeld({ id: "c", code: "B0010", naam: "tops-v-hals-goed", onderdeel: "tops" }),
    beeld({ id: "a", code: "B0002", bijschrift: "Een V-hals verlengt", breedte: 300, hoogte: 300 }),
    beeld({ id: "b", code: "B0003", onderdeel: "rokken", status: "goedgekeurd" }),
  ];
  const gebruik = { c: 2, b: 1 };

  it("sorteert numeriek op code", () => {
    expect(vergelijkCode("B0002", "B0010")).toBeLessThan(0);
    expect(filterBeelden(rijen, leesFilters({}), gebruik).map((b) => b.id)).toEqual(["a", "b", "c"]);
  });

  it("zoekt hoofdletterongevoelig in code, naam, omschrijving en bijschrift", () => {
    expect(filterBeelden(rijen, leesFilters({ zoek: "V-HALS" }), gebruik).map((b) => b.id)).toEqual(["a", "c"]);
    expect(filterBeelden(rijen, leesFilters({ zoek: "b0003" }), gebruik).map((b) => b.id)).toEqual(["b"]);
  });

  it("filtert op onderdeel, status, te klein en ongebruikt", () => {
    const ids = (sp: Record<string, string>) => filterBeelden(rijen, leesFilters(sp), gebruik).map((b) => b.id);
    expect(ids({ onderdeel: "tops" })).toEqual(["c"]);
    expect(ids({ onderdeel: "-" })).toEqual(["a"]);
    expect(ids({ status: "goedgekeurd" })).toEqual(["b"]);
    expect(ids({ teklein: "1" })).toEqual(["a"]);
    expect(ids({ ongebruikt: "1" })).toEqual(["a"]);
  });

  it("telt de tellers", () => {
    expect(tellers([...rijen, beeld({ id: "d", code: "B0004", breedte: null, hoogte: null })])).toEqual({
      totaal: 4,
      teKlein: 1,
      zonderNaam: 3,
      goedgekeurd: 1,
      zonderAfmetingen: 1,
    });
  });
});

describe("pagineren", () => {
  const lijst = Array.from({ length: 100 }, (_, i) => i);
  it("knipt de juiste pagina en begrenst het paginanummer", () => {
    expect(pagineer(lijst, 1).items).toHaveLength(48);
    expect(pagineer(lijst, 3).items).toEqual([96, 97, 98, 99]);
    expect(pagineer(lijst, 99)).toMatchObject({ pagina: 3, aantalPaginas: 3 });
    expect(pagineer([], 5)).toEqual({ items: [], pagina: 1, aantalPaginas: 1 });
  });
});

describe("gebruik", () => {
  it("groepeert per adviestype en beschrijft het aantal", () => {
    const groepen = groepeerGebruik([
      { sectie_id: "1", type_sleutel: "1X", type_titel: "X1", kop: "Je tops" },
      { sectie_id: "2", type_sleutel: "1X", type_titel: "X1", kop: "Je rokken" },
      { sectie_id: "3", type_sleutel: "2A", type_titel: "A2", kop: "Je tops" },
    ]);
    expect(groepen.map((g) => [g.type_sleutel, g.secties.length])).toEqual([
      ["1X", 2],
      ["2A", 1],
    ]);
    expect(gebruikZin(3, 2)).toBe("in 3 secties van 2 adviestypes");
    expect(gebruikZin(1, 1)).toBe("in 1 sectie van 1 adviestype");
    expect(gebruikZin(0, 0)).toBe("nergens");
  });
});

describe("invoer controleren", () => {
  it("controleert de metadata", () => {
    const goed = controleerMetadata(
      formulier({ naam: "Tops-V-hals-goed", figuur: "V", advies: "goed", status: "goedgekeurd", omschrijving: " " }),
    );
    expect(goed.fouten).toEqual([]);
    expect(goed.waarden).toMatchObject({ naam: "tops-v-hals-goed", omschrijving: null, status: "goedgekeurd" });

    const fout = controleerMetadata(formulier({ naam: "tops v hals", figuur: "q?", status: "x" }));
    expect(fout.fouten).toHaveLength(3);
  });
});
