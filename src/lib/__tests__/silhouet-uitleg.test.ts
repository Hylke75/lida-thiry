import { describe, it, expect } from "vitest";
import { silhouetNaam, silhouetVerschilReden } from "../silhouet-uitleg";

describe("silhouetVerschilReden", () => {
  it("legt uit dat heupen breder zijn bij Peer / driehoek", () => {
    const r = silhouetVerschilReden({ borst: 88, taille: 74, hogeHeup: 92, heup: 100 }, "X", "A");
    expect(r).toBe(
      "Je heupen zijn duidelijk breder dan je borst (12 cm verschil). Dat past meer bij Peer / driehoek dan bij Zandloper.",
    );
  });

  it("legt uit dat de borst breder is bij Omgekeerde driehoek", () => {
    const r = silhouetVerschilReden({ borst: 104, taille: 86, hogeHeup: 90, heup: 92 }, "H", "V");
    expect(r).toContain("Je borst is duidelijk breder dan je heupen (12 cm verschil).");
    expect(r).toContain("Omgekeerde driehoek dan bij Rechthoek");
  });

  it("noemt de smalle taille bij Zandloper", () => {
    const r = silhouetVerschilReden({ borst: 96, taille: 70, hogeHeup: 86, heup: 97 }, "A", "X");
    expect(r).toContain("bijna even breed (1 cm verschil)");
    expect(r).toContain("taille is duidelijk smaller (27 cm)");
    expect(r).toContain("Zandloper dan bij Peer / driehoek");
  });

  it("noemt het kleine taille-verschil bij Rechthoek", () => {
    const r = silhouetVerschilReden({ borst: 90, taille: 82, hogeHeup: 90, heup: 92 }, "X", "H");
    expect(r).toContain("taille is maar 10 cm smaller");
    expect(r).toContain("Rechthoek dan bij Zandloper");
  });

  it("onderscheidt voller onder en voller boven bij De 8", () => {
    const onder = silhouetVerschilReden({ borst: 92, taille: 79, hogeHeup: 93, heup: 103 }, "X", "8");
    expect(onder).toContain("heupen zijn voller dan je borst (11 cm verschil)");
    const boven = silhouetVerschilReden({ borst: 104, taille: 78, hogeHeup: 88, heup: 96 }, "X", "8");
    expect(boven).toContain("borst is voller dan je heupen (8 cm verschil)");
    expect(boven).toContain("De 8 dan bij Zandloper");
  });

  it("geeft de naam van een silhouet", () => {
    expect(silhouetNaam("V")).toBe("Omgekeerde driehoek");
  });
});
