import { describe, expect, it } from "vitest";
import {
  leestijdMinuten,
  maakSlug,
  metaOmschrijving,
  publicatieProblemen,
  valideerBericht,
  zichtbaarheid,
  eersteAfbeelding,
} from "../blog/regels";
import { kostenDollarcent, normaliseerOpdracht, schrijfVraag, systeemPrompt, SCHRIJF_SCHEMA } from "../blog/ai-prompt";

describe("blog: regels", () => {
  it("maakt nette slugs", () => {
    expect(maakSlug("Jurken voor de Peer & Zandloper!")).toBe("jurken-voor-de-peer-en-zandloper");
    expect(maakSlug("Café-stijl: één look")).toBe("cafe-stijl-een-look");
    expect(maakSlug("   ")).toBe("");
  });

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

  it("rekent kosten uit in dollarcent", () => {
    expect(kostenDollarcent(1_000_000, 0)).toBe(400);
    expect(kostenDollarcent(2_000, 3_000)).toBe(6.8);
  });
});
