import { describe, expect, it } from "vitest";
import {
  blogOverzichtSeo,
  leesSeoPaginas,
  paginaSeo,
  robotsRegels,
  rssTitel,
  valideerSeoPaginas,
  VASTE_PAGINAS,
  vastePaginaMetadata,
  vastePaginasInSitemap,
} from "../website/seo";
import {
  STANDAARD_SITE,
  telefoonLink,
  valideerTelefoon,
  valideerWebsiteInvoer,
  websiteInstellingen,
} from "../website/instellingen";
import { bouwSiteMetadata } from "../website/metadata";
import { organisatieJsonLd, werkgebiedJsonLd } from "../seo/structuur";
import { deelbeeldKop } from "../seo/delen";
import { afzenderAdres, afzenderGegevens, afzenderMetNaam, schoneAfzenderNaam, STANDAARD_AFZENDER } from "../mail-afzender";
import { blogPostingJsonLd } from "../blog/structuur";
import { valideerBericht } from "../blog/regels";
import { maakIcs } from "../afspraken/ics";
import { bonHtml } from "../email-html";

describe("SEO vaste pagina's", () => {
  it("geeft zonder instellingen de oude, vaste teksten", () => {
    expect(paginaSeo("bestellen", {})).toEqual({
      titel: "Bestellen",
      omschrijving: "Bestel de online kledingadviestest van Lida Thiry en ontvang direct je persoonlijke kledingadvies als PDF.",
      nietIndexeren: false,
      inSitemap: true,
    });
    expect(paginaSeo("mijn-advies", {}).inSitemap).toBe(false);
    expect(paginaSeo("review", {})).toMatchObject({ titel: "Deel je ervaring", nietIndexeren: true, inSitemap: false });
    expect(paginaSeo("blog", {}).titel).toBeNull();
  });

  it("leest opgeslagen afwijkingen en negeert rommel", () => {
    const s = leesSeoPaginas(
      JSON.stringify({
        bestellen: { titel: "  Test   bestellen ", nietIndexeren: true },
        privacy: { sitemap: false, omschrijving: 5 },
        onbekend: { titel: "x" },
        afspraak: "nee",
      }),
    );
    expect(s).toEqual({ bestellen: { titel: "Test bestellen", nietIndexeren: true }, privacy: { sitemap: false } });
    expect(leesSeoPaginas("{kapot")).toEqual({});
    expect(leesSeoPaginas(null)).toEqual({});
    expect(leesSeoPaginas("[1]")).toEqual({});
  });

  it("niet indexeren haalt een pagina ook uit de sitemap; review is altijd noindex", () => {
    expect(paginaSeo("privacy", { privacy: { nietIndexeren: true, sitemap: true } })).toMatchObject({
      nietIndexeren: true,
      inSitemap: false,
    });
    expect(paginaSeo("review", { review: { nietIndexeren: false } }).nietIndexeren).toBe(true);
    expect(paginaSeo("bestellen", {}, true)).toMatchObject({ nietIndexeren: true, inSitemap: false });
  });

  it("maakt metadata: robots alleen bij niet indexeren (anders erft de pagina de layout)", () => {
    expect(vastePaginaMetadata(paginaSeo("afspraak", {}), "/afspraak")).toEqual({
      title: "Afspraak maken",
      description: "Maak online een afspraak voor persoonlijk imago- en kledingadvies.",
      alternates: { canonical: "/afspraak" },
    });
    const m = vastePaginaMetadata(paginaSeo("afspraak", { afspraak: { titel: "Plan je afspraak", nietIndexeren: true } }), "/afspraak");
    expect(m.title).toBe("Plan je afspraak");
    expect(m.robots).toEqual({ index: false, follow: true });
  });

  it("valideert de invoer en bewaart alleen afwijkingen", () => {
    const leeg = valideerSeoPaginas({
      bestellen: { titel: "Bestellen", omschrijving: "", nietIndexeren: false, sitemap: true },
      "mijn-advies": { titel: "", sitemap: false },
    });
    expect(leeg).toEqual({ ok: true, json: null, waarde: {} });

    const r = valideerSeoPaginas({
      bestellen: { titel: " Test kopen ", sitemap: true },
      "mijn-advies": { sitemap: true },
      review: { nietIndexeren: false, sitemap: true, titel: "Jouw review" },
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.waarde).toEqual({ bestellen: { titel: "Test kopen" }, "mijn-advies": { sitemap: true }, review: { titel: "Jouw review" } });
    expect(leesSeoPaginas(r.json)).toEqual(r.waarde);

    const fout = valideerSeoPaginas({ blog: { titel: "x".repeat(71), omschrijving: "y".repeat(301) } });
    expect(fout.ok).toBe(false);
    if (!fout.ok) expect(fout.fouten).toHaveLength(2);
    expect(valideerSeoPaginas(null).ok).toBe(false);
  });

  it("robots.txt: normaal alleen het beheer e.d. dicht, met niet indexeren alles", () => {
    expect(robotsRegels(false, "https://lida.nl/")).toEqual({
      rules: { userAgent: "*", allow: "/", disallow: ["/admin", "/test", "/api", "/auth", "/status"] },
      sitemap: "https://lida.nl/sitemap.xml",
    });
    expect(robotsRegels(true, "https://lida.nl").rules).toEqual({ userAgent: "*", disallow: "/" });
  });

  it("sitemap: de vaste pagina's volgens de instellingen", () => {
    const paden = (s: Parameters<typeof vastePaginasInSitemap>[0]) =>
      vastePaginasInSitemap(s, "https://lida.nl").map((i) => i.url.replace("https://lida.nl", ""));
    expect(paden({})).toEqual(["/bestellen", "/afspraak", "/cadeaubon", "/blog", "/privacy", "/voorwaarden"]);
    expect(paden({ cadeaubon: { sitemap: false }, "mijn-advies": { sitemap: true }, privacy: { nietIndexeren: true } })).toEqual([
      "/bestellen",
      "/afspraak",
      "/blog",
      "/mijn-advies",
      "/voorwaarden",
    ]);
    const blog = vastePaginasInSitemap({}, "https://lida.nl", { blogBijgewerkt: "2026-10-01" }).find((i) => i.url.endsWith("/blog"));
    expect(blog).toMatchObject({ lastModified: "2026-10-01", changeFrequency: "weekly" });
    expect(VASTE_PAGINAS.every((p) => p.pad.startsWith("/"))).toBe(true);
  });

  it("blogoverzicht: standaard 'Blog: <titel>', anders de eigen titel", () => {
    const tekst = { titel: "Stijltips", intro: "Over kleding." };
    expect(blogOverzichtSeo(paginaSeo("blog", {}), tekst, "")).toEqual({
      titel: "Blog: Stijltips",
      deelTitel: "Stijltips",
      omschrijving: "Over kleding.",
    });
    expect(blogOverzichtSeo(paginaSeo("blog", { blog: { titel: "Kledingblog", omschrijving: "Tips." } }), tekst, "pagina 2")).toEqual({
      titel: "Kledingblog · pagina 2",
      deelTitel: "Kledingblog · pagina 2",
      omschrijving: "Tips.",
    });
    expect(rssTitel("Stijltips", "Studio Lida")).toBe("Stijltips · Studio Lida");
    expect(rssTitel(" ", "Studio Lida")).toBe("Blog · Studio Lida");
  });
});

describe("website-instellingen: titels, zoekmachines, bedrijf, namen", () => {
  it("standaarden zonder instellingen", () => {
    const s = websiteInstellingen(null);
    expect(s).toMatchObject({
      homeTitel: STANDAARD_SITE.homeTitel,
      deelTitel: STANDAARD_SITE.deelTitel,
      nietIndexeren: false,
      telefoon: null,
      werkgebied: null,
      bedrijfType: "ProfessionalService",
      eigenaarNaam: "Lida Thiry",
      standaardAuteur: "Lida Thiry",
      beheerlinkInFooter: false,
      seoPaginas: null,
    });
  });

  it("gebruikt de instellingen; standaardauteur valt terug op de eigenaar", () => {
    const s = websiteInstellingen({
      home_titel: "Kledingadvies online",
      niet_indexeren: "ja",
      telefoon: "06 1234 5678",
      bedrijf_type: "LocalBusiness",
      eigenaar_naam: "Lida T.",
      footer_beheerlink: "tonen",
    });
    expect(s).toMatchObject({
      homeTitel: "Kledingadvies online",
      nietIndexeren: true,
      telefoon: "06 1234 5678",
      bedrijfType: "LocalBusiness",
      standaardAuteur: "Lida T.",
      beheerlinkInFooter: true,
    });
    // Een oude opgeslagen waarde "verbergen" blijft verborgen.
    expect(websiteInstellingen({ footer_beheerlink: "verbergen" }).beheerlinkInFooter).toBe(false);
    expect(websiteInstellingen({ bedrijf_type: "Spaceship", telefoon: "bel me" })).toMatchObject({
      bedrijfType: "ProfessionalService",
      telefoon: null,
    });
  });

  it("valideert de nieuwe velden", () => {
    const r = valideerWebsiteInvoer({
      home_titel: "  Online   test ",
      niet_indexeren: "ja",
      bedrijf_type: "ProfessionalService",
      telefoon: "+31 6 12345678",
      afzender_naam: "Lida Thiry Stijl",
      footer_beheerlink: "iets",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.waarden).toMatchObject({
      home_titel: "Online test",
      niet_indexeren: "ja",
      bedrijf_type: null,
      telefoon: "+31 6 12345678",
      afzender_naam: "Lida Thiry Stijl",
      footer_beheerlink: null,
    });
    const fout = valideerWebsiteInvoer({ telefoon: "123", afzender_naam: "Lida <x@y.nl>", bedrijf_type: "X", deel_titel: "x".repeat(71) });
    expect(fout.ok).toBe(false);
    if (!fout.ok) expect(fout.fouten).toHaveLength(4);
  });

  it("telefoonnummers", () => {
    expect(valideerTelefoon("06-12345678")).toEqual({ ok: true, waarde: "06-12345678" });
    expect(valideerTelefoon("")).toEqual({ ok: true, waarde: null });
    expect(valideerTelefoon("06 abc").ok).toBe(false);
    expect(telefoonLink("06 1234 5678")).toBe("tel:0612345678");
    expect(telefoonLink("+31 (0)6 1234 5678")).toBe("tel:+310612345678");
  });

  it("site-metadata: eigen titels, auteur en noindex voor de hele site", () => {
    const m = bouwSiteMetadata(
      websiteInstellingen({ home_titel: "Kledingadvies", deel_titel: "Doe de test", standaard_auteur: "Anna", niet_indexeren: "ja" }),
      "https://lida.nl",
    );
    expect(m.title).toEqual({ default: "Kledingadvies · Lida Thiry", template: "%s · Lida Thiry" });
    expect(m.openGraph).toMatchObject({ title: "Doe de test · Lida Thiry" });
    expect(m.authors).toEqual([{ name: "Anna" }]);
    expect(m.robots).toEqual({ index: false, follow: false });
    expect("robots" in bouwSiteMetadata(websiteInstellingen(null), "https://lida.nl")).toBe(false);
  });
});

describe("gestructureerde gegevens: bedrijf", () => {
  it("telefoon, werkgebied en soort bedrijf", () => {
    const o = organisatieJsonLd({ naam: "X", url: "https://lida.nl", telefoon: "06 12345678", werkgebied: "Utrecht, Amersfoort", type: "LocalBusiness" });
    expect(o).toMatchObject({ "@type": "LocalBusiness", telephone: "06 12345678", areaServed: ["Utrecht", "Amersfoort"] });
    const std = organisatieJsonLd({ naam: "X", url: "https://lida.nl" });
    expect(std["@type"]).toBe("ProfessionalService");
    expect(std).not.toHaveProperty("telephone");
    expect(werkgebiedJsonLd("")).toEqual({ "@type": "Country", name: "Nederland" });
    expect(werkgebiedJsonLd(" Utrecht ")).toBe("Utrecht");
  });

  it("blogbericht: uitgever en standaardauteur", () => {
    const b = blogPostingJsonLd({
      titel: "T",
      omschrijving: "O",
      url: "https://lida.nl/blog/t",
      gepubliceerdOp: "2026-01-01",
      bijgewerktOp: "2026-01-01",
      auteur: "",
      standaardAuteur: "Anna",
      uitgever: "Studio Lida BV",
      siteUrl: "https://lida.nl",
    });
    expect(b.author).toMatchObject({ name: "Anna" });
    expect(b.publisher).toMatchObject({ name: "Studio Lida BV" });
  });

  it("blogbericht opslaan: lege auteur wordt de standaardauteur", () => {
    const r = valideerBericht({ titel: "Hallo", auteur: " " }, "Anna");
    expect(r.ok && r.waarde.auteur).toBe("Anna");
    const std = valideerBericht({ titel: "Hallo" });
    expect(std.ok && std.waarde.auteur).toBe("Lida Thiry");
  });
});

describe("deelafbeelding", () => {
  it("laatste woord als accent, kleiner bij lange titels", () => {
    expect(deelbeeldKop("Ontdek je figuurtype")).toEqual({ voor: "Ontdek je", accent: "figuurtype", grootte: 104 });
    expect(deelbeeldKop("Welkom")).toEqual({ voor: "", accent: "Welkom", grootte: 104 });
    expect(deelbeeldKop("Ontdek welke kleding echt bij jouw figuur past").grootte).toBe(62);
  });
});

describe("afzender van e-mails", () => {
  it("naam uit de instellingen, adres uit RESEND_VAN", () => {
    expect(afzenderAdres("Lida <info@lida.nl>")).toBe("info@lida.nl");
    expect(afzenderAdres("info@lida.nl")).toBe("info@lida.nl");
    expect(afzenderMetNaam("Oud <info@lida.nl>", "Studio Lida")).toBe("Studio Lida <info@lida.nl>");
    expect(afzenderMetNaam("info@lida.nl", "Lida Thiry, stijladvies")).toBe('"Lida Thiry, stijladvies" <info@lida.nl>');
    expect(afzenderMetNaam("Oud <info@lida.nl>", " ")).toBe("Oud <info@lida.nl>");
    expect(afzenderMetNaam(undefined, null)).toBe(STANDAARD_AFZENDER);
    expect(schoneAfzenderNaam("Lida\r\nBcc: x@y.nl")).toBe('"Lida Bcc: x y.nl"');
  });

  it("antwoorden naar het contactadres, alleen als dat geldig is", () => {
    expect(afzenderGegevens("info@lida.nl", { contact_email: " hallo@lida.nl ", afzender_naam: "Lida" })).toEqual({
      from: "Lida <info@lida.nl>",
      replyTo: "hallo@lida.nl",
    });
    expect(afzenderGegevens("info@lida.nl", { contact_email: "[e-mailadres]" })).toEqual({ from: "info@lida.nl" });
  });
});

describe("bedrijfsnaam en merk in agenda en cadeaubonmail", () => {
  it("PRODID met de ingestelde bedrijfsnaam", () => {
    const basis = { uid: "a@b", start: new Date("2026-10-06T10:00:00Z"), eind: new Date("2026-10-06T11:00:00Z"), titel: "Afspraak" };
    expect(maakIcs(basis)).toContain("PRODID:-//Lida Thiry Imago & Kledingadvies//Afspraken//NL");
    expect(maakIcs({ ...basis, bedrijf: "Studio/Lida" })).toContain("PRODID:-//Studio Lida//Afspraken//NL");
  });

  it("de bon in de mail noemt de naam van de website", () => {
    const bon = { koperNaam: "Bo", ontvangerNaam: null, bedragCent: 2500, valuta: "EUR", code: "C-1", geldigTot: "2027-01-01", boodschap: null };
    expect(bonHtml(bon, "Boodschap")).toContain("Persoonlijk kledingadvies · Lida Thiry");
    expect(bonHtml(bon, "Boodschap", undefined, "Studio <Lida>")).toContain("Persoonlijk kledingadvies · Studio &lt;Lida&gt;");
  });
});
