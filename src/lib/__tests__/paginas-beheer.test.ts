import { describe, expect, it } from "vitest";
import {
  blokLabel,
  bouwMenu,
  gebruikteBlokken,
  isActief,
  paginaOmschrijving,
  publicatieProblemen,
  slugFout,
  slugSuggestie,
  sorteerPaginas,
  toonSiteKop,
  uniekePaginaSlug,
  valideerPagina,
  verschuif,
  volgordeWijzigingen,
  voegBlokIn,
  type MenuRij,
} from "../paginas/beheer";
import { geldigePaginaSlug, onbekendeBlokken } from "../paginas/regels";
import { STARTPAGINAS, vindStartpagina } from "../paginas/sjablonen";
import { parseerOpmaak } from "../inhoud/opmaak";

const rij = (o: Partial<MenuRij>): MenuRij => ({
  slug: "over-mij",
  titel: "Over mij",
  menu_label: "",
  volgorde: 0,
  in_menu: true,
  in_footer: false,
  status: "gepubliceerd",
  ...o,
});

describe("pagina's: slugs", () => {
  it("maakt een slug uit de titel en vermijdt gereserveerde slugs", () => {
    expect(slugSuggestie("Over mij!")).toBe("over-mij");
    expect(slugSuggestie("Veelgestelde vragen & antwoorden")).toBe("veelgestelde-vragen-en-antwoorden");
    expect(slugSuggestie("Blog")).toBe("blog-pagina");
    expect(slugSuggestie("Test")).toBe("test-pagina");
    expect(slugSuggestie("")).toBe("pagina");
    expect(geldigePaginaSlug(slugSuggestie("x".repeat(200)))).toBe(true);
  });

  it("maakt een unieke slug", () => {
    expect(uniekePaginaSlug("Contact", [])).toBe("contact");
    expect(uniekePaginaSlug("Contact", ["contact", "contact-2"])).toBe("contact-3");
    expect(uniekePaginaSlug("privacy", [])).toBe("privacy-pagina");
  });

  it("geeft begrijpelijke foutmeldingen", () => {
    expect(slugFout("over-mij")).toBeNull();
    expect(slugFout("")).toMatch(/Vul een webadres/);
    expect(slugFout("blog")).toMatch(/vaste pagina/);
    expect(slugFout("Over Mij")).toMatch(/kleine letters/);
    expect(slugFout("a--b")).toMatch(/kleine letters/);
    expect(slugFout("a".repeat(81))).toMatch(/maximaal 80/);
  });
});

describe("pagina's: validatie", () => {
  it("schoont geldige invoer op", () => {
    const r = valideerPagina({ titel: "  Over mij ", slug: "", volgorde: "15", in_menu: true, menu_label: " Over  Lida ", intro: "Hoi\r\ndaar" });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.waarde).toMatchObject({ titel: "Over mij", slug: "over-mij", volgorde: 15, in_menu: true, in_footer: false, menu_label: "Over Lida", intro: "Hoi\ndaar" });
  });

  it("weigert gereserveerde slugs, http-omslagen en ontbrekende omschrijvingen", () => {
    const r = valideerPagina({ titel: "x", slug: "admin", omslag_url: "http://x.nl/a.jpg" });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fouten.join(" ")).toMatch(/vaste pagina/);
    expect(r.fouten.join(" ")).toMatch(/https/);
    const zonderAlt = valideerPagina({ titel: "x", slug: "x", omslag_url: "https://x.nl/a.jpg" });
    expect(zonderAlt.ok).toBe(false);
    expect(valideerPagina({ titel: "" }).ok).toBe(false);
  });

  it("kent publicatieproblemen", () => {
    expect(publicatieProblemen({ titel: "Over mij", intro: "", inhoud: "Tekst" })).toEqual([]);
    expect(publicatieProblemen({ titel: "Over mij", intro: "", inhoud: "" })).toHaveLength(1);
    expect(publicatieProblemen({ titel: "x", intro: "[aan te vullen: wie]", inhoud: "Tekst" })[0]).toMatch(/invulplekken/);
  });

  it("maakt een meta-omschrijving", () => {
    expect(paginaOmschrijving({ seo_omschrijving: " SEO ", intro: "Intro", inhoud: "Tekst" })).toBe("SEO");
    expect(paginaOmschrijving({ seo_omschrijving: "", intro: "Intro\nregel", inhoud: "Tekst" })).toBe("Intro regel");
    expect(paginaOmschrijving({ seo_omschrijving: "", intro: "", inhoud: "## Kop\n\n**Vet** en meer\n\n{contactformulier}" })).toBe("Kop Vet en meer");
    expect(paginaOmschrijving({ seo_omschrijving: "", intro: "woord ".repeat(60), inhoud: "" }).length).toBeLessThanOrEqual(160);
  });
});

describe("pagina's: menu", () => {
  it("toont alleen gepubliceerde pagina's, op volgorde, met het menulabel", () => {
    const { menu, footer } = bouwMenu([
      rij({ slug: "contact", titel: "Contact", volgorde: 40, in_footer: true }),
      rij({ slug: "over-mij", titel: "Over mij", volgorde: 10, menu_label: "Over Lida" }),
      rij({ slug: "concept", titel: "Concept", status: "concept" }),
      rij({ slug: "werkwijze", titel: "Werkwijze", volgorde: 10 }),
      rij({ slug: "faq", titel: "FAQ", in_menu: false, in_footer: true, volgorde: 5 }),
      rij({ slug: "blog", titel: "Gereserveerd" }),
    ]);
    expect(menu).toEqual([
      { href: "/over-mij", label: "Over Lida" },
      { href: "/werkwijze", label: "Werkwijze" },
      { href: "/contact", label: "Contact" },
    ]);
    expect(footer).toEqual([
      { href: "/faq", label: "FAQ" },
      { href: "/contact", label: "Contact" },
    ]);
  });

  it("herkent het actieve menu-item", () => {
    expect(isActief("/blog", "/blog/jurken")).toBe(true);
    expect(isActief("/blog", "/blogger")).toBe(false);
    expect(isActief("/", "/contact")).toBe(false);
    expect(isActief("/contact", null)).toBe(false);
  });

  it("verbergt de kop in het beheer en de test", () => {
    expect(toonSiteKop("/")).toBe(true);
    expect(toonSiteKop("/contact")).toBe(true);
    expect(toonSiteKop("/bestellen")).toBe(true);
    expect(toonSiteKop("/testimonials")).toBe(true);
    expect(toonSiteKop("/admin")).toBe(false);
    expect(toonSiteKop("/admin/paginas")).toBe(false);
    expect(toonSiteKop("/test/abc")).toBe(false);
    expect(toonSiteKop("/auth/bevestig")).toBe(false);
  });
});

describe("pagina's: volgorde", () => {
  it("verschuift een pagina", () => {
    expect(verschuif(["a", "b", "c"], "b", "omhoog")).toEqual(["b", "a", "c"]);
    expect(verschuif(["a", "b", "c"], "b", "omlaag")).toEqual(["a", "c", "b"]);
    expect(verschuif(["a", "b", "c"], "a", "omhoog")).toEqual(["a", "b", "c"]);
    expect(verschuif(["a", "b", "c"], "x", "omlaag")).toEqual(["a", "b", "c"]);
  });

  it("geeft alleen gewijzigde volgordenummers", () => {
    const huidig = [
      { id: "a", volgorde: 10 },
      { id: "b", volgorde: 20 },
      { id: "c", volgorde: 0 },
    ];
    expect(volgordeWijzigingen(huidig, ["b", "a", "c"])).toEqual([
      { id: "b", volgorde: 10 },
      { id: "a", volgorde: 20 },
      { id: "c", volgorde: 30 },
    ]);
  });

  it("sorteert op volgorde en dan op naam", () => {
    const r = sorteerPaginas([
      { titel: "Zeta", menu_label: "", volgorde: 1 },
      { titel: "Alfa", menu_label: "", volgorde: 1 },
      { titel: "Eerst", menu_label: "", volgorde: 0 },
    ]);
    expect(r.map((x) => x.titel)).toEqual(["Eerst", "Alfa", "Zeta"]);
  });
});

describe("pagina's: blokken in de editor", () => {
  it("voegt een blok in op een eigen regel", () => {
    expect(voegBlokIn("", 0, 0, "test").tekst).toBe("{test}\n");
    expect(voegBlokIn("Hallo", 5, 5, "test").tekst).toBe("Hallo\n\n{test}\n");
    expect(voegBlokIn("Hallo daar", 3, 3, "test").tekst).toBe("Hallo daar\n\n{test}\n");
    expect(voegBlokIn("Een\n\nTwee", 5, 5, "test").tekst).toBe("Een\n\n{test}\n\nTwee");
    expect(voegBlokIn("Een\nTwee", 2, 2, "test").tekst).toBe("Een\n\n{test}\n\nTwee");
    const r = voegBlokIn("Hallo", 5, 5, "contactformulier");
    expect(r.tekst.slice(r.start, r.eind)).toBe("{contactformulier}");
    // Het ingevoegde blok wordt ook echt als blok herkend.
    expect(parseerOpmaak(voegBlokIn("Hallo daar\nnog meer", 3, 3, "nieuwsbrief_zomer_2026").tekst)).toContainEqual({
      soort: "blok",
      naam: "nieuwsbrief_zomer_2026",
    });
  });

  it("geeft labels voor het voorbeeld", () => {
    const formulieren = [{ slug: "zomer-actie", naam: "Zomeractie" }];
    expect(blokLabel("contactformulier", formulieren)).toEqual({ label: "Contactformulier", bekend: true });
    expect(blokLabel("nieuwsbrief_zomer_actie", formulieren)).toEqual({ label: "Nieuwsbriefformulier: Zomeractie", bekend: true });
    expect(blokLabel("nieuwsbrief_winter", formulieren).bekend).toBe(false);
    expect(blokLabel("onzin", formulieren).bekend).toBe(false);
  });

  it("vindt de gebruikte blokken", () => {
    expect(gebruikteBlokken("{test}\n\nTekst {test} inline\n{bedrijfsgegevens}\n{test}")).toEqual(["test", "bedrijfsgegevens"]);
  });
});

describe("pagina's: startpagina's", () => {
  it("zijn geldig, uniek en gebruiken alleen bekende blokken", () => {
    const slugs = new Set<string>();
    for (const s of STARTPAGINAS) {
      const r = valideerPagina(s.pagina);
      expect(r.ok, s.sleutel).toBe(true);
      expect(slugs.has(s.pagina.slug)).toBe(false);
      slugs.add(s.pagina.slug);
      expect(onbekendeBlokken(s.pagina.inhoud, [])).toEqual([]);
      expect(vindStartpagina(s.sleutel)).toBe(s);
    }
    expect([...slugs].sort()).toEqual(["contact", "over-mij", "veelgestelde-vragen", "werkwijze"]);
  });

  it("bevatten de gevraagde blokken en invulplekken", () => {
    const over = vindStartpagina("over-mij")!.pagina;
    expect(gebruikteBlokken(over.inhoud)).toContain("test");
    expect(publicatieProblemen(over).join(" ")).toMatch(/invulplekken/);
    const contact = vindStartpagina("contact")!.pagina;
    expect(gebruikteBlokken(contact.inhoud)).toEqual(["contactformulier", "bedrijfsgegevens"]);
    expect(contact.intro).not.toBe("");
  });
});
