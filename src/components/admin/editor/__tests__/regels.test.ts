import { describe, expect, it } from "vitest";
import { tekstZacht } from "../../stijl";
import { googleAdres, isOpslaanToets, kortAf, omslagUitBibliotheek, tellerKlasse, toonbareOmslag } from "../regels";

describe("editor: tekenteller", () => {
  it("is zacht tot 90%, oranje daarboven en rood boven het maximum", () => {
    expect(tellerKlasse(0, 100)).toBe(tekstZacht);
    expect(tellerKlasse(90, 100)).toBe(tekstZacht);
    expect(tellerKlasse(91, 100)).toContain("amber");
    expect(tellerKlasse(100, 100)).toContain("amber");
    expect(tellerKlasse(101, 100)).toContain("red");
  });
});

describe("editor: Google-voorbeeld", () => {
  it("laat korte teksten staan", () => {
    expect(kortAf("Kort", 60)).toBe("Kort");
    expect(kortAf("x".repeat(60), 60)).toBe("x".repeat(60));
  });

  it("kort lange teksten af op een woordgrens", () => {
    const uit = kortAf("een twee drie vier vijf", 12);
    expect(uit).toBe("een twee …");
    expect(uit.length).toBeLessThanOrEqual(12);
  });

  it("toont het adres zonder protocol en met › tussen de delen", () => {
    expect(googleAdres("https://example.nl/blog/mijn-bericht")).toBe("example.nl › blog › mijn-bericht");
    expect(googleAdres("http://example.nl")).toBe("example.nl");
  });
});

describe("editor: omslagfoto", () => {
  it("toont alleen https-adressen als voorbeeld", () => {
    expect(toonbareOmslag("https://x.nl/a.jpg")).toBe(true);
    expect(toonbareOmslag("http://x.nl/a.jpg")).toBe(false);
    expect(toonbareOmslag("/lokaal.jpg")).toBe(false);
  });

  it("neemt de omschrijving uit de bibliotheek alleen over als er nog geen is", () => {
    expect(omslagUitBibliotheek("", { url: "u", alt: "Jurk" })).toEqual({ omslag_url: "u", omslag_alt: "Jurk" });
    expect(omslagUitBibliotheek("  ", { url: "u", alt: "Jurk" })).toEqual({ omslag_url: "u", omslag_alt: "Jurk" });
    expect(omslagUitBibliotheek("Eigen", { url: "u", alt: "Jurk" })).toEqual({ omslag_url: "u" });
    expect(omslagUitBibliotheek("", { url: "u", alt: "" })).toEqual({ omslag_url: "u" });
  });
});

describe("editor: sneltoets", () => {
  it("herkent Ctrl+S en ⌘S, ook met hoofdletter", () => {
    expect(isOpslaanToets({ ctrlKey: true, metaKey: false, key: "s" })).toBe(true);
    expect(isOpslaanToets({ ctrlKey: false, metaKey: true, key: "S" })).toBe(true);
    expect(isOpslaanToets({ ctrlKey: false, metaKey: false, key: "s" })).toBe(false);
    expect(isOpslaanToets({ ctrlKey: true, metaKey: false, key: "a" })).toBe(false);
  });
});
