import { describe, expect, it } from "vitest";
import { controleerLink, linkGeheim, ondertekenLink } from "../ondertekening";

const SLEUTEL = "test-geheim";
const ID = "0b6f5c1e-2f4e-4c3e-9a51-1f6f8e2a7c10";
const nu = new Date("2026-10-04T10:00:00Z");
const later = new Date("2026-10-11T10:00:00Z");

describe("ondertekende links", () => {
  const token = ondertekenLink("hervat", ID, later, SLEUTEL);

  it("heeft de vorm <seconden>.<handtekening>", () => {
    expect(token).toMatch(/^\d+\.[A-Za-z0-9_-]{32}$/);
  });

  it("klopt voor hetzelfde doel, dezelfde id en sleutel", () => {
    expect(controleerLink("hervat", ID, token, nu, SLEUTEL)).toBe(true);
  });

  it("weigert een ander doel, een andere id of een andere sleutel", () => {
    expect(controleerLink("anders", ID, token, nu, SLEUTEL)).toBe(false);
    expect(controleerLink("hervat", ID.replace("0b6f", "1b6f"), token, nu, SLEUTEL)).toBe(false);
    expect(controleerLink("hervat", ID, token, nu, "ander-geheim")).toBe(false);
  });

  it("weigert een verlopen of aangepast token", () => {
    expect(controleerLink("hervat", ID, token, new Date("2026-10-12T00:00:00Z"), SLEUTEL)).toBe(false);
    const [sec, sig] = token.split(".");
    expect(controleerLink("hervat", ID, `${Number(sec) + 86400}.${sig}`, nu, SLEUTEL)).toBe(false);
    expect(controleerLink("hervat", ID, `${sec}.${sig.slice(0, -1)}${sig.endsWith("A") ? "B" : "A"}`, nu, SLEUTEL)).toBe(false);
    expect(controleerLink("hervat", ID, "", nu, SLEUTEL)).toBe(false);
    expect(controleerLink("hervat", ID, "rommel", nu, SLEUTEL)).toBe(false);
  });
});

describe("linkGeheim", () => {
  it("vereist LINK_GEHEIM in productie", () => {
    expect(() => linkGeheim({ VERCEL_ENV: "production", CRON_SECRET: "x" })).toThrow(/LINK_GEHEIM/);
    expect(linkGeheim({ VERCEL_ENV: "production", LINK_GEHEIM: "g" })).toBe("g");
  });

  it("valt buiten productie terug op andere geheimen", () => {
    expect(linkGeheim({ VERCEL_ENV: "preview", CRON_SECRET: "c" })).toBe("c");
    expect(linkGeheim({ SUPABASE_SERVICE_ROLE_KEY: "s" })).toBe("s");
    expect(() => linkGeheim({})).toThrow();
  });
});
