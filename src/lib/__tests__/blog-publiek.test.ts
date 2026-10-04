import { describe, expect, it } from "vitest";
import {
  blogHref,
  formatteerDatum,
  kiesGerelateerd,
  leesFilter,
  leesPagina,
  paginaNummers,
  paginering,
  telWaarden,
} from "../blog/lijst";
import { bouwRss, rfc822, xmlTekst } from "../blog/rss";
import { blogPostingJsonLd, veiligeJson } from "../blog/structuur";
import { deelLinks } from "../blog/delen";

describe("blog: paginering", () => {
  it("leest ?pagina veilig", () => {
    expect(leesPagina(undefined)).toBe(1);
    expect(leesPagina("3")).toBe(3);
    expect(leesPagina(["4", "5"])).toBe(4);
    expect(leesPagina("0")).toBe(1);
    expect(leesPagina("-2")).toBe(1);
    expect(leesPagina("2abc")).toBe(1);
    expect(leesPagina("99999999999")).toBe(1);
  });

  it("leest filters (leeg = undefined, ingekort)", () => {
    expect(leesFilter(undefined)).toBeUndefined();
    expect(leesFilter("  ")).toBeUndefined();
    expect(leesFilter(" Kleur ")).toBe("Kleur");
    expect(leesFilter("x".repeat(100), 10)).toHaveLength(10);
  });

  it("rekent pagina's, ranges en vorige/volgende uit", () => {
    expect(paginering(0, 1, 9)).toEqual({ pagina: 1, paginas: 1, van: 0, tot: 8, vorige: null, volgende: null });
    expect(paginering(20, 2, 9)).toEqual({ pagina: 2, paginas: 3, van: 9, tot: 17, vorige: 1, volgende: 3 });
    expect(paginering(20, 3, 9)).toMatchObject({ pagina: 3, vorige: 2, volgende: null });
    // Te hoge pagina wordt begrensd.
    expect(paginering(10, 50, 9)).toMatchObject({ pagina: 2, paginas: 2 });
  });

  it("toont paginanummers met weglatingen", () => {
    expect(paginaNummers(1, 5)).toEqual([1, 2, 3, 4, 5]);
    expect(paginaNummers(1, 12)).toEqual([1, 2, "…", 12]);
    expect(paginaNummers(6, 12)).toEqual([1, "…", 5, 6, 7, "…", 12]);
    expect(paginaNummers(3, 12)).toEqual([1, 2, 3, 4, "…", 12]);
    expect(paginaNummers(12, 12)).toEqual([1, "…", 11, 12]);
  });

  it("bouwt filter-URL's", () => {
    expect(blogHref()).toBe("/blog");
    expect(blogHref({ pagina: 1 })).toBe("/blog");
    expect(blogHref({ categorie: "Kleur & stijl", pagina: 2 })).toBe("/blog?categorie=Kleur+%26+stijl&pagina=2");
    expect(blogHref({ tag: "jurken" })).toBe("/blog?tag=jurken");
  });
});

describe("blog: datums en tellingen", () => {
  it("formatteert in het Nederlands, in Nederlandse tijd", () => {
    expect(formatteerDatum("2026-10-04T10:00:00Z")).toBe("4 oktober 2026");
    // 23:30 UTC op 31 december is in Nederland al 1 januari.
    expect(formatteerDatum("2026-12-31T23:30:00Z")).toBe("1 januari 2027");
    expect(formatteerDatum(null)).toBe("");
    expect(formatteerDatum("geen datum")).toBe("");
  });

  it("telt categorieën en tags", () => {
    expect(telWaarden(["Kleur", "Stijl", "Kleur", null, " ", "Advies"])).toEqual([
      { naam: "Kleur", aantal: 2 },
      { naam: "Advies", aantal: 1 },
      { naam: "Stijl", aantal: 1 },
    ]);
  });
});

describe("blog: lees ook", () => {
  const b = (id: string, tags: string[], categorie: string | null, dag: number) => ({
    id,
    tags,
    categorie,
    gepubliceerd_op: `2026-09-${String(dag).padStart(2, "0")}T10:00:00Z`,
  });
  const huidig = b("h", ["jurken", "zandloper"], "Figuur", 20);

  it("kiest eerst gedeelde tags, dan categorie, dan de nieuwste", () => {
    const kandidaten = [
      huidig,
      b("nieuw", [], null, 30),
      b("cat", [], "figuur", 10),
      b("eenTag", ["jurken"], null, 5),
      b("tweeTags", ["Jurken", "zandloper"], null, 1),
      b("oud", [], null, 2),
    ];
    expect(kiesGerelateerd(huidig, kandidaten, 4).map((k) => k.id)).toEqual(["tweeTags", "eenTag", "cat", "nieuw"]);
  });

  it("vult aan met de nieuwste en sluit het bericht zelf uit", () => {
    const kandidaten = [b("a", [], null, 1), huidig, b("c", [], null, 3)];
    expect(kiesGerelateerd(huidig, kandidaten, 3).map((k) => k.id)).toEqual(["c", "a"]);
    expect(kiesGerelateerd(huidig, kandidaten, 0)).toEqual([]);
  });
});

describe("blog: RSS", () => {
  it("ontsnapt XML en verwijdert ongeldige tekens", () => {
    expect(xmlTekst(`<b>"Jurk" & 'rok'</b>\u0001`)).toBe("&lt;b&gt;&quot;Jurk&quot; &amp; &apos;rok&apos;&lt;/b&gt;");
  });

  it("geeft RFC 822-datums", () => {
    expect(rfc822("2026-10-04T18:00:00Z")).toBe("Sun, 04 Oct 2026 18:00:00 GMT");
    expect(rfc822("onzin")).toBe("");
  });

  it("bouwt een geldige RSS 2.0-feed", () => {
    const xml = bouwRss({
      titel: "Blog · Lida",
      link: "https://lidathiry.nl/blog",
      feedUrl: "https://lidathiry.nl/blog/rss.xml",
      omschrijving: "Tips & inspiratie",
      items: [
        {
          titel: "Jurken <voor> iedereen",
          url: "https://lidathiry.nl/blog/jurken?a=1&b=2",
          datum: "2026-10-04T18:00:00Z",
          omschrijving: "Over jurken & rokken",
          categorieen: ["Figuur", "jurken", " "],
          auteur: "Lida Thiry",
        },
      ],
    });
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('<rss version="2.0"');
    expect(xml).toContain("<title>Jurken &lt;voor&gt; iedereen</title>");
    expect(xml).toContain("<link>https://lidathiry.nl/blog/jurken?a=1&amp;b=2</link>");
    expect(xml).toContain('<guid isPermaLink="true">https://lidathiry.nl/blog/jurken?a=1&amp;b=2</guid>');
    expect(xml).toContain("<pubDate>Sun, 04 Oct 2026 18:00:00 GMT</pubDate>");
    expect(xml).toContain("<description>Over jurken &amp; rokken</description>");
    expect(xml).toContain("<category>Figuur</category>");
    expect(xml).toContain("<category>jurken</category>");
    expect(xml.match(/<category>/g)).toHaveLength(2);
    expect(xml).toContain('<atom:link href="https://lidathiry.nl/blog/rss.xml" rel="self"');
    expect(xml).toContain("<lastBuildDate>Sun, 04 Oct 2026 18:00:00 GMT</lastBuildDate>");
    // Geen losse & of < buiten entiteiten.
    expect(xml.replace(/<[^>]+>/g, "")).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)|</);
  });

  it("werkt zonder items", () => {
    const xml = bouwRss({ titel: "B", link: "https://x.nl/blog", feedUrl: "https://x.nl/blog/rss.xml", omschrijving: "", items: [] });
    expect(xml).not.toContain("<item>");
    expect(xml).not.toContain("lastBuildDate");
  });
});

describe("blog: JSON-LD", () => {
  const basis = {
    titel: "Jurken voor de zandloper",
    omschrijving: "Tips",
    url: "https://lidathiry.nl/blog/jurken",
    gepubliceerdOp: "2026-10-01T10:00:00.000Z",
    bijgewerktOp: "2026-10-02T10:00:00.000Z",
    auteur: "Lida Thiry",
    siteUrl: "https://lidathiry.nl",
  };

  it("beschrijft een BlogPosting", () => {
    const ld = blogPostingJsonLd({ ...basis, afbeelding: "https://x.supabase.co/a.jpg", tags: ["jurken"], categorie: "Figuur" });
    expect(ld).toMatchObject({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      headline: "Jurken voor de zandloper",
      description: "Tips",
      image: ["https://x.supabase.co/a.jpg"],
      datePublished: basis.gepubliceerdOp,
      dateModified: basis.bijgewerktOp,
      author: { "@type": "Person", name: "Lida Thiry" },
      publisher: { "@type": "Organization", name: "Lida Thiry Imago & Kledingadvies" },
      mainEntityOfPage: { "@type": "WebPage", "@id": basis.url },
      keywords: "jurken",
      articleSection: "Figuur",
    });
  });

  it("laat de afbeelding weg als die er niet is; wijzigdatum nooit vóór publicatie", () => {
    const ld = blogPostingJsonLd({ ...basis, bijgewerktOp: "2026-09-01T00:00:00.000Z" });
    expect(ld).not.toHaveProperty("image");
    expect(ld.dateModified).toBe(basis.gepubliceerdOp);
  });

  it("ontsnapt < zodat een titel het script niet kan sluiten", () => {
    const json = veiligeJson(blogPostingJsonLd({ ...basis, titel: "</script><script>alert(1)</script>" }));
    expect(json).not.toContain("<");
    expect(JSON.parse(json).headline).toBe("</script><script>alert(1)</script>");
  });
});

describe("blog: delen", () => {
  it("maakt gewone deellinks met gecodeerde parameters", () => {
    const links = deelLinks("https://lidathiry.nl/blog/a-b", "Jurk & rok?");
    const href = Object.fromEntries(links.map((l) => [l.id, l.href]));
    expect(href.whatsapp).toBe("https://wa.me/?text=Jurk%20%26%20rok%3F%20https%3A%2F%2Flidathiry.nl%2Fblog%2Fa-b");
    expect(href.facebook).toBe("https://www.facebook.com/sharer/sharer.php?u=https%3A%2F%2Flidathiry.nl%2Fblog%2Fa-b");
    expect(href.linkedin).toBe("https://www.linkedin.com/sharing/share-offsite/?url=https%3A%2F%2Flidathiry.nl%2Fblog%2Fa-b");
    expect(href.email).toMatch(/^mailto:\?subject=Jurk%20%26%20rok%3F&body=/);
  });
});
