import { describe, expect, it } from "vitest";
import { mijnAdviesLinks, type MijnAdviesOrder } from "../mijn-advies-regels";

const nu = new Date("2026-10-04T10:00:00Z");
const BASIS = "https://lidathiry.nl";

function order(o: Partial<MijnAdviesOrder>): MijnAdviesOrder {
  return {
    klantnaam: "Anna",
    status: "advies_verzonden",
    testtoken: "tok",
    toegekend_type: "6H",
    afgerond_op: "2026-09-01T10:00:00Z",
    betaald_op: "2026-08-30T10:00:00Z",
    aangemaakt_op: "2026-08-30T10:00:00Z",
    token_verloopt_op: "2026-11-01T10:00:00Z",
    ...o,
  };
}

describe("mijn advies: links", () => {
  it("geeft een downloadlink voor een afgerond advies en een testlink voor een open test", () => {
    const r = mijnAdviesLinks(
      [
        order({ testtoken: "a/b" }),
        order({
          testtoken: "open",
          status: "betaald",
          toegekend_type: null,
          afgerond_op: null,
          aangemaakt_op: "2026-10-01T10:00:00Z",
          betaald_op: "2026-10-01T10:05:00Z",
        }),
      ],
      BASIS,
      nu,
    );
    expect(r.naam).toBe("Anna");
    expect(r.adviezen).toEqual([
      { type: "6H", afgerondOp: "2026-09-01T10:00:00Z", url: "https://lidathiry.nl/api/test/a%2Fb/pdf" },
    ]);
    expect(r.tests).toEqual([
      { besteldOp: "2026-10-01T10:05:00Z", verlooptOp: "2026-11-01T10:00:00Z", url: "https://lidathiry.nl/test/open" },
    ]);
  });

  it("laat orders zonder token, met verlopen testlink of in handmatige beoordeling weg", () => {
    const r = mijnAdviesLinks(
      [
        order({ testtoken: null }),
        order({ status: "betaald", toegekend_type: null, afgerond_op: null, token_verloopt_op: "2026-10-01T00:00:00Z" }),
        order({ status: "handmatige_beoordeling", toegekend_type: null, afgerond_op: null }),
        // Afgerond, testlink verlopen, maar binnen een jaar na afronden: nog te downloaden.
        order({ testtoken: "oud", token_verloopt_op: "2026-09-02T00:00:00Z" }),
        // Langer dan een jaar geleden afgerond: niet meer.
        order({ testtoken: "heel-oud", afgerond_op: "2025-09-01T00:00:00Z", token_verloopt_op: "2025-09-02T00:00:00Z" }),
      ],
      BASIS,
      nu,
    );
    expect(r.adviezen.map((a) => a.url)).toEqual(["https://lidathiry.nl/api/test/oud/pdf"]);
    expect(r.tests).toEqual([]);
  });

  it("geeft niets terug zonder bestellingen", () => {
    expect(mijnAdviesLinks([], BASIS, nu)).toEqual({ naam: null, adviezen: [], tests: [] });
  });
});
