import { beforeEach, describe, expect, it, vi } from "vitest";

// beoordeelToken: alleen een betaalde bestelling geeft toegang tot de test; een
// afgeronde test geeft de uitslag; al het andere wordt geweigerd.
const rij = vi.hoisted(() => ({ waarde: null as Record<string, unknown> | null }));

vi.mock("@/lib/supabase/admin", () => ({
  adminClient: () => {
    const b = {
      from: () => b,
      select: () => b,
      eq: () => b,
      single: async () => ({ data: rij.waarde, error: null }),
    };
    return b;
  },
}));

import { beoordeelToken } from "../test-order";

const toekomst = new Date(Date.now() + 86_400_000).toISOString();
const order = (status: string, extra: Record<string, unknown> = {}) => ({
  id: "o1",
  klantnaam: "Anna",
  email: "anna@example.com",
  status,
  token_verloopt_op: toekomst,
  toegekend_type: null,
  afgerond_op: null,
  ...extra,
});

describe("beoordeelToken", () => {
  beforeEach(() => {
    rij.waarde = null;
  });

  it("onbekende token", async () => {
    expect((await beoordeelToken("x")).toestand).toBe("onbekend");
  });

  it("alleen 'betaald' mag de test doen", async () => {
    rij.waarde = order("betaald");
    expect((await beoordeelToken("x")).toestand).toBe("geldig");
  });

  it("niet (meer) betaald: aangemaakt, mislukt en verlopen betaling", async () => {
    for (const status of ["aangemaakt", "betaling_mislukt", "verlopen"]) {
      rij.waarde = order(status);
      expect((await beoordeelToken("x")).toestand, status).toBe("niet_betaald");
    }
  });

  it("afgeronde test geeft de uitslag", async () => {
    for (const status of ["test_afgerond", "advies_verzonden", "handmatige_beoordeling"]) {
      rij.waarde = order(status, { toegekend_type: "6H" });
      expect((await beoordeelToken("x")).toestand, status).toBe("al_afgerond");
    }
  });

  it("een onbekende status geeft nooit toegang", async () => {
    rij.waarde = order("iets_nieuws");
    expect((await beoordeelToken("x")).toestand).toBe("onbekend");
  });

  it("verlopen testlink zonder downloadbaar advies", async () => {
    rij.waarde = order("betaald", { token_verloopt_op: "2020-01-01T00:00:00Z" });
    expect((await beoordeelToken("x")).toestand).toBe("verlopen");
  });
});
