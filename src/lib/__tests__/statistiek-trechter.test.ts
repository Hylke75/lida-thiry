import { describe, expect, it } from "vitest";
import {
  bepaalPeriode,
  berekenTrechter,
  berekenVerkoop,
  bestellingenPerDag,
  binnen,
  dagenVan,
  isTestbestelling,
  MAX_DAGEN,
  queryGrenzen,
  telPerDag,
  topFiguurtypes,
  type TrechterOrder,
} from "../statistiek/trechter";

const NU = new Date("2026-10-04T10:00:00Z");

function order(o: Partial<TrechterOrder> & { afgerond_op?: string | null } = {}): TrechterOrder & { afgerond_op?: string | null } {
  return {
    status: "aangemaakt",
    aangemaakt_op: "2026-10-01T10:00:00Z",
    betaald_op: null,
    bedrag_cent: 4900,
    korting_cent: 0,
    kortingscode: null,
    mollie_payment_id: "tr_1",
    toegekend_type: null,
    heeftMeting: false,
    ...o,
  };
}

describe("statistiek: periode", () => {
  it("vaste periodes eindigen vandaag", () => {
    expect(bepaalPeriode({ periode: "7" }, NU)).toEqual({ van: "2026-09-28", tot: "2026-10-04", dagen: 7, sleutel: "7" });
    expect(bepaalPeriode({ periode: "90" }, NU).dagen).toBe(90);
    expect(bepaalPeriode({}, NU).sleutel).toBe("30");
    expect(bepaalPeriode({ periode: "12" }, NU).sleutel).toBe("30");
  });

  it("eigen periode: wisselt, kapt af op vandaag en op de maximale lengte", () => {
    expect(bepaalPeriode({ van: "2026-09-10", tot: "2026-09-01" }, NU)).toEqual({
      van: "2026-09-01",
      tot: "2026-09-10",
      dagen: 10,
      sleutel: "eigen",
    });
    expect(bepaalPeriode({ van: "2026-10-01", tot: "2027-01-01" }, NU).tot).toBe("2026-10-04");
    expect(bepaalPeriode({ van: "2027-01-01", tot: "2027-02-01" }, NU)).toMatchObject({ van: "2026-10-04", tot: "2026-10-04", dagen: 1 });
    expect(bepaalPeriode({ van: "2020-01-01", tot: "2026-10-04" }, NU).dagen).toBe(MAX_DAGEN);
    expect(bepaalPeriode({ van: "2026-02-31", tot: "2026-03-05" }, NU).sleutel).toBe("30");
  });

  it("dagen en grenzen", () => {
    const p = bepaalPeriode({ van: "2026-09-29", tot: "2026-10-01" }, NU);
    expect(dagenVan(p)).toEqual(["2026-09-29", "2026-09-30", "2026-10-01"]);
    expect(queryGrenzen(p)).toEqual({ vanaf: "2026-09-28T00:00:00Z", totEnMet: "2026-10-03T00:00:00Z" });
    // 23:30 UTC op 1 oktober is al 2 oktober in Nederland.
    expect(binnen("2026-10-01T23:30:00Z", p)).toBe(false);
    expect(binnen("2026-09-28T22:30:00Z", p)).toBe(true);
    expect(binnen(null, p)).toBe(false);
  });
});

describe("statistiek: testbestellingen", () => {
  it("herkent testbestellingen", () => {
    expect(isTestbestelling({ bedrag_cent: 0, kortingscode: null, mollie_payment_id: null })).toBe(true);
    expect(isTestbestelling({ bedrag_cent: 0, kortingscode: "CADEAU", mollie_payment_id: null })).toBe(false);
    expect(isTestbestelling({ bedrag_cent: 4900, kortingscode: null, mollie_payment_id: "tr_1" })).toBe(false);
  });
});

describe("statistiek: trechter", () => {
  const p = bepaalPeriode({ periode: "30" }, NU);
  const orders = [
    order(),
    order({ status: "verlopen" }),
    order({ status: "betaald", betaald_op: "2026-10-01T11:00:00Z" }),
    order({ status: "betaald", betaald_op: "2026-10-01T11:00:00Z", heeftMeting: true }),
    order({ status: "test_afgerond", betaald_op: "2026-10-01T11:00:00Z", heeftMeting: true }),
    order({ status: "advies_verzonden", betaald_op: "2026-10-01T11:00:00Z", heeftMeting: false }),
    // Testbestelling en een bestelling van buiten de periode tellen niet mee.
    order({ status: "advies_verzonden", bedrag_cent: 0, mollie_payment_id: null }),
    order({ status: "advies_verzonden", aangemaakt_op: "2026-01-01T10:00:00Z" }),
  ];

  it("telt per stap en rekent conversie", () => {
    const t = berekenTrechter(orders, p);
    expect(t.map((s) => [s.sleutel, s.aantal])).toEqual([
      ["aangemaakt", 6],
      ["betaald", 4],
      ["gestart", 3],
      ["afgerond", 2],
      ["advies", 1],
    ]);
    expect(t[0].vanVorige).toBeNull();
    expect(t[1].vanVorige).toBe(66.7);
    expect(t[2].vanVorige).toBe(75);
    expect(t[4].vanStart).toBe(16.7);
  });

  it("geeft null-percentages zonder bestellingen", () => {
    const t = berekenTrechter([], p);
    expect(t.every((s) => s.aantal === 0)).toBe(true);
    expect(t[1].vanVorige).toBeNull();
  });
});

describe("statistiek: verkoop", () => {
  const p = bepaalPeriode({ periode: "30" }, NU);
  it("omzet na korting, gemiddelde en kortinggebruik", () => {
    const v = berekenVerkoop(
      [
        order({ status: "betaald", betaald_op: "2026-10-01T11:00:00Z", bedrag_cent: 4900 }),
        order({ status: "advies_verzonden", betaald_op: "2026-10-02T11:00:00Z", bedrag_cent: 3900, kortingscode: "TIEN", korting_cent: 1000 }),
        order({ status: "betaald", betaald_op: "2026-10-02T11:00:00Z", bedrag_cent: 0, kortingscode: "CADEAU", korting_cent: 4900, mollie_payment_id: null }),
        order({ status: "aangemaakt" }),
        order({ status: "betaald", betaald_op: "2026-10-02T11:00:00Z", bedrag_cent: 0, mollie_payment_id: null }),
        order({ status: "betaald", betaald_op: "2026-01-02T11:00:00Z" }),
      ],
      p,
    );
    expect(v).toEqual({
      betaald: 3,
      omzetCent: 8800,
      gemiddeldCent: 2933,
      metKorting: 2,
      kortingPct: 66.7,
      kortingCent: 5900,
    });
  });

  it("zonder verkopen", () => {
    expect(berekenVerkoop([], p)).toMatchObject({ betaald: 0, omzetCent: 0, gemiddeldCent: null, kortingPct: null });
  });
});

describe("statistiek: figuurtypes en reeksen", () => {
  const p = bepaalPeriode({ periode: "7" }, NU);
  it("top figuurtypes", () => {
    const top = topFiguurtypes(
      [
        order({ toegekend_type: "8X", afgerond_op: "2026-10-01T12:00:00Z" }),
        order({ toegekend_type: "3X", afgerond_op: "2026-10-01T12:00:00Z" }),
        order({ toegekend_type: "12A", afgerond_op: "2026-10-01T12:00:00Z" }),
        order({ toegekend_type: "onzin", afgerond_op: "2026-10-01T12:00:00Z" }),
        order({ toegekend_type: "5V", afgerond_op: "2026-01-01T12:00:00Z" }),
        order({ toegekend_type: "5V", bedrag_cent: 0, mollie_payment_id: null }),
      ],
      p,
    );
    expect(top).toEqual([
      { code: "X", aantal: 2 },
      { code: "A", aantal: 1 },
    ]);
  });

  it("telt per dag", () => {
    const r = telPerDag(["2026-10-04T08:00:00Z", "2026-10-04T09:00:00Z", "2026-09-28T08:00:00Z", null, "2025-01-01T00:00:00Z"], p);
    expect(r).toHaveLength(7);
    expect(r[0]).toEqual({ datum: "2026-09-28", aantal: 1 });
    expect(r[6]).toEqual({ datum: "2026-10-04", aantal: 2 });
  });

  it("bestellingen per dag", () => {
    const r = bestellingenPerDag(
      [
        order({ aangemaakt_op: "2026-10-03T08:00:00Z", status: "betaald", betaald_op: "2026-10-04T08:00:00Z" }),
        order({ aangemaakt_op: "2026-10-03T08:00:00Z" }),
        order({ aangemaakt_op: "2026-10-03T08:00:00Z", bedrag_cent: 0, mollie_payment_id: null }),
      ],
      p,
    );
    expect(r.find((d) => d.datum === "2026-10-03")).toEqual({ datum: "2026-10-03", aangemaakt: 2, betaald: 0 });
    expect(r.find((d) => d.datum === "2026-10-04")).toEqual({ datum: "2026-10-04", aangemaakt: 0, betaald: 1 });
  });
});
