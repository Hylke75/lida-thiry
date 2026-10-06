import { describe, expect, it } from "vitest";
import {
  ervaringItems,
  kaartKleur,
  kiesMenu,
  kortCitaat,
  metAanhalingstekens,
  paginaSlugVan,
  splitsAccent,
  veiligeLink,
  voornaam,
  zonderAccent,
  zonderDoodlopendeAfspraak,
  zonderDubbele,
} from "../website/weergave";
import { isGeldigAfbeeldingAdres, valideer, type Sectie } from "../inhoud/schema";
import { WEBSITE_DIENSTEN, WEBSITE_HERO, WEBSITE_KOP } from "../inhoud/groepen/website";

const woorden = (n: number) => Array.from({ length: n }, (_, i) => `woord${i + 1}`).join(" ");

describe("splitsAccent", () => {
  it("maakt van *woord* een accent", () => {
    expect(splitsAccent("Ontdek wat *echt* bij jou past")).toEqual([
      { tekst: "Ontdek wat ", accent: false },
      { tekst: "echt", accent: true },
      { tekst: " bij jou past", accent: false },
    ]);
    expect(zonderAccent("Ontdek wat *echt* bij jou past")).toBe("Ontdek wat echt bij jou past");
  });

  it("laat tekst zonder (of met een los) sterretje heel", () => {
    expect(splitsAccent("Zo werkt het")).toEqual([{ tekst: "Zo werkt het", accent: false }]);
    expect(splitsAccent("5 * 3")).toEqual([{ tekst: "5 * 3", accent: false }]);
    expect(splitsAccent("")).toEqual([]);
  });

  it("de standaardtitel van de hero heeft één accentwoord", () => {
    expect(splitsAccent(WEBSITE_HERO.velden.titel.standaard).filter((d) => d.accent)).toHaveLength(1);
  });
});

describe("kortCitaat", () => {
  it("laat korte citaten (en precies 35 woorden) staan, met nette witruimte", () => {
    expect(kortCitaat("  Heel  fijn\nadvies! ")).toBe("Heel fijn advies!");
    expect(kortCitaat(woorden(35))).toBe(woorden(35));
  });

  it("kort lange citaten in tot 35 woorden met …", () => {
    const uit = kortCitaat(woorden(50));
    expect(uit.endsWith("…")).toBe(true);
    expect(uit.replace("…", "").split(" ")).toHaveLength(35);
  });

  it("stopt liever aan het eind van een zin als die laat genoeg valt", () => {
    const tekst = `${woorden(25)}. ${woorden(20)}`;
    expect(kortCitaat(tekst)).toBe(`${woorden(25)}.`);
    // Een zin die te vroeg eindigt telt niet: dan gewoon afkappen.
    const vroeg = `Top. ${woorden(60)}`;
    expect(kortCitaat(vroeg).endsWith("…")).toBe(true);
  });

  it("haalt hangende leestekens weg voor de …", () => {
    const tekst = `${woorden(34)} laatste, ${woorden(10)}`;
    expect(kortCitaat(tekst)).toBe(`${woorden(34)} laatste…`);
  });
});

describe("voornaam en aanhalingstekens", () => {
  it("toont alleen de voornaam", () => {
    expect(voornaam("Anna de Vries")).toBe("Anna");
    expect(voornaam("Anna, Utrecht")).toBe("Anna");
    expect(voornaam("  Marianne ")).toBe("Marianne");
    expect(voornaam("")).toBe("");
  });

  it("zet aanhalingstekens alleen als ze er niet al staan", () => {
    expect(metAanhalingstekens("Fijn!")).toBe("“Fijn!”");
    expect(metAanhalingstekens("“Fijn!”")).toBe("“Fijn!”");
    expect(metAanhalingstekens('"Fijn!"')).toBe('"Fijn!"');
  });
});

describe("kaartKleur", () => {
  it("herkent de kleurnamen (ook in het Nederlands) en valt terug op de volgorde", () => {
    expect(kaartKleur("coral", 2)).toBe("coral");
    expect(kaartKleur(" Salie ", 0)).toBe("sage");
    expect(kaartKleur("geel", 0)).toBe("butter");
    expect(kaartKleur("", 0)).toBe("coral");
    expect(kaartKleur("paars", 1)).toBe("sage");
    expect(kaartKleur(undefined, 5)).toBe("butter");
  });
});

describe("veiligeLink", () => {
  it("accepteert paden, ankers, http(s), mailto en tel", () => {
    for (const l of ["/bestellen", "/blog/mijn-bericht?x=1", "#advies", "https://example.com/a", "mailto:a@b.nl", "tel:+31612345678"]) {
      expect(veiligeLink(l, "/")).toBe(l);
    }
  });

  it("geeft de reserve bij leeg, protocol-relatief of gevaarlijk", () => {
    for (const l of ["", "  ", "//evil.example", "javascript:alert(1)", "data:text/html,x", "geen link"]) {
      expect(veiligeLink(l, "/reserve")).toBe("/reserve");
    }
  });
});

describe("paginaSlugVan", () => {
  it("herkent links naar één beheerbare pagina", () => {
    expect(paginaSlugVan("/over-mij")).toBe("over-mij");
    expect(paginaSlugVan("/contact")).toBe("contact");
    for (const l of ["/", "/blog/x", "#over", "https://a.nl/over", "/over?x=1"]) expect(paginaSlugVan(l)).toBeNull();
  });
});

describe("kiesMenu", () => {
  const standaard = [
    { label: "Figuurtest", link: "/bestellen" },
    { label: "Blog", link: "/blog" },
    { label: "Fout", link: "javascript:alert(1)" },
    { label: "", link: "/leeg" },
    { label: "Dubbel", link: "/blog" },
  ];

  it("gebruikt de pagina's in het menu (met de blog) als die er zijn", () => {
    expect(kiesMenu([{ href: "/over-mij", label: "Over mij" }], standaard)).toEqual([
      { href: "/over-mij", label: "Over mij" },
      { href: "/blog", label: "Blog" },
    ]);
  });

  it("valt anders terug op het standaardmenu, zonder lege, onveilige of dubbele links", () => {
    expect(kiesMenu([], standaard)).toEqual([
      { href: "/bestellen", label: "Figuurtest" },
      { href: "/blog", label: "Blog" },
    ]);
  });

  it("het standaardmenu uit de teksten verwijst naar bestaande routes", () => {
    const items = kiesMenu([], WEBSITE_KOP.velden.menu.standaard);
    expect(items.map((i) => i.href)).toEqual(["/figuurtest", "/afspraak", "/blog", "/cadeaubon", "/over-mij", "/contact"]);
  });

  it("de hoofdroute is de figuurtest: knop rechtsboven, hero en eerste kaart", () => {
    expect(WEBSITE_KOP.velden.knop.standaard).toBe("Start de figuurtest");
    expect(WEBSITE_KOP.velden.knopLink.standaard).toBe("/figuurtest");
    expect(WEBSITE_HERO.velden.knop.standaard).toBe("Start de figuurtest");
    expect(WEBSITE_HERO.velden.knopLink.standaard).toBe("/figuurtest");
    const eerste = WEBSITE_DIENSTEN.velden.kaarten.standaard[0];
    expect([eerste.linkTekst, eerste.link]).toEqual(["Start de figuurtest", "/figuurtest"]);
  });

  it("zonderDubbele houdt de eerste", () => {
    expect(zonderDubbele([{ href: "/a", label: "A" }], [{ href: "/a", label: "B" }, { href: "/c", label: "C" }])).toEqual([
      { href: "/a", label: "A" },
      { href: "/c", label: "C" },
    ]);
  });
});

describe("ervaringItems", () => {
  it("reviews eerst, dan ervaringen; max. drie, ingekort, met voornaam", () => {
    const reviews = [
      { id: "1", tekst: woorden(50), naam: "Anna de Vries" },
      { id: "2", tekst: "  ", naam: "Leeg" },
    ];
    const ervaringen = [
      { _id: "a", citaat: "Heel fijn.", naam: "Sandra, Utrecht" },
      { _id: "b", citaat: "Ook fijn.", naam: "Monique" },
      { _id: "c", citaat: "Te veel.", naam: "Vier" },
    ];
    const uit = ervaringItems(reviews, ervaringen);
    expect(uit.map((i) => i.naam)).toEqual(["Anna", "Sandra", "Monique"]);
    expect(uit[0].citaat.startsWith("“woord1")).toBe(true);
    expect(uit[0].citaat.endsWith("…”")).toBe(true);
    expect(uit[1]).toEqual({ key: "a", citaat: "“Heel fijn.”", naam: "Sandra" });
  });

  it("geeft niets zonder (echte) reacties: dan is het blok verborgen", () => {
    expect(ervaringItems([], [])).toEqual([]);
    expect(ervaringItems([{ id: "1", tekst: "", naam: "X" }], [])).toEqual([]);
  });
});

describe("afbeeldingsvelden in de teksten", () => {
  const sectie = {
    sleutel: "x.y",
    titel: "Test",
    velden: { foto: { soort: "afbeelding", label: "Foto", standaard: "" } },
  } as const satisfies Sectie;

  it("accepteert https, eigen paden en leeg; weigert de rest", () => {
    for (const ok of ["", "/foto.jpg", "https://abc.supabase.co/storage/v1/object/public/media/a.jpg"]) {
      expect(isGeldigAfbeeldingAdres(ok)).toBe(true);
    }
    for (const fout of ["http://a.nl/x.jpg", "//a.nl/x.jpg", "javascript:alert(1)", "foto.jpg", "https://gebruiker:wachtwoord@a.nl/x.jpg"]) {
      expect(isGeldigAfbeeldingAdres(fout)).toBe(false);
    }
  });

  it("valideer haalt witruimte weg en meldt een ongeldig adres", () => {
    expect(valideer(sectie, { foto: "  /foto.jpg \n" })).toEqual({ ok: true, waarde: { foto: "/foto.jpg" } });
    const r = valideer(sectie, { foto: "javascript:alert(1)" });
    expect(r.ok).toBe(false);
  });

  it("de dienstenkaarten gebruiken alleen gedeclareerde prijsvariabelen", () => {
    const prijzen = WEBSITE_DIENSTEN.velden.kaarten.standaard.map((k) => k.prijs);
    expect(prijzen).toEqual(["{prijs}", "{afspraak_vanaf}", ""]);
  });
});

describe("zonderDoodlopendeAfspraak", () => {
  const kaarten = [
    { _id: "a", linkTekst: "Start de figuurtest", link: "/figuurtest" },
    { _id: "b", linkTekst: "Plan een afspraak", link: " /afspraak " },
    { _id: "c", linkTekst: "Bekijk de cadeaubon", link: "/cadeaubon" },
  ];

  it("laat de kaarten staan als er iets te boeken is", () => {
    expect(zonderDoodlopendeAfspraak(kaarten, true, null)).toEqual(kaarten);
  });

  it("zonder afspraaksoorten: de kaart naar /afspraak verwijst naar contact", () => {
    const uit = zonderDoodlopendeAfspraak(kaarten, false, { tekst: "Stel je vraag", link: "/contact" });
    expect(uit.map((k) => [k.linkTekst, k.link])).toEqual([
      ["Start de figuurtest", "/figuurtest"],
      ["Stel je vraag", "/contact"],
      ["Bekijk de cadeaubon", "/cadeaubon"],
    ]);
  });

  it("zonder afspraaksoorten en zonder (bestaande) contactpagina: geen link", () => {
    for (const vervanging of [null, { tekst: "", link: "/contact" }, { tekst: "Stel je vraag", link: "" }]) {
      const uit = zonderDoodlopendeAfspraak(kaarten, false, vervanging);
      expect(uit[1]).toMatchObject({ linkTekst: "", link: "" });
      expect(uit[0]).toEqual(kaarten[0]);
    }
  });
});
