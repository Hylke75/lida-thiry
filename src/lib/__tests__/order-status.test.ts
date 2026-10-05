import { describe, expect, it } from "vitest";
import {
  AFGERONDE_STATUSSEN,
  BETAALDE_STATUSSEN,
  OMZET_STATUSSEN,
  OPEN_STATUSSEN,
  gratisTestAan,
  isBetaald,
  isOpen,
  testlinkNogTonen,
} from "../order-status";

describe("order-status", () => {
  it("rekent handmatige_beoordeling (oud) tot betaald", () => {
    expect(isBetaald("handmatige_beoordeling")).toBe(true);
    expect(isBetaald("advies_verzonden")).toBe(true);
    expect(isBetaald("aangemaakt")).toBe(false);
    expect(isBetaald(null)).toBe(false);
  });

  it("open en betaald sluiten elkaar uit", () => {
    for (const s of OPEN_STATUSSEN) expect(isBetaald(s)).toBe(false);
    for (const s of BETAALDE_STATUSSEN) expect(isOpen(s)).toBe(false);
  });

  it("afgerond en omzet vallen binnen betaald", () => {
    for (const s of [...AFGERONDE_STATUSSEN, ...OMZET_STATUSSEN]) expect(isBetaald(s)).toBe(true);
  });

  it("zet de gratis testmodus alleen aan met precies 1", () => {
    expect(gratisTestAan("1")).toBe(true);
    for (const w of [undefined, "", "0", "false", "true", "ja"]) expect(gratisTestAan(w)).toBe(false);
  });

  it("toont de testlink alleen kort na betalen", () => {
    const nu = new Date("2026-10-05T12:00:00Z");
    expect(testlinkNogTonen("2026-10-05T11:00:00Z", nu)).toBe(true);
    expect(testlinkNogTonen("2026-10-05T09:59:00Z", nu)).toBe(false);
    expect(testlinkNogTonen(null, nu)).toBe(false);
    expect(testlinkNogTonen("onzin", nu)).toBe(false);
  });
});
