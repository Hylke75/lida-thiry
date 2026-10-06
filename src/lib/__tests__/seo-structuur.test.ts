import { describe, expect, it } from "vitest";
import {
  absoluteUrl,
  adresUitTekst,
  faqJsonLd,
  kruimelpadJsonLd,
  organisatieJsonLd,
  prijsTekst,
  testProductJsonLd,
  veiligeJson,
} from "../seo/structuur";
import { filterGebeurtenis, meetwijze, veiligeUrl } from "../analytics/regels";

describe("seo: structuur", () => {
  it("maakt adressen absoluut", () => {
    expect(absoluteUrl("/media/logo.png", "https://lida.nl/")).toBe("https://lida.nl/media/logo.png");
    expect(absoluteUrl("https://cdn.nl/x.png", "https://lida.nl")).toBe("https://cdn.nl/x.png");
    expect(absoluteUrl("", "https://lida.nl")).toBeNull();
    expect(absoluteUrl(null, "https://lida.nl")).toBeNull();
  });

  it("herkent een Nederlands adres", () => {
    expect(adresUitTekst("Dorpsstraat 1\n1234ab Utrecht")).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Dorpsstraat 1",
      postalCode: "1234 AB",
      addressLocality: "Utrecht",
      addressCountry: "NL",
    });
    expect(adresUitTekst("Dorpsstraat 1, 1234 AB Utrecht")?.addressLocality).toBe("Utrecht");
    expect(adresUitTekst("Ergens in het land")).toEqual({
      "@type": "PostalAddress",
      streetAddress: "Ergens in het land",
      addressCountry: "NL",
    });
    expect(adresUitTekst("  ")).toBeNull();
    expect(adresUitTekst(null)).toBeNull();
  });

  it("bouwt de organisatie met logo, e-mail, adres en social links", () => {
    const o = organisatieJsonLd({
      naam: "Lida Thiry",
      url: "https://lida.nl/",
      logo: "/logo.png",
      email: "info@lida.nl",
      adres: "Dorpsstraat 1\n1234 AB Utrecht",
      sameAs: ["https://instagram.com/lida"],
    });
    expect(o["@type"]).toBe("ProfessionalService");
    expect(o["@id"]).toBe("https://lida.nl/#organisatie");
    expect(o.url).toBe("https://lida.nl/");
    expect(o.logo).toBe("https://lida.nl/logo.png");
    expect(o.email).toBe("info@lida.nl");
    expect((o.address as { postalCode: string }).postalCode).toBe("1234 AB");
    expect(o.sameAs).toEqual(["https://instagram.com/lida"]);
  });

  it("laat lege velden weg en valt terug op het site-icoon", () => {
    const o = organisatieJsonLd({ naam: "X", url: "https://lida.nl" });
    expect(o.logo).toBe("https://lida.nl/icon.svg");
    expect(o).not.toHaveProperty("email");
    expect(o).not.toHaveProperty("address");
    expect(o).not.toHaveProperty("sameAs");
  });

  it("geeft de test als product met prijs", () => {
    const p = testProductJsonLd({ naam: "Test", omschrijving: "Om", url: "https://lida.nl", prijsCent: 4950, valuta: "eur" });
    expect(p["@type"]).toBe("Product");
    expect(p.offers).toMatchObject({
      "@type": "Offer",
      price: "49.50",
      priceCurrency: "EUR",
      availability: "https://schema.org/InStock",
      url: "https://lida.nl/bestellen",
    });
    expect(p).not.toHaveProperty("aggregateRating");
  });

  it("zonder prijs: een dienst zonder aanbod", () => {
    const p = testProductJsonLd({ naam: "Test", omschrijving: "Om", url: "https://lida.nl", prijsCent: null });
    expect(p["@type"]).toBe("Service");
    expect(p).not.toHaveProperty("offers");
  });

  it("voegt een beoordeling alleen toe als er reviews zijn", () => {
    const met = testProductJsonLd({
      naam: "T",
      omschrijving: "O",
      url: "https://lida.nl",
      prijsCent: 100,
      beoordeling: { gemiddelde: 4.666, aantal: 12 },
    });
    expect(met.aggregateRating).toMatchObject({ ratingValue: 4.7, reviewCount: 12, bestRating: 5 });
    const zonder = testProductJsonLd({
      naam: "T",
      omschrijving: "O",
      url: "https://lida.nl",
      prijsCent: 100,
      beoordeling: { gemiddelde: 0, aantal: 0 },
    });
    expect(zonder).not.toHaveProperty("aggregateRating");
  });

  it("rondt prijzen netjes af", () => {
    expect(prijsTekst(4900)).toBe("49.00");
    expect(prijsTekst(1)).toBe("0.01");
  });

  it("maakt een FAQPage zonder lege vragen", () => {
    const f = faqJsonLd([
      { vraag: "Hoe lang?", antwoord: "Kwartier." },
      { vraag: "", antwoord: "Leeg" },
      { vraag: "Zonder antwoord", antwoord: "  " },
    ]);
    expect(f?.mainEntity).toEqual([
      { "@type": "Question", name: "Hoe lang?", acceptedAnswer: { "@type": "Answer", text: "Kwartier." } },
    ]);
    expect(faqJsonLd([])).toBeNull();
  });

  it("maakt een kruimelpad", () => {
    const k = kruimelpadJsonLd("https://lida.nl/", [
      { naam: "Home", pad: "/" },
      { naam: "Over mij", pad: "over-mij" },
    ]);
    expect(k.itemListElement).toEqual([
      { "@type": "ListItem", position: 1, name: "Home", item: "https://lida.nl/" },
      { "@type": "ListItem", position: 2, name: "Over mij", item: "https://lida.nl/over-mij" },
    ]);
  });

  it("escapet < zodat </script> de pagina niet openbreekt", () => {
    const json = veiligeJson(faqJsonLd([{ vraag: "</script><b>", antwoord: "a" }]));
    expect(json).not.toContain("<");
    expect(JSON.parse(json).mainEntity[0].name).toBe("</script><b>");
  });
});

describe("analytics: regels", () => {
  it("bepaalt per pad of en hoe we meten", () => {
    expect(meetwijze("/")).toBe("volledig");
    expect(meetwijze("/blog/iets")).toBe("volledig");
    expect(meetwijze("/testimonials")).toBe("volledig");
    expect(meetwijze("/admin")).toBe("uit");
    expect(meetwijze("/admin/statistieken")).toBe("uit");
    expect(meetwijze("/auth/bevestig")).toBe("uit");
    expect(meetwijze("/test/abc123")).toBe("alleen-gebeurtenissen");
  });

  it("haalt zoekparameters en sleutels uit de url", () => {
    expect(veiligeUrl("https://lida.nl/bestellen/bedankt?order=123#x")).toBe("https://lida.nl/bestellen/bedankt");
    expect(veiligeUrl("https://lida.nl/test/geheim")).toBe("https://lida.nl/test");
    expect(veiligeUrl("https://lida.nl/nieuwsbrief/afmelden/abc")).toBe("https://lida.nl/nieuwsbrief/afmelden/[token]");
    expect(veiligeUrl("https://lida.nl/nieuwsbrief/bevestig/abc")).toBe("https://lida.nl/nieuwsbrief/bevestig/[token]");
    expect(veiligeUrl("/blog?utm=x")).toBe("/blog");
  });

  it("filtert gebeurtenissen", () => {
    expect(filterGebeurtenis({ type: "pageview", url: "https://lida.nl/admin" })).toBeNull();
    expect(filterGebeurtenis({ type: "pageview", url: "https://lida.nl/test/geheim" })).toBeNull();
    expect(filterGebeurtenis({ type: "event", url: "https://lida.nl/test/geheim" })).toEqual({
      type: "event",
      url: "https://lida.nl/test",
    });
    expect(filterGebeurtenis({ type: "pageview", url: "https://lida.nl/?a=1" })).toEqual({
      type: "pageview",
      url: "https://lida.nl/",
    });
  });
});
