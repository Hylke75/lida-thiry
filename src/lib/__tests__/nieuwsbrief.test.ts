import { describe, expect, it } from "vitest";
import { controleerVoorVerzenden, renderNieuwsbrief, valideerBlokken, type Blok } from "../nieuwsbrief/blokken";
import { beschrijfDoelgroep, normaliseerDoelgroep, valtBinnen } from "../nieuwsbrief/doelgroep";
import { handtekening, klopt } from "../nieuwsbrief/links";

const BLOKKEN: Blok[] = [
  { id: "a", soort: "kop", tekst: "Hoi {voornaam}" },
  { id: "b", soort: "tekst", tekst: "Lees [ons blog](https://lida.nl/blog?x=1&y=2) of mail [mij](mailto:a@b.nl)." },
  { id: "c", soort: "knop", tekst: "Bekijk", url: "https://lida.nl/a" },
  { id: "d", soort: "afbeelding", url: "https://cdn.nl/x.png", alt: "Jurk <rood>", link: "" },
];

describe("nieuwsbrief: blokken", () => {
  it("valideert en schoont blokken op", () => {
    const { blokken, fouten } = valideerBlokken([
      { id: "a", soort: "kop", tekst: " Titel " },
      { id: "a", soort: "knop", tekst: "x", url: "javascript:alert(1)" },
      { soort: "afbeelding", url: "http://onveilig.nl/x.png", alt: "" },
      { soort: "onzin" },
    ]);
    expect(blokken.map((b) => b.id)).toEqual(["a", "ax", "b3"]);
    expect(blokken[0]).toMatchObject({ tekst: "Titel" });
    expect(fouten).toHaveLength(3);
  });

  it("controleert of een campagne klaar is om te verzenden", () => {
    expect(controleerVoorVerzenden({ onderwerp: "", blokken: [] })).toHaveLength(2);
    expect(controleerVoorVerzenden({ onderwerp: "Hoi", blokken: BLOKKEN })).toEqual([]);
  });

  it("maakt persoonlijke HTML met meetlinks, pixel en afmeldlink", () => {
    const r = renderNieuwsbrief({
      onderwerp: "Nieuws voor {voornaam}",
      preheader: "Even bijpraten",
      blokken: BLOKKEN,
      ontvanger: { naam: "Anna de Vries", email: "anna@x.nl" },
      afmeldUrl: "https://lida.nl/afmelden/t",
      afzender: { naam: "Lida & Co", adres: "Straat 1\n1234 AB Stad" },
      volgLink: (u) => `https://lida.nl/k?u=${encodeURIComponent(u)}`,
      pixelUrl: "https://lida.nl/o/1",
    });
    expect(r.onderwerp).toBe("Nieuws voor Anna");
    expect(r.html).toContain("Hoi Anna");
    expect(r.html).toContain(`href="https://lida.nl/k?u=${encodeURIComponent("https://lida.nl/blog?x=1&y=2")}"`);
    expect(r.html).toContain('href="mailto:a@b.nl"');
    expect(r.html).toContain('href="https://lida.nl/afmelden/t"');
    expect(r.html).toContain('alt="Jurk &lt;rood&gt;"');
    expect(r.html).toContain("Lida &amp; Co");
    expect(r.html).toContain("Straat 1, 1234 AB Stad");
    expect(r.html).toContain('src="https://lida.nl/o/1"');
    expect(r.tekst).toContain("Afmelden: https://lida.nl/afmelden/t");
    expect(r.tekst).toContain("Bekijk: https://lida.nl/a");
  });

  it("valt terug op 'daar' zonder naam", () => {
    const r = renderNieuwsbrief({
      onderwerp: "Hoi {voornaam}",
      preheader: "",
      blokken: [],
      ontvanger: { naam: null, email: "x@y.nl" },
      afmeldUrl: "#",
      afzender: { naam: "L", adres: null },
    });
    expect(r.onderwerp).toBe("Hoi daar");
    expect(r.html).not.toContain("<img");
  });
});

describe("nieuwsbrief: doelgroep", () => {
  const c = { email: "a@b.nl", status: "aangemeld", bron: "formulier", tags: ["vip", "zomer"] };

  it("normaliseert onbetrouwbare invoer", () => {
    expect(normaliseerDoelgroep({ tags: [" VIP ", 3, "vip"], bronnen: ["x", "import"], figuurtypes: ["A", "z"], besteld: "misschien" })).toEqual({
      tags: ["vip"],
      tagsModus: "een",
      bronnen: ["import"],
      figuurtypes: ["A"],
    });
  });

  it("filtert op status, tags, bron, klant en figuurtype", () => {
    expect(valtBinnen(c, {})).toBe(true);
    expect(valtBinnen({ ...c, status: "afgemeld" }, {})).toBe(false);
    expect(valtBinnen(c, { tags: ["vip", "winter"], tagsModus: "een" })).toBe(true);
    expect(valtBinnen(c, { tags: ["vip", "winter"], tagsModus: "alle" })).toBe(false);
    expect(valtBinnen(c, { zonderTags: ["zomer"] })).toBe(false);
    expect(valtBinnen(c, { bronnen: ["import"] })).toBe(false);
    const klant = { besteld: true, figuurtypes: new Set(["A"]) };
    expect(valtBinnen(c, { besteld: "ja" })).toBe(false);
    expect(valtBinnen(c, { besteld: "ja", figuurtypes: ["A"] }, klant)).toBe(true);
    expect(valtBinnen(c, { besteld: "nee" }, klant)).toBe(false);
    expect(valtBinnen(c, { figuurtypes: ["X"] }, klant)).toBe(false);
  });

  it("beschrijft een doelgroep leesbaar", () => {
    expect(beschrijfDoelgroep({})).toBe("Alle aangemelde contacten");
    expect(beschrijfDoelgroep({ tags: ["vip"], besteld: "ja" })).toBe("Aangemelde contacten: tag vip, klanten");
  });
});

describe("nieuwsbrief: links", () => {
  it("ondertekent kliklinks en weigert vervalste", () => {
    const sig = handtekening("v1", "https://x.nl", "geheim");
    expect(klopt("v1", "https://x.nl", sig, "geheim")).toBe(true);
    expect(klopt("v1", "https://evil.nl", sig, "geheim")).toBe(false);
    expect(klopt("v2", "https://x.nl", sig, "geheim")).toBe(false);
    expect(klopt("v1", "https://x.nl", "kort", "geheim")).toBe(false);
  });
});
