import { describe, it, expect } from "vitest";
import { blokken, inlineDelen, schoon, zonderOpmaak } from "../pdf/opmaak";

describe("tekstopmaak PDF", () => {
  it("maakt alinea's en opsommingen", () => {
    expect(blokken("Eerste regel\nloopt door.\n\n- punt een\n- punt twee\n\nSlot")).toEqual([
      { type: "para", tekst: "Eerste regel loopt door." },
      { type: "bullet", tekst: "punt een" },
      { type: "bullet", tekst: "punt twee" },
      { type: "para", tekst: "Slot" },
    ]);
  });

  it("herkent vet en cursief", () => {
    expect(inlineDelen("**Bootcut**: een *subtiel* uitlopende pijp")).toEqual([
      { tekst: "Bootcut", vet: true, cursief: false },
      { tekst: ": een ", vet: false, cursief: false },
      { tekst: "subtiel", vet: false, cursief: true },
      { tekst: " uitlopende pijp", vet: false, cursief: false },
    ]);
  });

  it("laat losse sterretjes staan", () => {
    expect(inlineDelen("maat 3 * 4")).toEqual([{ tekst: "maat 3 * 4", vet: false, cursief: false }]);
  });

  it("zet Word-onderstreping om naar vet en verwijdert opmaak voor koppen", () => {
    expect(schoon("<u>Sarong</u>: tekst\\")).toBe("**Sarong**: tekst");
    expect(zonderOpmaak("**Je tops**")).toBe("Je tops");
  });
});
