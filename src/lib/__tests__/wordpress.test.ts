import { describe, expect, it } from "vitest";
import { parseerOpmaak } from "../inhoud/opmaak";
import {
  basisBeeldnaam,
  bepaalLink,
  htmlNaarOpmaak,
  kiesCategorieEnTags,
  opslagPad,
  samenvattingUitExcerpt,
  zonderDubbeleOmslag,
  type LinkContext,
} from "../blog/wordpress";

const ctx: LinkContext = {
  slugVanId: new Map([[5732, "herfsttype"]]),
  slugs: new Set(["herfsttype", "korte-benen"]),
  categorieen: new Map([["kleuren-dragen", "Kleuren dragen"]]),
};
const opties = {
  afbeelding: (src: string) => (src.includes("emoji") ? null : `https://cdn.test/${basisBeeldnaam(src)}`),
  link: (href: string) => bepaalLink(href, ctx),
};
const zet = (html: string) => htmlNaarOpmaak(html, opties);

describe("htmlNaarOpmaak", () => {
  it("zet alinea's, koppen, vet en entiteiten om", () => {
    expect(zet("<p>Een &#8211; twee <strong>vet </strong>drie</p>\n<h3>Kop</h3><h4>Sub</h4><pre>Uitgelicht</pre>")).toBe(
      "Een – twee **vet** drie\n\n## Kop\n\n### Sub\n\nUitgelicht",
    );
  });

  it("maakt lijsten, ook genummerd", () => {
    expect(zet("<ul><li>a</li><li><b>b</b></li></ul><ol><li>x</li><li>y</li></ol>")).toBe("- a\n- **b**\n- 1. x\n- 2. y");
    const blokken = parseerOpmaak(zet("<ul><li>a</li><li>b</li></ul>"));
    expect(blokken).toHaveLength(1);
    expect(blokken[0].soort).toBe("lijst");
  });

  it("zet afbeeldingen op een eigen regel en laat emoji weg", () => {
    expect(
      zet('<p>Tekst <img src="https://www.lidathiry.nl/wp-content/uploads/2026/10/IMG-1200x579.jpeg" alt="Een [foto]"> na <img src="https://s.w.org/emoji/1.png"></p>'),
    ).toBe("Tekst\n\n![Een (foto)](https://cdn.test/img.jpeg)\n\nna");
  });

  it("herschrijft links naar berichten en categorieën", () => {
    expect(zet('<p>Zie <a href="https://lidathiry.nl/korte-benen/">korte benen</a> en <a href="https://www.lidathiry.nl/?p=5732"> herfst</a>.</p>')).toBe(
      "Zie [korte benen](/blog/korte-benen) en [herfst](/blog/herfsttype).",
    );
    expect(zet('<a href="https://www.lidathiry.nl/categorie/kleuren-dragen/">kleur</a>')).toBe("[kleur](/blog?categorie=Kleuren%20dragen)");
  });

  it("laat Mailchimp-banners weg en houdt de tekst van links naar een vergroting", () => {
    expect(zet('<p><a href=" https://lidathiry.us6.list-manage.com/subscribe?u=1"><img src="https://www.lidathiry.nl/wp-content/uploads/a.jpeg"></a></p><p>Rest</p>')).toBe("Rest");
    expect(zet('<p><a href="https://www.lidathiry.nl/wp-content/uploads/b.jpg">groot</a></p>')).toBe("groot");
  });

  it("maakt van een YouTube-video een link", () => {
    expect(zet('<p><iframe title="Zo zoom je" src="https://www.youtube.com/embed/N7_AsdW6d0M?feature=oembed"></iframe></p>')).toBe(
      "[Bekijk de video: Zo zoom je](https://www.youtube.com/watch?v=N7_AsdW6d0M)",
    );
  });

  it("houdt regelovergangen en voorkomt {variabelen}", () => {
    expect(zet("<p>regel 1<br />regel {naam}</p>")).toBe("regel 1\nregel (naam)");
  });

  it("negeert scripts en commentaar", () => {
    expect(zet("<p>a<!--more--></p><script>alert(1)</script><p>b</p>")).toBe("a\n\nb");
  });
});

describe("hulpfuncties", () => {
  it("haalt de dubbele omslag weg", () => {
    const tekst = "![x](https://cdn/a.jpeg)\n\nTekst";
    expect(zonderDubbeleOmslag(tekst, "https://cdn/omslag", (u) => (u === "https://cdn/omslag" ? "https://oud/a-e1790498949507.jpeg" : "https://oud/a-300x200.jpeg"))).toBe("Tekst");
    expect(zonderDubbeleOmslag(tekst, null, () => undefined)).toBe(tekst);
  });

  it("kiest de meest specifieke categorie", () => {
    const c = (id: number, name: string, parent = 0) => ({ id, name, slug: name.toLowerCase(), taxonomy: "category", parent });
    const r = kiesCategorieEnTags([c(4, "Beauty"), c(7, "Make-up", 4)], [{ id: 9, name: "Lippen &amp; Mond", slug: "l", taxonomy: "post_tag" }], () => undefined);
    expect(r).toEqual({ categorie: "Make-up", tags: ["beauty", "lippen & mond"] });
  });

  it("maakt een veilig opslagpad", () => {
    expect(opslagPad("https://www.lidathiry.nl/wp-content/uploads/2021/02/Scherm%20afbeelding%C3%A9.PNG")).toBe("wp/2021/02/Scherm-afbeeldinge.png");
    expect(opslagPad("https://elders.nl/x.jpg")).toBeNull();
  });

  it("maakt een samenvatting zonder [...]", () => {
    expect(samenvattingUitExcerpt("<p>Korte tekst &#8211; meer [&hellip;]</p>")).toBe("Korte tekst – meer…");
  });
});
