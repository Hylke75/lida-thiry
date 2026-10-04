import { describe, expect, it } from "vitest";
import { beschikbareDagen, conflicten, isVrij, laatsteDatum, telt, tijdenOpDag, vensters, type SlotInvoer } from "../afspraken/slots";

/** Basis: maandag 09:00–12:00, afspraak van 60 minuten, geen buffer; nu = do 1 okt 2026. */
function invoer(over: Partial<SlotInvoer> = {}): SlotInvoer {
  return {
    beschikbaarheid: [{ weekdag: 1, van: "09:00:00", tot: "12:00:00" }],
    blokkades: [],
    afspraken: [],
    duurMinuten: 60,
    bufferMinuten: 0,
    minVoorafUren: 0,
    maxVooruitDagen: 60,
    nu: new Date("2026-10-01T00:00:00Z"),
    ...over,
  };
}

const labels = (i: SlotInvoer, datum: string) => tijdenOpDag(i, datum).map((t) => t.label);

describe("afspraken/slots: raster en beschikbaarheid", () => {
  it("geeft begintijden per kwartier waarbij de afspraak binnen het blok past", () => {
    expect(labels(invoer(), "2026-10-05")).toEqual(["09:00", "09:15", "09:30", "09:45", "10:00", "10:15", "10:30", "10:45", "11:00"]);
    const eerste = tijdenOpDag(invoer(), "2026-10-05")[0];
    expect(eerste).toEqual({ start: "2026-10-05T07:00:00.000Z", eind: "2026-10-05T08:00:00.000Z", label: "09:00" });
  });

  it("niets op dagen zonder beschikbaarheid", () => {
    expect(labels(invoer(), "2026-10-06")).toEqual([]);
  });

  it("meerdere blokken op een dag, en overlappende blokken geven geen dubbele tijden", () => {
    const i = invoer({
      beschikbaarheid: [
        { weekdag: 1, van: "09:00", tot: "10:00" },
        { weekdag: 1, van: "13:00", tot: "14:30" },
        { weekdag: 1, van: "13:30", tot: "14:30" },
      ],
    });
    expect(labels(i, "2026-10-05")).toEqual(["09:00", "13:00", "13:15", "13:30"]);
  });

  it("een blok dat niet op een kwartier begint, start op het eerstvolgende kwartier", () => {
    const i = invoer({ beschikbaarheid: [{ weekdag: 1, van: "09:10", tot: "10:30" }] });
    expect(labels(i, "2026-10-05")).toEqual(["09:15", "09:30"]);
  });

  it("negeert ongeldige blokken", () => {
    const i = invoer({ beschikbaarheid: [{ weekdag: 1, van: "12:00", tot: "09:00" }, { weekdag: 1, van: "x", tot: "10:00" }] });
    expect(labels(i, "2026-10-05")).toEqual([]);
  });
});

describe("afspraken/slots: bestaande afspraken, buffers en blokkades", () => {
  const bestaand = (start: string, eind: string, status = "bevestigd", aangemaakt = "2026-09-01T00:00:00Z", buffer?: number | null) => ({
    start_op: start,
    eind_op: eind,
    status,
    aangemaakt_op: aangemaakt,
    buffer_minuten: buffer,
  });

  it("een afspraak van 10:00–11:00 met 15 minuten buffer blokkeert de omliggende tijden", () => {
    const i = invoer({
      beschikbaarheid: [{ weekdag: 1, van: "09:00", tot: "14:00" }],
      bufferMinuten: 15,
      afspraken: [bestaand("2026-10-05T08:00:00Z", "2026-10-05T09:00:00Z", "bevestigd", "2026-09-01T00:00:00Z", 15)],
    });
    // Nieuwe afspraak + eigen buffer moet vóór 10:00 klaar zijn (kan niet vanaf 09:00),
    // en mag pas na 11:00 + 15 minuten buffer beginnen.
    expect(labels(i, "2026-10-05")).toEqual(["11:15", "11:30", "11:45", "12:00", "12:15", "12:30", "12:45", "13:00"]);
  });

  it("zonder buffers sluiten afspraken precies op elkaar aan", () => {
    const i = invoer({ afspraken: [bestaand("2026-10-05T08:00:00Z", "2026-10-05T09:00:00Z", "bevestigd", "2026-09-01T00:00:00Z", 0)] });
    expect(labels(i, "2026-10-05")).toEqual(["09:00", "11:00"]);
  });

  it("de buffer van de soort van de bestaande afspraak telt; ontbreekt die, dan de eigen buffer", () => {
    const met = invoer({ afspraken: [bestaand("2026-10-05T07:00:00Z", "2026-10-05T08:00:00Z", "bevestigd", "2026-09-01T00:00:00Z", 30)] });
    expect(labels(met, "2026-10-05")).toEqual(["10:30", "10:45", "11:00"]);
    const zonder = invoer({ bufferMinuten: 15, afspraken: [bestaand("2026-10-05T07:00:00Z", "2026-10-05T08:00:00Z", "bevestigd", "2026-09-01T00:00:00Z", null)] });
    expect(labels(zonder, "2026-10-05")).toEqual(["10:15", "10:30", "10:45", "11:00"]);
  });

  it("geannuleerde afspraken tellen niet; afgerond/niet verschenen/aangevraagd wel", () => {
    const blok = (status: string) => invoer({ afspraken: [bestaand("2026-10-05T07:00:00Z", "2026-10-05T10:00:00Z", status)] });
    expect(labels(blok("geannuleerd"), "2026-10-05")).toHaveLength(9);
    for (const s of ["bevestigd", "aangevraagd", "afgerond", "niet_verschenen"]) expect(labels(blok(s), "2026-10-05")).toEqual([]);
  });

  it("wacht_op_betaling houdt de tijd maar 30 minuten vast", () => {
    const nu = new Date("2026-10-01T12:00:00Z");
    const vers = bestaand("2026-10-05T07:00:00Z", "2026-10-05T10:00:00Z", "wacht_op_betaling", "2026-10-01T11:45:00Z");
    const oud = bestaand("2026-10-05T07:00:00Z", "2026-10-05T10:00:00Z", "wacht_op_betaling", "2026-10-01T11:29:00Z");
    expect(telt(vers, nu)).toBe(true);
    expect(telt(oud, nu)).toBe(false);
    expect(labels(invoer({ nu, afspraken: [vers] }), "2026-10-05")).toEqual([]);
    expect(labels(invoer({ nu, afspraken: [oud] }), "2026-10-05")).toHaveLength(9);
    expect(telt(oud, nu, 60)).toBe(true);
  });

  it("negeerId: een afspraak botst niet met zichzelf (verzetten)", () => {
    const eigen = { ...bestaand("2026-10-05T07:00:00Z", "2026-10-05T10:00:00Z"), id: "a1" };
    expect(labels(invoer({ afspraken: [eigen], negeerId: "a1" }), "2026-10-05")).toHaveLength(9);
  });

  it("blokkades: een hele dag, of een deel van de dag (zonder buffer)", () => {
    const heleDag = invoer({ blokkades: [{ van: "2026-10-04T22:00:00Z", tot: "2026-10-05T22:00:00Z" }] });
    expect(labels(heleDag, "2026-10-05")).toEqual([]);
    const ochtend = invoer({ bufferMinuten: 30, blokkades: [{ van: "2026-10-05T07:00:00Z", tot: "2026-10-05T08:30:00Z" }] });
    expect(labels(ochtend, "2026-10-05")).toEqual(["10:30", "10:45", "11:00"]);
  });

  it("conflicten noemt overlappende afspraken en blokkades", () => {
    const a = bestaand("2026-10-05T08:00:00Z", "2026-10-05T09:00:00Z");
    const c = conflicten(
      { afspraken: [a, bestaand("2026-10-05T12:00:00Z", "2026-10-05T13:00:00Z")], blokkades: [{ van: "2026-10-05T08:30:00Z", tot: "2026-10-05T09:30:00Z" }], bufferMinuten: 0, nu: new Date("2026-10-01T00:00:00Z") },
      new Date("2026-10-05T08:30:00Z"),
      new Date("2026-10-05T09:00:00Z"),
    );
    expect(c.afspraken).toEqual([a]);
    expect(c.blokkades).toHaveLength(1);
  });
});

describe("afspraken/slots: minimaal vooraf en maximaal vooruit", () => {
  it("minimaal vooraf, ook op dezelfde dag", () => {
    // Nu is het maandag 09:30 (07:30 UTC); minimaal 1 uur vooraf → vanaf 10:30.
    const i = invoer({ nu: new Date("2026-10-05T07:30:00Z"), minVoorafUren: 1 });
    expect(labels(i, "2026-10-05")).toEqual(["10:30", "10:45", "11:00"]);
    expect(labels(invoer({ nu: new Date("2026-10-05T07:30:00Z"), minVoorafUren: 24 }), "2026-10-05")).toEqual([]);
  });

  it("geen tijden in het verleden", () => {
    expect(labels(invoer({ nu: new Date("2026-10-05T08:05:00Z") }), "2026-10-05")).toEqual(["10:15", "10:30", "10:45", "11:00"]);
    expect(labels(invoer(), "2026-09-28")).toEqual([]);
  });

  it("maximaal vooruit, gerekend vanaf vandaag in Nederland", () => {
    const i = invoer({ maxVooruitDagen: 4 }); // do 1 okt + 4 = ma 5 okt mag nog
    expect(laatsteDatum(i.nu, 4)).toBe("2026-10-05");
    expect(labels(i, "2026-10-05")).toHaveLength(9);
    expect(labels(invoer({ maxVooruitDagen: 3 }), "2026-10-05")).toEqual([]);
  });

  it("beschikbareDagen geeft alleen dagen met vrije tijden, in volgorde", () => {
    const dagen = beschikbareDagen(invoer({ maxVooruitDagen: 14 }));
    expect(dagen.map((d) => d.datum)).toEqual(["2026-10-05", "2026-10-12"]);
    expect(beschikbareDagen(invoer({ duurMinuten: 0 }))).toEqual([]);
  });

  it("isVrij controleert precies dezelfde regels", () => {
    const i = invoer();
    expect(isVrij(i, "2026-10-05T07:00:00.000Z")).toBe(true);
    expect(isVrij(i, new Date("2026-10-05T07:15:00Z"))).toBe(true);
    expect(isVrij(i, "2026-10-05T07:05:00Z")).toBe(false); // niet op het raster
    expect(isVrij(i, "2026-10-05T09:15:00Z")).toBe(false); // past niet meer in het blok
    expect(isVrij(i, "2026-10-06T07:00:00Z")).toBe(false); // dinsdag: niet beschikbaar
    expect(isVrij(i, "onzin")).toBe(false);
  });
});

describe("afspraken/slots: zomer- en wintertijd", () => {
  it("dezelfde kloktijd vóór en na de overgang naar wintertijd", () => {
    const i = invoer({ nu: new Date("2026-10-15T00:00:00Z") });
    expect(tijdenOpDag(i, "2026-10-19")[0].start).toBe("2026-10-19T07:00:00.000Z"); // 09:00 CEST
    expect(tijdenOpDag(i, "2026-10-26")[0].start).toBe("2026-10-26T08:00:00.000Z"); // 09:00 CET
    expect(labels(i, "2026-10-26")[0]).toBe("09:00");
  });

  it("dezelfde kloktijd vóór en na de overgang naar zomertijd", () => {
    const i = invoer({ nu: new Date("2026-03-20T00:00:00Z") });
    expect(tijdenOpDag(i, "2026-03-23")[0].start).toBe("2026-03-23T08:00:00.000Z");
    expect(tijdenOpDag(i, "2026-03-30")[0].start).toBe("2026-03-30T07:00:00.000Z");
  });

  it("nacht van de overgang naar zomertijd: het uur 02:00–03:00 bestaat niet", () => {
    const i = invoer({ nu: new Date("2026-03-20T00:00:00Z"), beschikbaarheid: [{ weekdag: 7, van: "01:00", tot: "05:00" }] });
    // 01:00 CET (00:00Z) tot 05:00 CEST (03:00Z) = 3 echte uren.
    expect(vensters(i.beschikbaarheid, "2026-03-29")).toEqual([
      { van: Date.parse("2026-03-29T00:00:00Z"), tot: Date.parse("2026-03-29T03:00:00Z") },
    ]);
    expect(labels(i, "2026-03-29")).toEqual(["01:00", "01:15", "01:30", "01:45", "03:00", "03:15", "03:30", "03:45", "04:00"]);
    // Een afspraak van 01:30 duurt echt 60 minuten: tot 03:30 op de klok.
    const t = tijdenOpDag(i, "2026-03-29").find((s) => s.label === "01:30")!;
    expect(Date.parse(t.eind) - Date.parse(t.start)).toBe(3_600_000);
  });

  it("nacht van de overgang naar wintertijd: het uur 02:00–03:00 bestaat twee keer", () => {
    const i = invoer({ nu: new Date("2026-10-15T00:00:00Z"), beschikbaarheid: [{ weekdag: 7, van: "01:00", tot: "04:00" }] });
    // 01:00 CEST (23:00Z dag ervoor) tot 04:00 CET (03:00Z) = 4 echte uren.
    const tijden = tijdenOpDag(i, "2026-10-25");
    expect(tijden).toHaveLength(13);
    expect(tijden[0].start).toBe("2026-10-24T23:00:00.000Z");
    expect(tijden.at(-1)!.start).toBe("2026-10-25T02:00:00.000Z");
    expect(tijden.filter((t) => t.label === "02:00").map((t) => t.start)).toEqual(["2026-10-25T00:00:00.000Z", "2026-10-25T01:00:00.000Z"]);
    // Toch op de juiste Nederlandse dag ingedeeld (niet op 24 oktober).
    const dagen = beschikbareDagen({ ...i, maxVooruitDagen: 12 });
    expect(dagen.map((d) => d.datum)).toEqual(["2026-10-18", "2026-10-25"]);
    expect(dagen[0].tijden).toHaveLength(9);
    expect(dagen[1].tijden).toHaveLength(13);
  });
});
