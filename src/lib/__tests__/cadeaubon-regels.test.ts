import { describe, expect, it } from "vitest";
import {
  bepaalBedrag,
  cadeaubonGeldigTot,
  datumInNederland,
  eindeVanDagNl,
  euroNaarCent,
  maxBedragCent,
  plusDagen,
  vasteBedragenOnder,
  valideerCadeaubon,
  verzendenIsAanDeBeurt,
} from "../cadeaubon/regels";

describe("cadeaubon: bedrag", () => {
  it.each([
    ["25", 2500],
    ["27,50", 2750],
    ["27.5", 2750],
    ["€ 12", 1200],
    [" 5 ", 500],
  ])("euroNaarCent(%s) = %i", (invoer, cent) => {
    expect(euroNaarCent(invoer)).toBe(cent);
  });

  it.each(["", "abc", "-5", "12,345", "1e3", "12,", "1.000,00"])("euroNaarCent(%j) is ongeldig", (invoer) => {
    expect(euroNaarCent(invoer)).toBeNull();
  });

  it("accepteert de vaste bedragen en weigert andere waarden als keuze", () => {
    expect(bepaalBedrag("2000", "", 4900)).toEqual({ ok: true, waarde: 2000 });
    expect(bepaalBedrag("5000", "", 6000)).toEqual({ ok: true, waarde: 5000 });
    expect(bepaalBedrag("2500", "", 4900).ok).toBe(false);
    expect(bepaalBedrag("", "", 4900).ok).toBe(false);
  });

  it("gebruikt de prijs van één test", () => {
    expect(bepaalBedrag("prijs", "", 4900)).toEqual({ ok: true, waarde: 4900 });
    expect(bepaalBedrag("prijs", "", null).ok).toBe(false);
  });

  it("controleert een eigen bedrag op minimum en maximum", () => {
    expect(bepaalBedrag("anders", "5", 4900)).toEqual({ ok: true, waarde: 500 });
    expect(bepaalBedrag("anders", "4,99", 4900)).toEqual({ ok: false, fout: "Een cadeaubon is minimaal € 5." });
    expect(bepaalBedrag("anders", "49", 4900)).toEqual({ ok: true, waarde: 4900 });
    expect(bepaalBedrag("anders", "veel", 4900).ok).toBe(false);
  });

  it("is maximaal de prijs van de test", () => {
    const r = bepaalBedrag("anders", "49,01", 4900);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.fout).toMatch(/maximaal de prijs van de test \(€\s49,00\)/);
    expect(bepaalBedrag("5000", "", 4900).ok).toBe(false);
    expect(bepaalBedrag("anders", "600", 100_000).ok).toBe(false);
    expect(maxBedragCent(4900)).toBe(4900);
    expect(vasteBedragenOnder(4900)).toEqual([2000, 3500]);
  });

  it("weigert zonder bekende prijs", () => {
    expect(bepaalBedrag("anders", "25", null).ok).toBe(false);
    expect(bepaalBedrag("2000", "", null).ok).toBe(false);
  });
});

describe("cadeaubon: invoer", () => {
  const nu = new Date("2026-10-04T10:00:00Z");
  const basis = {
    bedrag: "3500",
    koper_naam: " Bo ",
    koper_email: "BO@Example.nl ",
    voorwaarden_akkoord: true,
  };

  it("normaliseert de invoer voor bezorging aan de koper", () => {
    const r = valideerCadeaubon({ ...basis, ontvanger_naam: "Anna", verzend_op: "2026-12-01" }, { prijsCent: 4900, nu });
    expect(r).toEqual({
      ok: true,
      waarde: {
        bedragCent: 3500,
        koperNaam: "Bo",
        koperEmail: "bo@example.nl",
        ontvangerNaam: "Anna",
        ontvangerEmail: null,
        boodschap: null,
        bezorging: "koper",
        // Een datum heeft alleen zin bij bezorging aan de ontvanger.
        verzendOp: null,
      },
    });
  });

  it("vereist naam en e-mail van de ontvanger bij directe bezorging", () => {
    expect(valideerCadeaubon({ ...basis, bezorging: "ontvanger" }, { prijsCent: 4900, nu }).ok).toBe(false);
    expect(
      valideerCadeaubon({ ...basis, bezorging: "ontvanger", ontvanger_email: "a@b.nl" }, { prijsCent: 4900, nu }).ok,
    ).toBe(false);
    const r = valideerCadeaubon(
      { ...basis, bezorging: "ontvanger", ontvanger_naam: "Anna", ontvanger_email: "A@B.nl", boodschap: "Veel plezier!\r\nXx" },
      { prijsCent: 4900, nu },
    );
    expect(r.ok && r.waarde).toMatchObject({ ontvangerEmail: "a@b.nl", boodschap: "Veel plezier!\nXx", verzendOp: null });
  });

  it("controleert de verzenddatum", () => {
    const ontvanger = { ...basis, bezorging: "ontvanger", ontvanger_naam: "Anna", ontvanger_email: "a@b.nl" };
    const met = (verzend_op: string) => valideerCadeaubon({ ...ontvanger, verzend_op }, { prijsCent: 4900, nu });
    expect(met("2026-12-24")).toMatchObject({ ok: true, waarde: { verzendOp: "2026-12-24" } });
    expect(met("2026-10-04")).toMatchObject({ ok: true, waarde: { verzendOp: null } }); // vandaag = direct
    expect(met("2026-10-03")).toEqual({ ok: false, fout: "De verzenddatum ligt in het verleden." });
    expect(met("2027-06-01").ok).toBe(false);
    expect(met("2026-13-01").ok).toBe(false);
  });

  it("weigert een te lange boodschap, ongeldige e-mail en ontbrekend akkoord", () => {
    expect(valideerCadeaubon({ ...basis, boodschap: "x".repeat(501) }, { prijsCent: 4900, nu }).ok).toBe(false);
    expect(valideerCadeaubon({ ...basis, koper_email: "geen-mail" }, { prijsCent: 4900, nu }).ok).toBe(false);
    expect(valideerCadeaubon({ ...basis, voorwaarden_akkoord: "on" }, { prijsCent: 4900, nu }).ok).toBe(false);
  });
});

describe("cadeaubon: datums", () => {
  it("rekent in Nederlandse tijd", () => {
    expect(datumInNederland(new Date("2026-10-04T22:30:00Z"))).toBe("2026-10-05");
    expect(plusDagen("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("is 12 maanden geldig vanaf betaling of de latere verzenddatum", () => {
    const betaald = new Date("2026-10-04T10:00:00Z");
    expect(datumInNederland(new Date(cadeaubonGeldigTot(betaald, null)))).toBe("2027-10-04");
    expect(datumInNederland(new Date(cadeaubonGeldigTot(betaald, "2026-12-24")))).toBe("2027-12-24");
    expect(datumInNederland(new Date(cadeaubonGeldigTot(betaald, "2026-01-01")))).toBe("2027-10-04");
  });

  it("weet wanneer een geplande bon verstuurd moet worden", () => {
    const nu = new Date("2026-12-24T03:00:00Z");
    expect(verzendenIsAanDeBeurt(null, nu)).toBe(true);
    expect(verzendenIsAanDeBeurt("2026-12-24", nu)).toBe(true);
    expect(verzendenIsAanDeBeurt("2026-12-20", nu)).toBe(true);
    expect(verzendenIsAanDeBeurt("2026-12-25", nu)).toBe(false);
  });
});

describe("cadeaubon: einde van de dag", () => {
  it("valt in zomer- en wintertijd op 23:59:59 Nederlandse tijd", () => {
    expect(eindeVanDagNl("2027-07-01")).toBe("2027-07-01T21:59:59.000Z");
    expect(eindeVanDagNl("2027-01-15")).toBe("2027-01-15T22:59:59.000Z");
  });
});
