import { describe, expect, it } from "vitest";
import { daglimietBereikt, isTijdelijkeLimiet, koppelBatchUitkomst, statusNaAanmelding } from "../nieuwsbrief/verzendregels";
import { beginVanDag } from "../nieuwsbrief/tijd";
import { magPushOntvangen, RECHT_PER_SOORT, PUSH_SOORTEN } from "../push/regels";

describe("nieuwsbrief: status bij opnieuw aanmelden", () => {
  const c = (status: "onbevestigd" | "aangemeld" | "afgemeld" | "gebounced" | "klacht", bevestigd_op: string | null = null) => ({
    status,
    bevestigd_op,
  });

  it("een klacht blijft altijd staan, ook handmatig of bij een bestelling", () => {
    for (const bron of ["formulier", "bestelling", "handmatig", "import"] as const) {
      expect(statusNaAanmelding(c("klacht", "2026-01-01"), bron, false)).toBeNull();
      expect(statusNaAanmelding(c("klacht", "2026-01-01"), bron, true)).toBeNull();
    }
  });

  it("al aangemeld: niets veranderen", () => {
    expect(statusNaAanmelding(c("aangemeld", "2026-01-01"), "formulier", false)).toBeNull();
  });

  it("openbaar formulier zonder dubbele opt-in: afgemeld of onbestelbaar moet altijd eerst bevestigen", () => {
    expect(statusNaAanmelding(c("afgemeld", "2026-01-01"), "formulier", false)).toBe("onbevestigd");
    expect(statusNaAanmelding(c("gebounced", "2026-01-01"), "formulier", false)).toBe("onbevestigd");
    // Twee keer insturen helpt niet: het staat dan op onbevestigd, maar was eerder bevestigd.
    expect(statusNaAanmelding(c("onbevestigd", "2026-01-01"), "formulier", false)).toBe("onbevestigd");
  });

  it("openbaar formulier zonder dubbele opt-in: een nooit bevestigd adres wordt direct aangemeld", () => {
    expect(statusNaAanmelding(c("onbevestigd"), "formulier", false)).toBe("aangemeld");
  });

  it("dubbele opt-in: altijd eerst bevestigen", () => {
    expect(statusNaAanmelding(c("afgemeld", "2026-01-01"), "formulier", true)).toBe("onbevestigd");
    expect(statusNaAanmelding(c("onbevestigd"), "formulier", true)).toBe("onbevestigd");
  });

  it("bestelling (vinkje) of handmatig: direct weer aangemeld", () => {
    expect(statusNaAanmelding(c("afgemeld", "2026-01-01"), "bestelling", false)).toBe("aangemeld");
    expect(statusNaAanmelding(c("gebounced", "2026-01-01"), "handmatig", false)).toBe("aangemeld");
  });
});

describe("nieuwsbrief: batch-uitkomst van Resend koppelen", () => {
  it("zonder fouten: ids in volgorde", () => {
    expect(koppelBatchUitkomst(3, [{ id: "a" }, { id: "b" }, { id: "c" }], [])).toEqual([{ id: "a" }, { id: "b" }, { id: "c" }]);
  });

  it("met geweigerde mails: de ids horen bij de overige mails, in volgorde", () => {
    expect(
      koppelBatchUitkomst(4, [{ id: "a" }, { id: "c" }], [
        { index: 1, message: "Invalid `to` field" },
        { index: 3, message: "" },
      ]),
    ).toEqual([{ id: "a" }, { fout: "Invalid `to` field" }, { id: "c" }, { fout: "Geweigerd door Resend." }]);
  });

  it("geeft Resend toch een regel per mail terug, dan per index", () => {
    expect(koppelBatchUitkomst(2, [{ id: "a" }, { id: "b" }], [{ index: 0, message: "fout" }])).toEqual([
      { fout: "fout" },
      { id: "b" },
    ]);
  });

  it("negeert onzinnige indexen en ontbrekende ids", () => {
    expect(koppelBatchUitkomst(2, null, [{ index: 7, message: "x" }])).toEqual([{ id: null }, { id: null }]);
  });
});

describe("nieuwsbrief: limieten", () => {
  it("herkent een tijdelijke limiet van Resend (429 of quotum)", () => {
    expect(isTijdelijkeLimiet({ statusCode: 429, name: "rate_limit_exceeded" })).toBe(true);
    expect(isTijdelijkeLimiet({ statusCode: null, name: "daily_quota_exceeded" })).toBe(true);
    expect(isTijdelijkeLimiet({ statusCode: 422, name: "validation_error" })).toBe(false);
    expect(isTijdelijkeLimiet(null)).toBe(false);
  });

  it("de daglimiet houdt pas iets tegen als er nog iets in de wachtrij staat", () => {
    expect(daglimietBereikt({ maxPerDag: 100, verbruiktVandaag: 100, nogInWachtrij: 5 })).toBe(true);
    expect(daglimietBereikt({ maxPerDag: 100, verbruiktVandaag: 100, nogInWachtrij: 0 })).toBe(false);
    expect(daglimietBereikt({ maxPerDag: 100, verbruiktVandaag: 60, nogInWachtrij: 5 })).toBe(false);
  });

  it("de dag begint om middernacht Nederlandse tijd (zomer en winter)", () => {
    // Zomertijd (UTC+2): 5 okt 2026 07:03 UTC → begin 4 okt 22:00 UTC.
    expect(beginVanDag(new Date("2026-10-05T07:03:00Z")).toISOString()).toBe("2026-10-04T22:00:00.000Z");
    // Wintertijd (UTC+1).
    expect(beginVanDag(new Date("2026-12-01T07:00:00Z")).toISOString()).toBe("2026-11-30T23:00:00.000Z");
    // Net na middernacht in Nederland, nog de vorige dag in UTC.
    expect(beginVanDag(new Date("2026-12-01T23:30:00Z")).toISOString()).toBe("2026-12-01T23:00:00.000Z");
  });
});

describe("pushmeldingen: alleen voor wie het onderwerp mag zien", () => {
  it("elke soort heeft een recht", () => {
    for (const s of PUSH_SOORTEN) expect(RECHT_PER_SOORT[s]).toBeTruthy();
  });

  it("eigenaar en beheerder krijgen alles; redacteur en onbekend niets", () => {
    for (const s of PUSH_SOORTEN) {
      expect(magPushOntvangen("eigenaar", s)).toBe(true);
      expect(magPushOntvangen("beheerder", s)).toBe(true);
      expect(magPushOntvangen("redacteur", s)).toBe(false);
      expect(magPushOntvangen(null, s)).toBe(false);
    }
  });
});
