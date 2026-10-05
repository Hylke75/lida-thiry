import { describe, expect, it } from "vitest";
import { slugify } from "../slug";

describe("slugify", () => {
  it("maakt nette slugs", () => {
    expect(slugify("Jurken voor de Peer & Zandloper!")).toBe("jurken-voor-de-peer-en-zandloper");
    expect(slugify("Café-stijl: één look")).toBe("cafe-stijl-een-look");
    expect(slugify("Zomeractie 2026!")).toBe("zomeractie-2026");
    expect(slugify("  Café & Crème  ")).toBe("cafe-en-creme");
  });

  it("geeft een lege slug als er niets bruikbaars is", () => {
    expect(slugify("   ")).toBe("");
    expect(slugify("---")).toBe("");
  });

  it("kort in zonder streepje aan het eind", () => {
    expect(slugify("a".repeat(100))).toHaveLength(80);
    expect(slugify("a".repeat(80), 60)).toHaveLength(60);
    expect(slugify(`${"a".repeat(59)} b`, 60)).toBe("a".repeat(59));
  });
});
