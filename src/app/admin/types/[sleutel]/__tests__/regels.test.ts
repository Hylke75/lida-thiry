import { describe, expect, it } from "vitest";
import { aantalBeelden, buren, naarSecties, veldGroepen, verdeelSecties, voorbeeldPaden, type SectieRij } from "../regels";

const beeld = (code: string, thumb: string | null) => ({ code, naam: null, bijschrift: null, pad: `${code}.jpg`, thumb_pad: thumb });

const rijen: SectieRij[] = [
  {
    id: "s1",
    veld_sleutel: "intro",
    volgorde: 1,
    kop: "Intro",
    tekst: "t",
    sectie_beelden: [
      { volgorde: 2, beeld_id: "b2", beelden: beeld("B2", null) },
      { volgorde: 1, beeld_id: "b1", beelden: beeld("B1", "B1-klein.jpg") },
    ],
  },
  { id: "s2", veld_sleutel: null, volgorde: 2, kop: "Los", tekst: "", sectie_beelden: [] },
];

describe("adviestype-editor: secties", () => {
  it("vraagt URLs op voor de miniatuur, of anders het origineel", () => {
    expect(voorbeeldPaden(rijen)).toEqual(["B2.jpg", "B1-klein.jpg"]);
  });

  it("zet beelden op volgorde en koppelt de URL", () => {
    const secties = naarSecties(rijen, { "B1-klein.jpg": "https://x/1" });
    expect(secties[0].beelden.map((b) => [b.code, b.url])).toEqual([
      ["B1", "https://x/1"],
      ["B2", null],
    ]);
    expect(rijen[0].sectie_beelden[0].beeld_id).toBe("b2"); // origineel niet aangepast
    expect(aantalBeelden(secties)).toBe(2);
  });

  it("verdeelt secties over vaste velden en overige", () => {
    const { perVeld, overige } = verdeelSecties(naarSecties(rijen, {}));
    expect([...perVeld.keys()]).toEqual(["intro"]);
    expect(overige.map((s) => s.id)).toEqual(["s2"]);
  });

  it("geeft de groepen in volgorde van eerste voorkomen", () => {
    expect(veldGroepen([{ groep: "A" }, { groep: "B" }, { groep: "A" }])).toEqual(["A", "B"]);
  });
});

describe("adviestype-editor: navigatie", () => {
  const alle = [{ sleutel: "1" }, { sleutel: "2" }, { sleutel: "3" }];
  it("vindt het vorige en volgende type", () => {
    expect(buren(alle, "2")).toEqual({ vorige: { sleutel: "1" }, volgende: { sleutel: "3" } });
    expect(buren(alle, "1")).toEqual({ vorige: null, volgende: { sleutel: "2" } });
    expect(buren(alle, "3")).toEqual({ vorige: { sleutel: "2" }, volgende: null });
    expect(buren(alle, "x")).toEqual({ vorige: null, volgende: null });
  });
});
