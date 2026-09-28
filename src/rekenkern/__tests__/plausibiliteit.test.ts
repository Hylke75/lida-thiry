import { describe, it, expect } from "vitest";
import {
  controleerHardeGrenzen,
  controleerControlemeting,
  logischeChecks,
} from "../plausibiliteit";
import type { Maten } from "../types";

const normaal: Maten = { borst: 96, taille: 74, hogeHeup: 92, heup: 100 };

describe("D. Plausibiliteitscontrole", () => {
  it("keurt normale maten goed", () => {
    expect(controleerHardeGrenzen(normaal)).toHaveLength(0);
    expect(logischeChecks(normaal)).toHaveLength(0);
  });

  it("signaleert een omtrek buiten de harde grenzen", () => {
    const bevindingen = controleerHardeGrenzen({ ...normaal, borst: 220 });
    expect(bevindingen.some((b) => b.code === "omtrek_buiten_bereik")).toBe(true);
    expect(bevindingen[0].ernst).toBe("blokkerend");
  });

  it("signaleert binnenbeen buiten bereik alleen wanneer opgegeven", () => {
    expect(controleerHardeGrenzen({ ...normaal, binnenbeen: 40 })).toHaveLength(1);
    expect(controleerHardeGrenzen(normaal)).toHaveLength(0);
  });

  it("vraagt om opnieuw meten bij een controleverschil groter dan 2 cm", () => {
    expect(controleerControlemeting(90, 93)).not.toBeNull();
    expect(controleerControlemeting(90, 92)).toBeNull();
  });

  it("geeft een melding wanneer de taille groter is dan borst en heup", () => {
    const bevindingen = logischeChecks({
      borst: 90,
      taille: 95,
      hogeHeup: 88,
      heup: 92,
    });
    expect(bevindingen.some((b) => b.code === "taille_grootst")).toBe(true);
    expect(bevindingen[0].ernst).toBe("melding");
  });

  it("geeft een melding wanneer de hoge heup groter is dan de heup + marge", () => {
    const bevindingen = logischeChecks({ ...normaal, hogeHeup: 110, heup: 100 });
    expect(bevindingen.some((b) => b.code === "hoge_heup_boven_heup")).toBe(true);
  });

  it("geeft een melding wanneer de heup kleiner is dan taille - marge", () => {
    const bevindingen = logischeChecks({
      borst: 96,
      taille: 90,
      hogeHeup: 80,
      heup: 82,
    });
    expect(bevindingen.some((b) => b.code === "heup_onder_taille")).toBe(true);
  });
});
