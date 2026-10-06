import { describe, expect, it } from "vitest";
import {
  betaalwijzeLabel,
  cadeaubonExportRijen,
  creditnotaExportRijen,
  csvBedrag,
  exportPeriode,
  maskeerCode,
  orderExportRijen,
  type ExportOrder,
} from "../verkoop/export";
import { maakCsv } from "../nieuwsbrief/csv";

const order: ExportOrder = {
  id: "o1",
  klantnaam: "=HYPERLINK(\"x\")",
  email: "a@b.nl",
  factuurgegevens: { adres: "Straat 1", postcode: "1234 AB", plaats: "Utrecht", land: "Nederland" },
  status: "advies_verzonden",
  bedrag_cent: 3995,
  korting_cent: 1000,
  kortingscode: "WELKOM10",
  valuta: "EUR",
  betaald_op: "2026-10-05T22:30:00Z",
  factuurnummer: "LT-2026-0012",
  mollie_payment_id: "tr_1",
  betaalwijze: null,
  btw_procent: null,
  terugbetaald_cent: 500,
};

describe("exportperiode", () => {
  it("rekent van begin tot eind van de dag in Nederlandse tijd", () => {
    expect(exportPeriode("2026-10-01", "2026-10-31")).toEqual({
      ok: true,
      van: "2026-10-01",
      tot: "2026-10-31",
      vanIso: "2026-09-30T22:00:00.000Z",
      totIso: "2026-10-31T23:00:00.000Z",
    });
  });

  it("weigert ongeldige, omgekeerde of te lange periodes", () => {
    expect(exportPeriode("", "2026-10-31").ok).toBe(false);
    expect(exportPeriode("2026-10-31", "2026-10-01").ok).toBe(false);
    expect(exportPeriode("2020-01-01", "2026-10-01").ok).toBe(false);
  });
});

describe("CSV-rijen", () => {
  it("formatteert bedragen met een komma", () => {
    expect(csvBedrag(2995)).toBe("29,95");
    expect(csvBedrag(5)).toBe("0,05");
    expect(csvBedrag(-1050)).toBe("-10,50");
    expect(csvBedrag(null)).toBe("0,00");
  });

  it("geeft per bestelling de btw-splitsing, met het opgeslagen of standaardtarief", () => {
    const [kop, rij] = orderExportRijen([order], 21);
    expect(kop[0]).toBe("Betaald op");
    const r = Object.fromEntries(kop.map((k, i) => [k, rij[i]]));
    expect(r["Betaald op"]).toBe("2026-10-06"); // Nederlandse datum
    expect(r["Prijs vóór korting"]).toBe("49,95");
    expect(r["Totaal incl. btw"]).toBe("39,95");
    expect(r["Btw"]).toBe("6,93");
    expect(r["Totaal excl. btw"]).toBe("33,02");
    expect(r["Terugbetaald"]).toBe("5,00");
    expect(r["Betaalwijze"]).toBe("Mollie");
    expect(r["Plaats"]).toBe("Utrecht");
    const [, met9] = orderExportRijen([{ ...order, btw_procent: 9 }], 21);
    expect(met9[kop.indexOf("Btw %")]).toBe("9");
  });

  it("beschermt tegen formules (via maakCsv)", () => {
    const csv = maakCsv(orderExportRijen([order], 21));
    expect(csv).toContain(`"'=HYPERLINK(""x"")"`);
  });

  it("kent de betaalwijzen", () => {
    expect(betaalwijzeLabel({ betaalwijze: "overboeking", mollie_payment_id: null, kortingscode: null, bedrag_cent: 100 })).toBe(
      "Buiten Mollie (overboeking)",
    );
    expect(betaalwijzeLabel({ betaalwijze: null, mollie_payment_id: null, kortingscode: "X", bedrag_cent: 0 })).toBe(
      "Kortingscode/cadeaubon",
    );
    expect(betaalwijzeLabel({ betaalwijze: "gratis", mollie_payment_id: null, kortingscode: null, bedrag_cent: 0 })).toBe(
      "Gratis (beheer)",
    );
  });

  it("toont van een cadeauboncode alleen de laatste tekens", () => {
    expect(maskeerCode("CADEAU-ABCD-EFGH")).toBe("…EFGH");
    const [kop, rij] = cadeaubonExportRijen(
      [
        {
          id: "c1",
          koper_naam: "Bea",
          koper_email: "b@c.nl",
          ontvanger_naam: null,
          bedrag_cent: 2500,
          valuta: "EUR",
          status: "verzonden",
          betaald_op: "2026-10-01T10:00:00Z",
          factuurnummer: "LT-2026-0010",
          mollie_payment_id: "tr_2",
          btw_procent: 21,
          terugbetaald_cent: 0,
          code: "CADEAU-ABCD-EFGH",
          code_gebruikt: true,
        },
      ],
      21,
    );
    expect(rij[kop.indexOf("Code")]).toBe("…EFGH");
    expect(rij[kop.indexOf("Code gebruikt")]).toBe("ja");
    expect(rij[kop.indexOf("Bedrag incl. btw")]).toBe("25,00");
  });

  it("zet creditnota's met negatieve bedragen in de export", () => {
    const [kop, rij] = creditnotaExportRijen([
      {
        nummer: "LT-2026-0013",
        origineel_nummer: "LT-2026-0012",
        soort: "order",
        naam: "Anna",
        email: "a@b.nl",
        bedrag_cent: 1210,
        btw_procent: 21,
        valuta: "EUR",
        reden: null,
        mollie_refund_id: "re_1",
        aangemaakt_op: "2026-10-06T08:00:00Z",
      },
    ]);
    expect(rij[kop.indexOf("Bedrag incl. btw")]).toBe("-12,10");
    expect(rij[kop.indexOf("Btw")]).toBe("-2,10");
    expect(rij[kop.indexOf("Bedrag excl. btw")]).toBe("-10,00");
    expect(rij[kop.indexOf("Betreft factuur")]).toBe("LT-2026-0012");
  });
});
