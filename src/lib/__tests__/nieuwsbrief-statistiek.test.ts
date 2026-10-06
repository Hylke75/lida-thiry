import { describe, expect, it } from "vitest";
import {
  gemiddeldePercentages,
  groeiReeks,
  nlDag,
  percentage,
  somLaatste,
  type ContactMoment,
} from "../nieuwsbrief/statistiek";

const NU = new Date("2026-10-04T10:00:00Z");

function c(status: string, bevestigd: string | null, afgemeld: string | null = null): ContactMoment {
  return { status, bevestigd_op: bevestigd, afgemeld_op: afgemeld, bijgewerkt_op: afgemeld ?? bevestigd };
}

describe("groeiReeks", () => {
  it("rekent terug vanaf het huidige aantal", () => {
    const reeks = groeiReeks(
      10,
      [
        c("aangemeld", "2026-10-04T08:00:00Z"),
        c("aangemeld", "2026-10-03T08:00:00Z"),
        c("afgemeld", "2026-01-01T00:00:00Z", "2026-10-03T09:00:00Z"),
        c("afgemeld", "2026-10-02T08:00:00Z", "2026-10-04T09:00:00Z"),
        c("onbevestigd", null),
      ],
      4,
      NU,
    );
    expect(reeks.map((d) => d.datum)).toEqual(["2026-10-01", "2026-10-02", "2026-10-03", "2026-10-04"]);
    expect(reeks.map((d) => [d.nieuw, d.weg])).toEqual([
      [0, 0],
      [1, 0],
      [1, 1],
      [1, 1],
    ]);
    expect(reeks.map((d) => d.totaal)).toEqual([9, 10, 10, 10]);
    expect(somLaatste(reeks, 2)).toEqual({ nieuw: 2, weg: 2 });
  });

  it("gebruikt de Nederlandse kalenderdag", () => {
    expect(nlDag("2026-10-03T22:30:00Z")).toBe("2026-10-04");
    const reeks = groeiReeks(1, [c("aangemeld", "2026-10-03T22:30:00Z")], 2, NU);
    expect(reeks[1]).toMatchObject({ datum: "2026-10-04", nieuw: 1 });
  });

  it("telt bounces mee als vertrokken en wordt nooit negatief", () => {
    const bounce: ContactMoment = {
      status: "gebounced",
      bevestigd_op: "2026-09-01T00:00:00Z",
      afgemeld_op: null,
      bijgewerkt_op: "2026-10-04T07:00:00Z",
    };
    expect(groeiReeks(5, [bounce], 2, NU).map((d) => [d.totaal, d.weg])).toEqual([
      [6, 0],
      [5, 1],
    ]);
    const reeks = groeiReeks(0, [c("aangemeld", "2026-10-04T08:00:00Z")], 3, NU);
    expect(reeks.every((d) => d.totaal >= 0)).toBe(true);
  });
});

describe("percentages", () => {
  it("percentage", () => {
    expect(percentage(1, 3)).toBe(33.3);
    expect(percentage(1, 0)).toBeNull();
  });
  it("gemiddelde over campagnes (elke campagne even zwaar)", () => {
    expect(
      gemiddeldePercentages([
        { verzonden: 100, geopend: 50, geklikt: 10 },
        { verzonden: 10, geopend: 1, geklikt: 0 },
        { verzonden: 0, geopend: 0, geklikt: 0 },
      ]),
    ).toEqual({ open: 30, klik: 5 });
    expect(gemiddeldePercentages([])).toEqual({ open: null, klik: null });
  });
});
