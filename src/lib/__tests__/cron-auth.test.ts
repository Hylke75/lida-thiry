import { describe, expect, it } from "vitest";
import { isGeldigeCron } from "../cron-auth";

const verzoek = (auth?: string) => new Request("http://localhost/api/x", { headers: auth ? { authorization: auth } : {} });

describe("isGeldigeCron", () => {
  it("accepteert alleen precies Bearer <geheim>", () => {
    expect(isGeldigeCron(verzoek("Bearer geheim123"), "geheim123")).toBe(true);
    expect(isGeldigeCron(verzoek("Bearer geheim12"), "geheim123")).toBe(false);
    expect(isGeldigeCron(verzoek("geheim123"), "geheim123")).toBe(false);
    expect(isGeldigeCron(verzoek(), "geheim123")).toBe(false);
  });

  it("zonder ingesteld geheim is niets geldig", () => {
    expect(isGeldigeCron(verzoek("Bearer "), "")).toBe(false);
    expect(isGeldigeCron(verzoek("Bearer undefined"), undefined)).toBe(false);
  });
});
