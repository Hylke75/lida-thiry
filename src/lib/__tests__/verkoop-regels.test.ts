import { describe, expect, it } from "vitest";
import {
  bepaalTerugbetaling,
  betaalOmschrijving,
  controleerCodeWijziging,
  gewijzigdeVelden,
  leesBtwProcent,
  leesProductNaam,
  leesVerkoopTijden,
  terugbetaalOmschrijving,
  trektToegangIn,
  valideerHandmatigeBestelling,
  valideerOrderWijziging,
  VERKOOP_STANDAARD,
} from "../verkoop/regels";
import { BETAALDE_STATUSSEN, OPEN_STATUSSEN, OMZET_STATUSSEN, ADVIES_STATUSSEN, TERUGBETAALD_STATUS } from "../order-status";
import { adviesDownloadbaar } from "../advies-toegang";
import { btwSplitsing, formatteerFactuurnummer } from "../prijs";
import { creditnotaMail } from "../verkoop/mail-html";

describe("verkoopinstellingen", () => {
  it("leest het btw-tarief (0 mag, ongeldig = 21)", () => {
    expect(leesBtwProcent("21")).toBe(21);
    expect(leesBtwProcent("9")).toBe(9);
    expect(leesBtwProcent("0")).toBe(0);
    for (const w of [null, undefined, "", "abc", "-5", "12,5"]) expect(leesBtwProcent(w)).toBe(21);
    expect(leesBtwProcent("150")).toBe(99);
  });

  it("valt terug op de standaard productnaam", () => {
    expect(leesProductNaam("  ")).toBe(VERKOOP_STANDAARD.product_naam);
    expect(leesProductNaam(" Kleurtest ")).toBe("Kleurtest");
  });

  it("maakt de betaalomschrijving voor test en cadeaubon (gelijk aan de oude teksten)", () => {
    expect(betaalOmschrijving(null)).toBe("Kledingadviestest – Lida Thiry");
    expect(betaalOmschrijving(null, "cadeaubon")).toBe("Cadeaubon kledingadviestest – Lida Thiry");
    expect(betaalOmschrijving("LT  Stijltest", "cadeaubon")).toBe("Cadeaubon LT Stijltest");
    expect(betaalOmschrijving("x".repeat(400)).length).toBe(255);
  });

  it("leest de termijnen met standaardwaarden en grenzen", () => {
    expect(leesVerkoopTijden({})).toEqual({
      herinneringMaxDagen: 7,
      herinneringLinkDagen: 7,
      reviewMaxDagen: 60,
      testlinkZichtbaarUren: 2,
    });
    expect(
      leesVerkoopTijden({
        betaalherinnering_max_dagen: "14",
        betaalherinnering_link_dagen: "3",
        review_max_dagen: "5",
        testlink_zichtbaar_uren: "0",
      }),
    ).toEqual({ herinneringMaxDagen: 14, herinneringLinkDagen: 3, reviewMaxDagen: 14, testlinkZichtbaarUren: 0 });
  });
});

describe("terugbetalen", () => {
  it("betaalt standaard het hele restbedrag terug", () => {
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 0, volledig: true })).toEqual({
      ok: true,
      waarde: { bedragCent: 4995, nieuwTotaalCent: 4995, volledig: true },
    });
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 1000, volledig: true })).toEqual({
      ok: true,
      waarde: { bedragCent: 3995, nieuwTotaalCent: 4995, volledig: true },
    });
  });

  it("accepteert een deelbedrag tot het restbedrag", () => {
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 0, volledig: false, invoer: "10,50" })).toEqual({
      ok: true,
      waarde: { bedragCent: 1050, nieuwTotaalCent: 1050, volledig: false },
    });
    // Het laatste deel maakt de terugbetaling volledig.
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 3995, volledig: false, invoer: "10" })).toMatchObject({
      ok: true,
      waarde: { volledig: true, nieuwTotaalCent: 4995 },
    });
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 3995, volledig: false, invoer: "10,01" }).ok).toBe(false);
  });

  it("weigert ongeldige of overbodige terugbetalingen", () => {
    for (const invoer of ["", "0", "abc", "-5"]) {
      expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 0, volledig: false, invoer }).ok).toBe(false);
    }
    expect(bepaalTerugbetaling({ betaaldCent: 4995, alTerugCent: 4995, volledig: true })).toEqual({
      ok: false,
      fout: "Dit bedrag is al volledig terugbetaald.",
    });
    expect(bepaalTerugbetaling({ betaaldCent: 0, alTerugCent: 0, volledig: true }).ok).toBe(false);
  });

  it("trekt de toegang alleen in bij een volledige terugbetaling zonder vinkje", () => {
    expect(trektToegangIn(true, false)).toBe(true);
    expect(trektToegangIn(true, true)).toBe(false);
    expect(trektToegangIn(false, false)).toBe(false);
  });

  it("'terugbetaald' geeft geen toegang en telt niet als betaald of omzet", () => {
    for (const lijst of [BETAALDE_STATUSSEN, OPEN_STATUSSEN, OMZET_STATUSSEN, ADVIES_STATUSSEN]) {
      expect(lijst as readonly string[]).not.toContain(TERUGBETAALD_STATUS);
    }
    expect(
      adviesDownloadbaar({ status: TERUGBETAALD_STATUS, toegekend_type: "8X", afgerond_op: new Date().toISOString(), token_verloopt_op: null }),
    ).toBe(false);
  });

  it("maakt een omschrijving voor Mollie", () => {
    expect(terugbetaalOmschrijving("LT-2026-0012", "  dubbel  betaald ")).toBe("Terugbetaling factuur LT-2026-0012: dubbel betaald");
    expect(terugbetaalOmschrijving(null, null)).toBe("Terugbetaling");
  });
});

describe("creditnota", () => {
  it("krijgt een nummer uit dezelfde reeks als de facturen", () => {
    // De database reserveert het volgnummer; het formaat is dat van de facturen.
    expect(formatteerFactuurnummer(2026, 13)).toBe("LT-2026-0013");
  });

  it("splitst de btw van het creditbedrag net als op de factuur", () => {
    expect(btwSplitsing(4995, 21)).toEqual({ exclCent: 4128, btwCent: 867, inclCent: 4995 });
    expect(btwSplitsing(1000, 0)).toEqual({ exclCent: 1000, btwCent: 0, inclCent: 1000 });
  });

  it("mailt het bedrag, het nummer en de verwijzing naar de factuur (ge-escapet)", () => {
    const m = creditnotaMail(
      { voettekst: "Groet" },
      {
        naam: "Anna <b>",
        bedragCent: 1050,
        valuta: "EUR",
        creditnotanummer: "LT-2026-0013",
        origineelNummer: "LT-2026-0012",
        viaMollie: true,
        reden: "Coulance",
      },
    );
    expect(m.onderwerp).toBe("Terugbetaling en creditnota LT-2026-0013");
    expect(m.html).toContain("LT-2026-0012");
    expect(m.html).toContain("Anna &lt;b&gt;");
    expect(m.html).toContain("Coulance");
    expect(m.html).not.toContain("<b>,");
  });
});

describe("handmatige bestelling", () => {
  const vandaag = "2026-10-06";
  const basis = { klantnaam: "Anna de Vries", email: " Anna@Voorbeeld.NL " };

  it("maakt een gratis bestelling", () => {
    expect(valideerHandmatigeBestelling({ ...basis, soort: "gratis", bedrag: "99" }, vandaag)).toMatchObject({
      ok: true,
      waarde: { email: "anna@voorbeeld.nl", soort: "gratis", bedragCent: 0, betaaldOp: null },
    });
  });

  it("vraagt bij betaald buiten Mollie een bedrag en een datum niet in de toekomst", () => {
    expect(valideerHandmatigeBestelling({ ...basis, soort: "overboeking", bedrag: "" }, vandaag).ok).toBe(false);
    expect(
      valideerHandmatigeBestelling({ ...basis, soort: "overboeking", bedrag: "29,95", betaald_op: "2026-10-01", adres: " Straat 1 " }, vandaag),
    ).toMatchObject({ ok: true, waarde: { bedragCent: 2995, betaaldOp: "2026-10-01", factuurgegevens: { adres: "Straat 1" } } });
    expect(valideerHandmatigeBestelling({ ...basis, soort: "overboeking", bedrag: "10", betaald_op: vandaag }, vandaag)).toMatchObject({
      ok: true,
      waarde: { betaaldOp: null },
    });
    expect(valideerHandmatigeBestelling({ ...basis, soort: "overboeking", bedrag: "10", betaald_op: "2026-10-07" }, vandaag).ok).toBe(false);
    expect(valideerHandmatigeBestelling({ ...basis, soort: "overboeking", bedrag: "10", betaald_op: "2026-02-30" }, vandaag).ok).toBe(false);
  });

  it("weigert zonder naam, e-mail of soort", () => {
    expect(valideerHandmatigeBestelling({ ...basis, klantnaam: "A", soort: "gratis" }, vandaag).ok).toBe(false);
    expect(valideerHandmatigeBestelling({ ...basis, email: "geen", soort: "gratis" }, vandaag).ok).toBe(false);
    expect(valideerHandmatigeBestelling({ ...basis }, vandaag).ok).toBe(false);
  });
});

describe("bestelling wijzigen", () => {
  it("controleert naam, e-mail en de nieuwe einddatum van de testlink", () => {
    const r = valideerOrderWijziging({ klantnaam: "Anna", email: "a@b.nl", token_geldig_tot: "2026-12-31", plaats: "Utrecht" }, "2026-10-06");
    expect(r).toMatchObject({ ok: true, waarde: { tokenGeldigTot: "2026-12-31", factuurgegevens: { plaats: "Utrecht" } } });
    expect(valideerOrderWijziging({ klantnaam: "Anna", email: "a@b.nl", token_geldig_tot: "2026-10-01" }, "2026-10-06").ok).toBe(false);
    expect(valideerOrderWijziging({ klantnaam: "Anna", email: "a@b.nl" }, "2026-10-06")).toMatchObject({
      ok: true,
      waarde: { tokenGeldigTot: null },
    });
  });

  it("ziet alleen echte wijzigingen (sleutelvolgorde en lege velden tellen niet)", () => {
    const oud = { klantnaam: "Anna", factuurgegevens: { plaats: "Utrecht", adres: "Straat 1" } };
    expect(gewijzigdeVelden(oud, { klantnaam: "Anna", factuurgegevens: { adres: "Straat 1", plaats: "Utrecht" } })).toEqual([]);
    expect(gewijzigdeVelden({ factuurgegevens: {} }, { factuurgegevens: {} })).toEqual([]);
    expect(gewijzigdeVelden(oud, { klantnaam: "Anne", factuurgegevens: { adres: "Straat 2" } })).toEqual([
      "klantnaam",
      "factuurgegevens",
    ]);
  });
});

describe("kortingscode wijzigen", () => {
  it("leest percentage en bedrag volgens de vaste soort", () => {
    expect(controleerCodeWijziging({ waarde: "15" }, { soort: "percentage", aantalGebruikt: 0 })).toEqual({
      ok: true,
      waarde: { omschrijving: null, waarde: 15, maxGebruik: null, geldigTot: null },
    });
    expect(controleerCodeWijziging({ waarde: "7,50", geldig_tot: "2026-12-31" }, { soort: "bedrag", aantalGebruikt: 0 })).toMatchObject({
      ok: true,
      waarde: { waarde: 750, geldigTot: "2026-12-31" },
    });
    expect(controleerCodeWijziging({ waarde: "120" }, { soort: "percentage", aantalGebruikt: 0 }).ok).toBe(false);
  });

  it("laat het maximale gebruik niet onder het al geteld gebruik komen", () => {
    expect(controleerCodeWijziging({ waarde: "10", max_gebruik: "2" }, { soort: "percentage", aantalGebruikt: 3 }).ok).toBe(false);
    expect(controleerCodeWijziging({ waarde: "10", max_gebruik: "3" }, { soort: "percentage", aantalGebruikt: 3 }).ok).toBe(true);
  });
});
