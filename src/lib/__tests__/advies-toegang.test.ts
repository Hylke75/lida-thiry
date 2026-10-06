import { describe, it, expect } from "vitest";
import { adviesDownloadbaar, type AdviesOrder } from "../advies-toegang";

const nu = new Date("2026-10-02T12:00:00Z");
const order = (o: Partial<AdviesOrder>): AdviesOrder => ({
  status: "advies_verzonden",
  toegekend_type: "6A",
  afgerond_op: "2026-06-01T12:00:00Z",
  token_verloopt_op: "2026-06-20T12:00:00Z",
  ...o,
});

describe("adviesDownloadbaar", () => {
  it("staat download toe na verlopen testlink binnen 365 dagen na afronden", () => {
    expect(adviesDownloadbaar(order({}), nu)).toBe(true);
  });

  it("weigert meer dan 365 dagen na afronden", () => {
    expect(adviesDownloadbaar(order({ afgerond_op: "2025-09-30T12:00:00Z" }), nu)).toBe(false);
  });

  it("staat download toe met een geldige testlink", () => {
    expect(
      adviesDownloadbaar(order({ status: "test_afgerond", token_verloopt_op: "2026-10-20T00:00:00Z" }), nu),
    ).toBe(true);
  });

  it("weigert zonder type of zonder afgeronde test", () => {
    expect(adviesDownloadbaar(order({ toegekend_type: null }), nu)).toBe(false);
    expect(adviesDownloadbaar(order({ status: "betaald" }), nu)).toBe(false);
  });
});
