import { describe, expect, it } from "vitest";
import { berekenGebruik, kostenDollarcent } from "../blog/ai-prompt";
import { parseerOpmaak, veiligeUrl } from "../inhoud/opmaak";
import { isSvg } from "../media/regels";
import { blokkenInTekst, PAGINA_BLOK_LABELS, PAGINA_BLOKKEN } from "../paginas/regels";
import { deelMetadata, STANDAARD_DEELBEELD, standaardDeelbeeld } from "../seo/delen";

describe("opmaak: veilige links", () => {
  it("weigert backslashes en tabs (browsers maken daar //ander-domein van)", () => {
    expect(veiligeUrl("/over")).toBe(true);
    expect(veiligeUrl("https://example.com/a")).toBe(true);
    expect(veiligeUrl("mailto:a@b.nl")).toBe(true);
    expect(veiligeUrl("//evil.com")).toBe(false);
    expect(veiligeUrl("/\\evil.com")).toBe(false);
    expect(veiligeUrl("/\t/evil.com")).toBe(false);
    expect(veiligeUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("pagina's: blokken herkennen zoals de opmaak", () => {
  it("telt alleen wat de opmaak ook als blok ziet", () => {
    const tekst = "{contactformulier}\n  {nieuwsbrief_zomer_2026}  \n{2fout}\n{_fout}\ntekst {test}";
    expect(blokkenInTekst(tekst)).toEqual(["contactformulier", "nieuwsbrief_zomer_2026"]);
    const blokken = parseerOpmaak(tekst).filter((b) => b.soort === "blok").map((b) => (b as { naam: string }).naam);
    expect(blokken).toEqual(blokkenInTekst(tekst));
  });

  it("heeft voor elk blok een label en een uitleg", () => {
    expect(Object.keys(PAGINA_BLOK_LABELS)).toEqual(Object.keys(PAGINA_BLOKKEN));
  });
});

describe("blog-AI: gebruik en kosten", () => {
  it("rekent met het model dat het antwoord leverde", () => {
    expect(kostenDollarcent(1_000_000, 0, "claude-sonnet-5-5")).toBe(200);
    expect(kostenDollarcent(1_000_000, 0, "onbekend-model")).toBe(400);
    expect(berekenGebruik("claude-opus-5-5", { input_tokens: 1000, output_tokens: 2000 })).toEqual({
      invoer: 1000,
      uitvoer: 2000,
      kosten: kostenDollarcent(1000, 2000),
      model: "claude-opus-5-5",
    });
  });

  it("telt bij een fallback elke stap tegen de prijs van zijn eigen model", () => {
    const g = berekenGebruik("claude-sonnet-5-5", {
      input_tokens: 0,
      output_tokens: 0,
      iterations: [
        { input_tokens: 1_000_000, output_tokens: 0, model: "claude-opus-5-5" },
        { input_tokens: 1_000_000, output_tokens: 0, model: "claude-sonnet-5-5" },
      ],
    });
    expect(g).toEqual({ invoer: 2_000_000, uitvoer: 0, kosten: 600, model: "claude-sonnet-5-5" });
  });
});

describe("media: SVG", () => {
  it("herkent SVG", () => {
    expect(isSvg("image/svg+xml")).toBe(true);
    expect(isSvg("IMAGE/SVG+XML")).toBe(true);
    expect(isSvg("image/png")).toBe(false);
    expect(isSvg(null)).toBe(false);
  });
});

describe("seo: deelmetadata", () => {
  const site = { volledigeNaam: "Mijn Site", deelAfbeeldingUrl: null };

  it("valt terug op de standaard-deelafbeelding en gebruikt de sitenaam", () => {
    const m = deelMetadata(site, { titel: "Over", url: "/over" });
    expect(m.openGraph).toMatchObject({ siteName: "Mijn Site", type: "website", images: [{ url: STANDAARD_DEELBEELD }] });
    expect(m.twitter).toMatchObject({ images: [{ url: STANDAARD_DEELBEELD }] });
  });

  it("gebruikt de deelafbeelding uit de instellingen, of een eigen omslag", () => {
    const metBeeld = { ...site, deelAfbeeldingUrl: "https://x.nl/deel.png" };
    expect(standaardDeelbeeld(metBeeld).url).toBe("https://x.nl/deel.png");
    expect(deelMetadata(metBeeld, { titel: "a", url: "/a" }).openGraph).toMatchObject({ images: [{ url: "https://x.nl/deel.png" }] });
    const eigen = deelMetadata(metBeeld, { titel: "a", url: "/a", beeld: { url: "https://x.nl/omslag.jpg", alt: "Omslag" } });
    expect(eigen.openGraph).toMatchObject({ images: [{ url: "https://x.nl/omslag.jpg", alt: "Omslag" }] });
  });

  it("maakt van een blogbericht een artikel", () => {
    const m = deelMetadata(site, { titel: "a", url: "/blog/a", artikel: { publishedTime: "2026-01-01", tags: ["x"] } });
    expect(m.openGraph).toMatchObject({ type: "article", publishedTime: "2026-01-01", tags: ["x"] });
  });
});
