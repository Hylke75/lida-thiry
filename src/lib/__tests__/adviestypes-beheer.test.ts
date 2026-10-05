import { describe, it, expect } from "vitest";
import {
  TIJDELIJK_VERSCHIL,
  hernummerPlan,
  letterNaam,
  ontleedSleutel,
  telPerType,
  verplaats,
  verwijderOp,
  voegIn,
} from "../adviestypes-beheer";

describe("verplaats", () => {
  it("verschuift omhoog en omlaag", () => {
    expect(verplaats(["a", "b", "c"], 1, -1)).toEqual(["b", "a", "c"]);
    expect(verplaats(["a", "b", "c"], 1, 1)).toEqual(["a", "c", "b"]);
  });
  it("doet niets aan de randen", () => {
    expect(verplaats(["a", "b"], 0, -1)).toEqual(["a", "b"]);
    expect(verplaats(["a", "b"], 1, 1)).toEqual(["a", "b"]);
    expect(verplaats(["a", "b"], 5, 1)).toEqual(["a", "b"]);
  });
  it("laat de invoer ongemoeid", () => {
    const lijst = ["a", "b"];
    verplaats(lijst, 0, 1);
    expect(lijst).toEqual(["a", "b"]);
  });
});

describe("voegIn en verwijderOp", () => {
  it("voegt in op de juiste plek", () => {
    expect(voegIn(["a", "b"], 1, "x")).toEqual(["a", "x", "b"]);
    expect(voegIn(["a", "b"], 2, "x")).toEqual(["a", "b", "x"]);
    expect(voegIn(["a", "b"], 99, "x")).toEqual(["a", "b", "x"]);
    expect(voegIn(["a", "b"], -3, "x")).toEqual(["x", "a", "b"]);
  });
  it("verwijdert op index", () => {
    expect(verwijderOp(["a", "b", "c"], 1)).toEqual(["a", "c"]);
    expect(verwijderOp(["a"], 3)).toEqual(["a"]);
  });
});

describe("hernummerPlan", () => {
  const rij = (id: string, volgorde: number) => ({ id, volgorde });

  it("slaat rijen over die al goed staan", () => {
    const plan = hernummerPlan([rij("a", 0), rij("b", 1)], (r) => r.volgorde);
    expect(plan).toEqual([]);
  });

  it("geeft na een verwisseling unieke tijdelijke en definitieve volgordes", () => {
    const rijen = [rij("a", 0), rij("b", 1), rij("c", 2)];
    const plan = hernummerPlan(verplaats(rijen, 2, -1), (r) => r.volgorde);
    expect(plan.map((s) => [s.item.id, s.oud, s.naar])).toEqual([
      ["c", 2, 1],
      ["b", 1, 2],
    ]);
    for (const s of plan) expect(s.tijdelijk).toBe(s.naar - TIJDELIJK_VERSCHIL);
  });

  it("dicht gaten na verwijderen", () => {
    const plan = hernummerPlan([rij("a", 0), rij("c", 2), rij("d", 3)], (r) => r.volgorde);
    expect(plan.map((s) => [s.item.id, s.naar])).toEqual([
      ["c", 1],
      ["d", 2],
    ]);
  });

  it("botst nooit: tijdens beide rondes zijn alle volgordes uniek", () => {
    const rijen = [rij("a", 0), rij("b", 1), rij("c", 2), rij("d", 3), rij("n", 1_000_000)];
    // Nieuwe rij 'n' (tijdelijk achteraan) invoegen na 'a'.
    const gewenst = voegIn(rijen.slice(0, 4), 1, rijen[4]);
    const plan = hernummerPlan(gewenst, (r) => r.volgorde);
    const stand = new Map(rijen.map((r) => [r.id, r.volgorde]));
    const uniek = () => new Set(stand.values()).size === stand.size;
    for (const s of plan) {
      stand.set(s.item.id, s.tijdelijk);
      expect(uniek()).toBe(true);
    }
    for (const s of plan) {
      stand.set(s.item.id, s.naar);
      expect(uniek()).toBe(true);
    }
    expect(gewenst.map((r) => stand.get(r.id))).toEqual([0, 1, 2, 3, 4]);
  });

  it("werkt ook met beelden die op hun oude volgorde worden aangeduid", () => {
    // Beeldkoppelingen hebben geen id: de oude volgorde is de sleutel.
    const plan = hernummerPlan([1, 0, 2], (v) => v);
    expect(plan.map((s) => [s.oud, s.naar])).toEqual([
      [1, 0],
      [0, 1],
    ]);
  });
});

describe("telPerType", () => {
  it("telt secties en beelden en neemt de laatste wijziging", () => {
    const telling = telPerType(
      [
        { sleutel: "1X", bijgewerkt_op: "2026-01-01T00:00:00Z" },
        { sleutel: "11A", bijgewerkt_op: "2026-01-05T00:00:00Z" },
        { sleutel: "2X", bijgewerkt_op: null },
      ],
      [
        { id: "s1", type_sleutel: "1X", bijgewerkt_op: "2026-02-01T00:00:00Z" },
        { id: "s2", type_sleutel: "1X", bijgewerkt_op: null },
        { id: "s3", type_sleutel: "11A", bijgewerkt_op: "2026-01-02T00:00:00Z" },
        { id: "s9", type_sleutel: "onbekend", bijgewerkt_op: null },
      ],
      [{ sectie_id: "s1" }, { sectie_id: "s1" }, { sectie_id: "s2" }, { sectie_id: "s9" }],
    );
    expect(telling["1X"]).toEqual({ secties: 2, beelden: 3, laatstBewerkt: "2026-02-01T00:00:00Z" });
    expect(telling["11A"]).toEqual({ secties: 1, beelden: 0, laatstBewerkt: "2026-01-05T00:00:00Z" });
    expect(telling["2X"]).toEqual({ secties: 0, beelden: 0, laatstBewerkt: null });
    expect(telling["onbekend"]).toBeUndefined();
  });
});

describe("overig", () => {
  it("ontleedt sleutels", () => {
    expect(ontleedSleutel("12A")).toEqual({ categorie: 12, letter: "A" });
    expect(ontleedSleutel("6-8")).toBeNull();
    expect(ontleedSleutel("68")).toEqual({ categorie: 6, letter: "8" });
    expect(ontleedSleutel("13X")).toBeNull();
    expect(ontleedSleutel("1Z")).toEqual({ categorie: 1, letter: "Z" }); // eigen lichaamstype
    expect(ontleedSleutel("1z")).toBeNull();
  });
  it("geeft lettername", () => {
    expect(letterNaam("V")).toBe("Omgekeerde driehoek");
    expect(letterNaam("?")).toBe("?");
  });
});
