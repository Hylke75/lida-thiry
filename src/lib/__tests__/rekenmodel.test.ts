import { describe, expect, it } from "vitest";
import {
  alsBovenlichaam,
  alsBreedstePunt,
  geldigeSchouderbreedte,
  leesLidaGrenzen,
  leesRekenmodel,
} from "../rekenmodel";
import { LIDA_GRENZEN_STANDAARD } from "@/rekenkern/config/lida-model";

describe("rekenmodel-instelling", () => {
  it("is alleen Lida's methode bij precies 'lida'", () => {
    expect(leesRekenmodel("lida")).toBe("lida");
    expect(leesRekenmodel(" LIDA ")).toBe("lida");
    for (const w of [null, undefined, "", "ffit", "aan"]) expect(leesRekenmodel(w)).toBe("ffit");
  });

  it("neemt geldige grenzen over en valt per grens terug op de standaard", () => {
    expect(leesLidaGrenzen("")).toEqual(LIDA_GRENZEN_STANDAARD);
    expect(leesLidaGrenzen("{kapot")).toEqual(LIDA_GRENZEN_STANDAARD);
    expect(leesLidaGrenzen("[1,2]")).toEqual(LIDA_GRENZEN_STANDAARD);
    const g = leesLidaGrenzen(JSON.stringify({ heupBredMin: 0.1, zandloperTailleMax: 5, peerHogeHeupMax: "0,9" }));
    expect(g.heupBredMin).toBe(0.1);
    expect(g.zandloperTailleMax).toBe(LIDA_GRENZEN_STANDAARD.zandloperTailleMax);
    expect(g.peerHogeHeupMax).toBe(LIDA_GRENZEN_STANDAARD.peerHogeHeupMax);
  });

  it("controleert de invoer van de extra vragen", () => {
    expect(alsBreedstePunt("heupen")).toBe("heupen");
    expect(alsBreedstePunt("knieën")).toBeNull();
    expect(alsBovenlichaam("kort")).toBe("kort");
    expect(alsBovenlichaam(3)).toBeNull();
    expect(geldigeSchouderbreedte(39)).toBe(true);
    expect(geldigeSchouderbreedte(100)).toBe(false);
    expect(geldigeSchouderbreedte(undefined)).toBe(false);
  });
});
