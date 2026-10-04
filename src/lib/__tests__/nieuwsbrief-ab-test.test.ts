import { describe, expect, it } from "vitest";
import {
  abActief,
  abUitCampagne,
  abWachtUren,
  beslismoment,
  bepaalWinnaar,
  doelgroepMetWachttijd,
  LEGE_VARIANT,
  magBeslissen,
  normaliseerAb,
  onderwerpVoor,
  splitsTestgroep,
  testgroepGrootte,
  type VariantCijfers,
} from "../nieuwsbrief/ab-test";
import { normaliseerDoelgroep } from "../nieuwsbrief/doelgroep";

/** Voorspelbare "willekeur" voor tests. */
function zaad(start: number): () => number {
  let x = start;
  return () => {
    x = (x * 16807) % 2147483647;
    return (x - 1) / 2147483646;
  };
}

const v = (o: Partial<VariantCijfers>): VariantCijfers => ({ ...LEGE_VARIANT, ...o });

describe("A/B-test: instellingen", () => {
  it("normaliseert invoer", () => {
    expect(normaliseerAb({ onderwerpB: "  Hoi   jij ", percentage: "30", wachtUren: 8 })).toEqual({
      onderwerpB: "Hoi jij",
      percentage: 30,
      wachtUren: 8,
    });
    expect(normaliseerAb({ onderwerpB: "B", percentage: 99, wachtUren: 0 })).toEqual({ onderwerpB: "B", percentage: 50, wachtUren: 1 });
    expect(normaliseerAb({ onderwerpB: "B" })).toEqual({ onderwerpB: "B", percentage: 20, wachtUren: 4 });
    expect(normaliseerAb({ onderwerpB: "   " })).toBeNull();
    expect(normaliseerAb(null)).toBeNull();
    expect(normaliseerAb({ onderwerpB: "x".repeat(200) })?.onderwerpB).toHaveLength(150);
  });

  it("herkent een actieve test en leest de wachttijd uit de doelgroep", () => {
    expect(abActief({ onderwerp_b: "B", ab_percentage: 20 })).toBe(true);
    expect(abActief({ onderwerp_b: "", ab_percentage: 20 })).toBe(false);
    expect(abActief({ onderwerp_b: "B", ab_percentage: null })).toBe(false);
    expect(abActief({ onderwerp_b: null, ab_percentage: null })).toBe(false);
    expect(abWachtUren({ abWachtUren: 12 })).toBe(12);
    expect(abWachtUren({})).toBe(4);
    expect(abWachtUren(null)).toBe(4);
    expect(abUitCampagne({ onderwerp_b: "B", ab_percentage: 30, doelgroep: { abWachtUren: 2 } })).toEqual({
      onderwerpB: "B",
      percentage: 30,
      wachtUren: 2,
    });
  });

  it("bewaart de wachttijd naast de doelgroep zonder het filter te veranderen", () => {
    const d = doelgroepMetWachttijd({ tags: ["vip"] }, { onderwerpB: "B", percentage: 20, wachtUren: 8 });
    expect(d).toEqual({ tags: ["vip"], abWachtUren: 8 });
    expect(normaliseerDoelgroep(d)).toEqual({ tags: ["vip"], tagsModus: "een" });
    expect(doelgroepMetWachttijd({ tags: ["vip"] }, null)).toEqual({ tags: ["vip"] });
  });

  it("kiest het onderwerp per variant", () => {
    const c = { onderwerp: "A", onderwerp_b: "B", ab_winnaar: null };
    expect(onderwerpVoor(c, "a")).toBe("A");
    expect(onderwerpVoor(c, "b")).toBe("B");
    expect(onderwerpVoor(c, null)).toBe("A");
    expect(onderwerpVoor({ ...c, ab_winnaar: "b" as const }, null)).toBe("B");
    expect(onderwerpVoor({ ...c, ab_winnaar: "b" as const }, "a")).toBe("A");
    // Zonder A/B-test: altijd het gewone onderwerp, net als vroeger.
    expect(onderwerpVoor({ onderwerp: "A", onderwerp_b: null }, "b")).toBe("A");
  });
});

describe("A/B-test: verdelen", () => {
  it("berekent de groepsgrootte", () => {
    expect(testgroepGrootte(1000, 20)).toBe(100);
    expect(testgroepGrootte(1000, 50)).toBe(250);
    expect(testgroepGrootte(15, 10)).toBe(0);
  });

  it("verdeelt zonder dubbelen of verlies", () => {
    const ids = Array.from({ length: 1000 }, (_, i) => i);
    const s = splitsTestgroep(ids, 20, zaad(42))!;
    expect(s.a).toHaveLength(100);
    expect(s.b).toHaveLength(100);
    expect(s.rest).toHaveLength(800);
    const alle = [...s.a, ...s.b, ...s.rest];
    expect(new Set(alle).size).toBe(1000);
    expect([...alle].sort((x, y) => x - y)).toEqual(ids);
    // Willekeurig: niet simpelweg de eerste 100.
    expect(s.a).not.toEqual(ids.slice(0, 100));
  });

  it("past de invoer niet aan", () => {
    const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    splitsTestgroep(ids, 50, zaad(7));
    expect(ids).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });

  it("geen test bij te weinig ontvangers", () => {
    expect(splitsTestgroep([1, 2, 3], 20)).toBeNull();
    expect(splitsTestgroep([], 50)).toBeNull();
  });
});

describe("A/B-test: winnaar", () => {
  it("hoogste unieke openratio wint", () => {
    expect(bepaalWinnaar(v({ verzonden: 100, geopend: 30 }), v({ verzonden: 100, geopend: 40 }))).toEqual({ winnaar: "b", reden: "open" });
    expect(bepaalWinnaar(v({ verzonden: 100, geopend: 30 }), v({ verzonden: 50, geopend: 14 }))).toEqual({ winnaar: "a", reden: "open" });
  });

  it("bij gelijke opens tellen de kliks, daarna A", () => {
    expect(
      bepaalWinnaar(v({ verzonden: 100, geopend: 30, geklikt: 5 }), v({ verzonden: 100, geopend: 30, geklikt: 9 })),
    ).toEqual({ winnaar: "b", reden: "klik" });
    expect(bepaalWinnaar(v({ verzonden: 100 }), v({ verzonden: 100 }))).toEqual({ winnaar: "a", reden: "gelijk" });
    expect(bepaalWinnaar(v({}), v({}))).toEqual({ winnaar: "a", reden: "gelijk" });
  });

  it("beslist pas als de testgroep verstuurd is en de wachttijd voorbij is", () => {
    const a = v({ verzonden: 10, laatsteVerzonden: "2026-10-04T10:00:00Z" });
    const b = v({ verzonden: 10, laatsteVerzonden: "2026-10-04T11:00:00Z" });
    expect(beslismoment(a, b, 4)?.toISOString()).toBe("2026-10-04T15:00:00.000Z");
    expect(magBeslissen(a, b, 4, new Date("2026-10-04T14:59:00Z"))).toBe(false);
    expect(magBeslissen(a, b, 4, new Date("2026-10-04T15:00:00Z"))).toBe(true);
    expect(magBeslissen({ ...a, wachtrij: 1 }, b, 4, new Date("2026-10-09T00:00:00Z"))).toBe(false);
    expect(beslismoment({ ...a, wachtrij: 3 }, b, 4)).toBeNull();
  });

  it("niets verzonden (alles mislukt): meteen beslissen zodat de campagne niet blijft hangen", () => {
    expect(magBeslissen(v({}), v({}), 4, new Date("2026-10-04T00:00:00Z"))).toBe(true);
  });
});
