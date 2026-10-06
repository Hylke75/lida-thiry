import { describe, expect, it } from "vitest";
import {
  bepaalBedrag,
  CADEAUBON_SLEUTELS as S,
  CADEAUBON_STANDAARD,
  cadeaubonGeldigTot,
  centNaarEuroInvoer,
  datumInNederland,
  leesCadeaubonInstellingen,
  maxBedragCent,
  valideerCadeaubon,
  valideerCadeaubonInstellingen,
  vasteBedragenOnder,
} from "../cadeaubon/regels";
import { formatteerBedrag } from "../prijs";

describe("cadeaubon-instellingen lezen", () => {
  it("zonder instellingen gelden de oude vaste waarden", () => {
    expect(leesCadeaubonInstellingen({})).toEqual(CADEAUBON_STANDAARD);
  });

  it("leest geldige waarden en negeert ongeldige", () => {
    const r = leesCadeaubonInstellingen({
      [S.vasteBedragen]: "5000,2500,2500",
      [S.minCent]: "1000",
      [S.maxCent]: "abc",
      [S.geldigMaanden]: "24",
      [S.maxVooruitDagen]: "999",
    });
    expect(r).toEqual({ vasteBedragen: [2500, 5000], minCent: 1000, maxCent: 50_000, geldigMaanden: 24, maxVooruitDagen: 183 });
    expect(leesCadeaubonInstellingen({ [S.vasteBedragen]: "" }).vasteBedragen).toEqual([]);
    expect(leesCadeaubonInstellingen({ [S.vasteBedragen]: "20,onzin" }).vasteBedragen).toEqual([2000, 3500, 5000]);
    // Maximum onder het minimum: terug naar een geldig maximum.
    expect(leesCadeaubonInstellingen({ [S.minCent]: "60000", [S.maxCent]: "1000" }).maxCent).toBe(60_000);
  });
});

describe("cadeaubon-instellingen opslaan", () => {
  const geldig = { vaste_bedragen: "25; 40 15", min: "10", max: "75,50", geldig_maanden: "18", max_vooruit_dagen: "90" };

  it("zet euro's om naar centen per sleutel", () => {
    const r = valideerCadeaubonInstellingen(geldig);
    expect(r).toEqual({
      ok: true,
      waarde: {
        instellingen: { vasteBedragen: [1500, 2500, 4000], minCent: 1000, maxCent: 7550, geldigMaanden: 18, maxVooruitDagen: 90 },
        waarden: {
          [S.vasteBedragen]: "1500,2500,4000",
          [S.minCent]: "1000",
          [S.maxCent]: "7550",
          [S.geldigMaanden]: "18",
          [S.maxVooruitDagen]: "90",
        },
      },
    });
  });

  it("weigert waarden buiten de grenzen of onlogische combinaties", () => {
    expect(valideerCadeaubonInstellingen({ ...geldig, min: "4" }).ok).toBe(false); // onder € 5 (database)
    expect(valideerCadeaubonInstellingen({ ...geldig, max: "1001" }).ok).toBe(false); // boven € 1000
    expect(valideerCadeaubonInstellingen({ ...geldig, min: "80" }).ok).toBe(false); // min > max
    expect(valideerCadeaubonInstellingen({ ...geldig, vaste_bedragen: "5" }).ok).toBe(false); // onder min
    expect(valideerCadeaubonInstellingen({ ...geldig, vaste_bedragen: "11 12 13 14 15 16 17" }).ok).toBe(false);
    expect(valideerCadeaubonInstellingen({ ...geldig, geldig_maanden: "0" }).ok).toBe(false);
    expect(valideerCadeaubonInstellingen({ ...geldig, max_vooruit_dagen: "1,5" }).ok).toBe(false);
    expect(valideerCadeaubonInstellingen({ ...geldig, vaste_bedragen: "" })).toMatchObject({
      ok: true,
      waarde: { instellingen: { vasteBedragen: [] } },
    });
  });

  it("toont centen als euro-invoer", () => {
    expect(centNaarEuroInvoer(2000)).toBe("20");
    expect(centNaarEuroInvoer(7550)).toBe("75,50");
  });
});

describe("cadeaubonregels met instellingen", () => {
  const inst = { vasteBedragen: [1500, 2500, 6000], minCent: 1000, maxCent: 4000, geldigMaanden: 6, maxVooruitDagen: 30 };

  it("het maximum blijft de prijs van de test", () => {
    expect(maxBedragCent(4900, inst)).toBe(4000);
    expect(maxBedragCent(3000, inst)).toBe(3000);
    expect(vasteBedragenOnder(4900, inst)).toEqual([1500, 2500]);
    expect(bepaalBedrag("6000", "", 4900, inst).ok).toBe(false);
    expect(bepaalBedrag("1500", "", 4900, inst)).toEqual({ ok: true, waarde: 1500 });
    expect(bepaalBedrag("anders", "9", 4900, inst)).toEqual({ ok: false, fout: "Een cadeaubon is minimaal € 10." });
    expect(bepaalBedrag("anders", "45", 4900, inst)).toEqual({ ok: false, fout: `Een cadeaubon is maximaal ${formatteerBedrag(4000)}.` });
    expect(bepaalBedrag("prijs", "", 4900, inst)).toMatchObject({ ok: false });
  });

  it("gebruikt de ingestelde planningsgrens en geldigheid", () => {
    const nu = new Date("2026-10-04T10:00:00Z");
    const ruw = {
      bedrag: "1500",
      koper_naam: "Anna",
      koper_email: "a@b.nl",
      bezorging: "ontvanger",
      ontvanger_naam: "Bea",
      ontvanger_email: "b@c.nl",
      voorwaarden_akkoord: true,
    };
    expect(valideerCadeaubon({ ...ruw, verzend_op: "2026-11-03" }, { prijsCent: 4900, nu, inst }).ok).toBe(true);
    expect(valideerCadeaubon({ ...ruw, verzend_op: "2026-11-04" }, { prijsCent: 4900, nu, inst })).toEqual({
      ok: false,
      fout: "De verzenddatum mag maximaal 30 dagen vooruit liggen.",
    });
    expect(datumInNederland(new Date(cadeaubonGeldigTot(nu, null, inst.geldigMaanden)))).toBe("2027-04-04");
  });
});
