import { describe, expect, it } from "vitest";
import {
  herinneringNaUren,
  selecteerBetaalherinneringen,
  type OpenBestelling,
} from "../betaalherinnering-regels";

const nu = new Date("2026-10-04T03:00:00Z");
const urenGeleden = (u: number) => new Date(nu.getTime() - u * 3600_000).toISOString();

function order(o: Partial<OpenBestelling> & { id: string }): OpenBestelling {
  return {
    email: "anna@voorbeeld.nl",
    status: "aangemaakt",
    bedrag_cent: 4900,
    aangemaakt_op: urenGeleden(30),
    betaalherinnering_op: null,
    ...o,
  };
}

const ids = (lijst: OpenBestelling[]) => lijst.map((o) => o.id).sort();

describe("betaalherinnering: instelling", () => {
  it.each([
    [null, 24],
    ["", 24],
    ["abc", 24],
    ["0", 24],
    ["12", 12],
    ["0.4", 1],
    ["1000", 144],
  ])("herinneringNaUren(%j) = %i", (waarde, uren) => {
    expect(herinneringNaUren(waarde)).toBe(uren);
  });
});

describe("betaalherinnering: selectie", () => {
  it("kiest open bestellingen tussen de grens en 7 dagen oud", () => {
    const r = selecteerBetaalherinneringen(
      [
        order({ id: "ok", email: "a@x.nl" }),
        order({ id: "verlopen", email: "b@x.nl", status: "verlopen" }),
        order({ id: "mislukt", email: "c@x.nl", status: "betaling_mislukt" }),
        order({ id: "te-jong", email: "d@x.nl", aangemaakt_op: urenGeleden(23) }),
        order({ id: "te-oud", email: "e@x.nl", aangemaakt_op: urenGeleden(7 * 24 + 1) }),
        order({ id: "al-gehad", email: "f@x.nl", betaalherinnering_op: urenGeleden(1) }),
        order({ id: "gratis", email: "g@x.nl", bedrag_cent: 0 }),
        order({ id: "betaald", email: "h@x.nl", status: "betaald" }),
      ],
      [],
      nu,
      24,
    );
    expect(ids(r.versturen)).toEqual(["mislukt", "ok", "verlopen"]);
    expect(r.overslaan).toEqual([]);
  });

  it("slaat over als hetzelfde adres sindsdien heeft betaald (hoofdletterongevoelig)", () => {
    const r = selecteerBetaalherinneringen(
      [order({ id: "o1", email: "Anna@Voorbeeld.nl", aangemaakt_op: urenGeleden(30) })],
      [{ email: "anna@voorbeeld.nl", aangemaakt_op: urenGeleden(29) }],
      nu,
      24,
    );
    expect(r.versturen).toEqual([]);
    expect(ids(r.overslaan)).toEqual(["o1"]);
  });

  it("stuurt wel als de betaalde bestelling van vóór de open bestelling is", () => {
    const r = selecteerBetaalherinneringen(
      [order({ id: "o1", aangemaakt_op: urenGeleden(30) })],
      [{ email: "anna@voorbeeld.nl", aangemaakt_op: urenGeleden(100) }],
      nu,
      24,
    );
    expect(ids(r.versturen)).toEqual(["o1"]);
  });

  it("stuurt per adres maar één herinnering, voor de nieuwste bestelling", () => {
    const r = selecteerBetaalherinneringen(
      [
        order({ id: "oud", aangemaakt_op: urenGeleden(60) }),
        order({ id: "nieuw", aangemaakt_op: urenGeleden(30) }),
        order({ id: "ander", email: "bo@x.nl" }),
      ],
      [],
      nu,
      24,
    );
    expect(ids(r.versturen)).toEqual(["ander", "nieuw"]);
    expect(ids(r.overslaan)).toEqual(["oud"]);
  });

  it("gebruikt het ingestelde aantal uren", () => {
    const open = [order({ id: "o1", aangemaakt_op: urenGeleden(5) })];
    expect(selecteerBetaalherinneringen(open, [], nu, 4).versturen).toHaveLength(1);
    expect(selecteerBetaalherinneringen(open, [], nu, 6).versturen).toHaveLength(0);
  });
});
