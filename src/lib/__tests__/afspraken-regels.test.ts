import { describe, expect, it } from "vitest";
import {
  centNaarEuroInvoer,
  duurLabel,
  euroNaarCent,
  leesAfspraakInstellingen,
  magAnnuleren,
  toegestaneOvergangen,
  valideerBeschikbaarheid,
  valideerBlokkade,
  valideerBoeking,
  valideerSoort,
} from "../afspraken/regels";

const SOORT = "0f8fad5b-d9cb-469f-a165-70867728950e";

describe("afspraken/regels: boeken", () => {
  const goed = {
    soort: SOORT,
    start: "2026-10-05T07:00:00.000Z",
    naam: "  Anna   de Vries ",
    email: " Anna@Voorbeeld.NL ",
    telefoon: "06-12345678",
    opmerking: "  Graag\r\nkleuradvies  ",
    privacy: true,
  };

  it("accepteert en normaliseert geldige invoer", () => {
    const v = valideerBoeking(goed);
    expect(v).toEqual({
      ok: true,
      waarde: {
        soortId: SOORT,
        start: "2026-10-05T07:00:00.000Z",
        naam: "Anna de Vries",
        email: "anna@voorbeeld.nl",
        telefoon: "06-12345678",
        opmerking: "Graag\nkleuradvies",
      },
    });
  });

  it("optionele velden leeg → null", () => {
    const v = valideerBoeking({ ...goed, telefoon: "", opmerking: " " });
    expect(v.ok && v.waarde.telefoon).toBeNull();
    expect(v.ok && v.waarde.opmerking).toBeNull();
  });

  it("geeft fouten per veld", () => {
    const v = valideerBoeking({ soort: "x", start: "morgen", naam: "", email: "geen-mail", telefoon: "abc", opmerking: "x".repeat(2001), privacy: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(Object.keys(v.fouten).sort()).toEqual(["email", "naam", "opmerking", "privacy", "soort", "start", "telefoon"]);
  });

  it("privacy moet expliciet akkoord zijn ('on' uit een formulier mag ook)", () => {
    expect(valideerBoeking({ ...goed, privacy: "on" }).ok).toBe(true);
    expect(valideerBoeking({ ...goed, privacy: "false" }).ok).toBe(false);
    expect(valideerBoeking({ ...goed, privacy: undefined }).ok).toBe(false);
  });

  it("weigert niet-tekst invoer zonder te crashen", () => {
    expect(valideerBoeking({ ...goed, naam: 42, email: { x: 1 } }).ok).toBe(false);
  });
});

describe("afspraken/regels: soorten", () => {
  const basis = { naam: "Kleuradvies", omschrijving: "", duur_minuten: "90", buffer_minuten: "15", prijs: "125,00", aanbetaling: "25", locatie: "Thuis", volgorde: "1", actief: "on" };

  it("euro's ↔ centen", () => {
    expect(euroNaarCent("125,50")).toBe(12550);
    expect(euroNaarCent("1.250,00")).toBe(125000);
    expect(euroNaarCent("€ 25")).toBe(2500);
    expect(euroNaarCent("12.5")).toBe(1250);
    expect(euroNaarCent("")).toBe(0);
    expect(euroNaarCent("tien")).toBeNull();
    expect(euroNaarCent("1,234")).toBeNull();
    expect(centNaarEuroInvoer(2500)).toBe("25,00");
    expect(centNaarEuroInvoer(0)).toBe("");
  });

  it("valideert een soort", () => {
    const v = valideerSoort(basis);
    expect(v).toEqual({
      ok: true,
      waarde: {
        naam: "Kleuradvies",
        omschrijving: "",
        duur_minuten: 90,
        prijs_cent: 12500,
        aanbetaling_cent: 2500,
        locatie: "Thuis",
        online: false,
        buffer_minuten: 15,
        actief: true,
        volgorde: 1,
      },
    });
  });

  it("aanbetaling hoger dan prijs, of rare duur, mag niet", () => {
    expect(valideerSoort({ ...basis, aanbetaling: "200" }).ok).toBe(false);
    expect(valideerSoort({ ...basis, duur_minuten: "5" }).ok).toBe(false);
    expect(valideerSoort({ ...basis, duur_minuten: "62" }).ok).toBe(false);
    expect(valideerSoort({ ...basis, buffer_minuten: "-5" }).ok).toBe(false);
    expect(valideerSoort({ ...basis, naam: " " }).ok).toBe(false);
    expect(valideerSoort({ ...basis, aanbetaling: "0,50" }).ok).toBe(false);
    // Gratis soort met aanbetaling 0 is prima.
    expect(valideerSoort({ ...basis, prijs: "", aanbetaling: "" }).ok).toBe(true);
  });

  it("duurlabel", () => {
    expect(duurLabel(45)).toBe("45 minuten");
    expect(duurLabel(60)).toBe("1 uur");
    expect(duurLabel(90)).toBe("1 uur en 30 minuten");
  });
});

describe("afspraken/regels: beschikbaarheid en blokkades", () => {
  it("normaliseert en sorteert blokken", () => {
    const v = valideerBeschikbaarheid([
      { weekdag: 2, van: "13:00", tot: "17:00" },
      { weekdag: 1, van: "9:00", tot: "12:00" },
      { weekdag: 2, van: "09:00:00", tot: "12:00:00" },
    ]);
    expect(v).toEqual({
      ok: true,
      waarde: [
        { weekdag: 1, van: "09:00", tot: "12:00" },
        { weekdag: 2, van: "09:00", tot: "12:00" },
        { weekdag: 2, van: "13:00", tot: "17:00" },
      ],
    });
  });

  it("weigert overlap, omgekeerde tijden en onbekende dagen", () => {
    const overlap = valideerBeschikbaarheid([
      { weekdag: 3, van: "09:00", tot: "12:00" },
      { weekdag: 3, van: "11:00", tot: "14:00" },
    ]);
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.fouten[0]).toMatch(/woensdag.*overlappen/);
    expect(valideerBeschikbaarheid([{ weekdag: 1, van: "12:00", tot: "09:00" }]).ok).toBe(false);
    expect(valideerBeschikbaarheid([{ weekdag: 8, van: "09:00", tot: "10:00" }]).ok).toBe(false);
    expect(valideerBeschikbaarheid([{ weekdag: 1, van: "", tot: "10:00" }]).ok).toBe(false);
    // Aansluitende blokken zijn prima.
    expect(valideerBeschikbaarheid([{ weekdag: 1, van: "09:00", tot: "12:00" }, { weekdag: 1, van: "12:00", tot: "13:00" }]).ok).toBe(true);
    expect(valideerBeschikbaarheid([])).toEqual({ ok: true, waarde: [] });
  });

  it("einde van de dag (24:00, 00:00 of 23:59) wordt 24:00, zodat het laatste slot blijft", () => {
    for (const tot of ["24:00", "00:00", "23:59"]) {
      const v = valideerBeschikbaarheid([{ weekdag: 6, van: "20:00", tot }]);
      expect(v.ok && v.waarde[0].tot).toBe("24:00");
    }
  });

  it("blokkade van hele dagen (Nederlandse tijd)", () => {
    expect(valideerBlokkade({ van_datum: "2026-10-05", tot_datum: "2026-10-09", reden: " Vakantie " })).toEqual({
      ok: true,
      waarde: { van: "2026-10-04T22:00:00.000Z", tot: "2026-10-09T22:00:00.000Z", reden: "Vakantie" },
    });
    // Over de overgang naar wintertijd heen.
    expect(valideerBlokkade({ van_datum: "2026-10-24", tot_datum: "2026-10-26" })).toMatchObject({
      ok: true,
      waarde: { van: "2026-10-23T22:00:00.000Z", tot: "2026-10-26T23:00:00.000Z" },
    });
    // Zonder einddatum: alleen die dag.
    expect(valideerBlokkade({ van_datum: "2026-12-25" })).toMatchObject({ ok: true, waarde: { van: "2026-12-24T23:00:00.000Z", tot: "2026-12-25T23:00:00.000Z" } });
  });

  it("blokkade met tijden, en foute invoer", () => {
    expect(valideerBlokkade({ van_datum: "2026-10-05", van_tijd: "13:00", tot_datum: "2026-10-05", tot_tijd: "17:30" })).toMatchObject({
      ok: true,
      waarde: { van: "2026-10-05T11:00:00.000Z", tot: "2026-10-05T15:30:00.000Z" },
    });
    expect(valideerBlokkade({ van_datum: "2026-10-05", van_tijd: "17:00", tot_tijd: "13:00" }).ok).toBe(false);
    expect(valideerBlokkade({ van_datum: "05-10-2026" }).ok).toBe(false);
    expect(valideerBlokkade({ van_datum: "2026-10-05", van_tijd: "25:00" }).ok).toBe(false);
  });
});

describe("afspraken/regels: status en annuleren", () => {
  it("statusovergangen", () => {
    expect(toegestaneOvergangen("aangevraagd", false)).toEqual(["bevestigd", "geannuleerd"]);
    expect(toegestaneOvergangen("bevestigd", false)).toEqual(["geannuleerd"]);
    expect(toegestaneOvergangen("bevestigd", true)).toEqual(["afgerond", "niet_verschenen", "geannuleerd"]);
    expect(toegestaneOvergangen("geannuleerd", true)).toEqual([]);
    expect(toegestaneOvergangen("afgerond", true)).toEqual(["niet_verschenen"]);
  });

  it("de klant kan annuleren tot het minimum aantal uren vooraf", () => {
    const nu = new Date("2026-10-04T07:00:00Z");
    const a = (status: string, start: string) => ({ status, start_op: start });
    expect(magAnnuleren(a("bevestigd", "2026-10-05T07:00:00Z"), nu, 24)).toBe(true);
    expect(magAnnuleren(a("bevestigd", "2026-10-05T06:59:00Z"), nu, 24)).toBe(false);
    expect(magAnnuleren(a("aangevraagd", "2026-10-05T07:00:00Z"), nu, 24)).toBe(true);
    expect(magAnnuleren(a("geannuleerd", "2026-10-09T07:00:00Z"), nu, 24)).toBe(false);
    expect(magAnnuleren(a("afgerond", "2026-10-09T07:00:00Z"), nu, 24)).toBe(false);
  });

  it("instellingen met standaardwaarden en grenzen", () => {
    expect(leesAfspraakInstellingen({})).toEqual({ minVoorafUren: 24, maxVooruitDagen: 60, handmatigBevestigen: false });
    expect(
      leesAfspraakInstellingen({ afspraak_min_vooraf_uren: "4", afspraak_max_vooruit_dagen: "9999", afspraak_handmatig_bevestigen: "ja" }),
    ).toEqual({ minVoorafUren: 4, maxVooruitDagen: 730, handmatigBevestigen: true });
    expect(leesAfspraakInstellingen({ afspraak_min_vooraf_uren: "abc", afspraak_max_vooruit_dagen: "" })).toEqual({
      minVoorafUren: 24,
      maxVooruitDagen: 60,
      handmatigBevestigen: false,
    });
  });
});
