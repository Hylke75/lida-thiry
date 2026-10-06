import { describe, expect, it } from "vitest";
import {
  leestijdMinuten,
  metaOmschrijving,
  publicatieProblemen,
  valideerBericht,
  zichtbaarheid,
  eersteAfbeelding,
} from "../blog/regels";
import {
  kostenDollarcent,
  normaliseerOpdracht,
  schrijfVraag,
  standaardSchrijfstijl,
  systeemPrompt,
  SCHRIJF_SCHEMA,
} from "../blog/ai-prompt";

describe("blog: regels", () => {
  it("berekent leestijd en zichtbaarheid", () => {
    expect(leestijdMinuten("woord ".repeat(660))).toBe(3);
    expect(leestijdMinuten("")).toBe(1);
    const nu = new Date("2026-10-04T12:00:00Z");
    expect(zichtbaarheid({ status: "concept", gepubliceerd_op: null }, nu)).toBe("concept");
    expect(zichtbaarheid({ status: "gepubliceerd", gepubliceerd_op: "2026-10-05T00:00:00Z" }, nu)).toBe("ingepland");
    expect(zichtbaarheid({ status: "gepubliceerd", gepubliceerd_op: "2026-10-01T00:00:00Z" }, nu)).toBe("online");
  });

  it("valideert invoer en vult de slug aan", () => {
    const r = valideerBericht({ titel: "Hallo wereld", inhoud: "x", tags: [" Zomer ", "zomer"] });
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.waarde.slug).toBe("hallo-wereld");
      expect(r.waarde.tags).toEqual(["zomer"]);
      expect(r.waarde.auteur).toBe("Lida Thiry");
    }
    const fout = valideerBericht({ titel: "", slug: "Niet Goed", omslag_url: "http://x.nl/a.png" });
    expect(fout.ok).toBe(false);
    if (!fout.ok) expect(fout.fouten.length).toBe(4);
  });

  it("vindt publicatieproblemen, meta-omschrijving en eerste afbeelding", () => {
    expect(publicatieProblemen({ titel: "T", samenvatting: "", inhoud: "kort [foto: jurk]" })).toHaveLength(2);
    expect(metaOmschrijving({ seo_omschrijving: "", samenvatting: "", inhoud: "## Kop\n\n" + "lang ".repeat(60) }).length).toBeLessThanOrEqual(160);
    expect(eersteAfbeelding("Tekst\n\n![Jurk](https://x.nl/a.png)")).toEqual({ url: "https://x.nl/a.png", alt: "Jurk" });
  });
});

describe("blog: AI-opdracht", () => {
  it("normaliseert de opdracht", () => {
    expect(normaliseerOpdracht({ steekwoorden: " " }).ok).toBe(false);
    const r = normaliseerOpdracht({ steekwoorden: "jeans, peer\nhoge taille, jeans", toon: "onbekend", lengte: "lang" });
    expect(r.ok && r.opdracht).toEqual({ steekwoorden: ["jeans", "peer", "hoge taille"], toon: "warm", lengte: "lang" });
  });

  it("bouwt de prompts op", () => {
    const vraag = schrijfVraag({ steekwoorden: ["jeans", "peer"], toon: "warm", lengte: "kort", figuurtypes: ["Peer / driehoek"] });
    expect(vraag).toContain("ongeveer 500 woorden");
    expect(vraag).toContain("jeans, peer");
    expect(vraag).toContain("Peer / driehoek");
    expect(systeemPrompt(["Zandloper"])).toContain("Zandloper");
    expect(systeemPrompt([])).toContain("Verzin geen feiten");
    expect(SCHRIJF_SCHEMA.required).toContain("inhoud");
  });

  it("gebruikt standaard de vaste schrijfstijl (gelijk aan de vroegere vaste tekst)", () => {
    expect(systeemPrompt(["Zandloper", "Rechthoek"])).toBe(`Je schrijft blogberichten voor de website van Lida Thiry, imago- en kledingadviseur in Nederland. Op de site staat een betaalde online kledingadviestest: klanten meten zichzelf op, krijgen hun figuurtype te zien en ontvangen een persoonlijk kledingadvies als PDF.

Figuurtypes die Lida gebruikt: Zandloper, Rechthoek. Gebruik deze namen als je naar figuurtypes verwijst.

Schrijf in het Nederlands, in de je-vorm, alsof Lida zelf schrijft (ik-perspectief mag). Praktisch en concreet: lezers moeten na het lezen iets kunnen doen met het advies. Positief over elk lichaam; geen afvaltips, geen oordeel over gewicht, geen medische uitspraken.

Verzin geen feiten: geen statistieken, onderzoeken, citaten, klantverhalen of namen van merken en winkels. Algemeen vakkundig stijladvies is prima. Als iets een bron nodig heeft, laat het weg.

Sluit af met een korte, natuurlijke uitnodiging om de online kledingadviestest te doen via [de kledingadviestest](/bestellen) — niet opdringerig.

Gebruik uitsluitend deze eenvoudige opmaak in de tekst (geen HTML, geen andere Markdown):
- "## " aan het begin van een regel voor een tussenkop, "### " voor een kleinere kop (geen # voor de hoofdtitel: die staat apart)
- "- " aan het begin van een regel voor een opsommingsteken
- **vet** voor nadruk (spaarzaam)
- [linktekst](/pad) voor een link; gebruik alleen deze interne links: /bestellen (de online kledingadviestest) en /blog
- een lege regel tussen alinea's
- waar een foto het verhaal versterkt, een eigen regel "[foto: korte beschrijving van de gewenste foto]"; de schrijver vervangt die later door een echte foto`);
  });

  it("past de schrijfstijl uit het beheer toe", () => {
    const stijl = {
      ...standaardSchrijfstijl(),
      merk: "Anna Stijl",
      vermijden: "Geen jargon.",
      links: [
        { _id: "a", pad: "/afspraak", omschrijving: "een afspraak maken" },
        { _id: "b", pad: "/bestellen", omschrijving: "" },
        { _id: "c", pad: "/blog", omschrijving: "" },
      ],
    };
    const p = systeemPrompt([], stijl);
    expect(p).toContain("de website van Anna Stijl, imago-");
    expect(p).toContain("Figuurtypes die Anna gebruikt");
    expect(p).toContain("Geen jargon.");
    expect(p).not.toContain("Verzin geen feiten");
    expect(p).toContain("interne links: /afspraak (een afspraak maken), /bestellen en /blog");
    expect(systeemPrompt([], { ...stijl, links: [] })).toContain("- geen links");
    expect(schrijfVraag({ steekwoorden: ["jeans"], toon: "warm", lengte: "kort", extra: "x" }, "Anna")).toContain(
      "alsof Anna een klant aan tafel adviseert",
    );
  });

  it("rekent kosten uit in dollarcent", () => {
    expect(kostenDollarcent(1_000_000, 0)).toBe(400);
    expect(kostenDollarcent(2_000, 3_000)).toBe(6.8);
  });
});
