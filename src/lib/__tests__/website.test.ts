import { describe, expect, it } from "vitest";
import {
  HOMEPAGE_BLOKKEN,
  BLOK_INFO,
  isStandaardIndeling,
  normaliseerIndeling,
  standaardIndeling,
  standaardZichtbaar,
  verschuifBlok,
  zetZichtbaar,
} from "../website/homepage";
import {
  STANDAARD_SITE,
  valideerAfbeeldingUrl,
  valideerSocialUrl,
  valideerWebsiteInvoer,
  websiteInstellingen,
} from "../website/instellingen";
import { bouwSiteMetadata, pictogramType } from "../website/metadata";
import { WEBSITE } from "../inhoud/groepen/website";
import { NIEUWSBRIEF } from "../inhoud/groepen/nieuwsbrief";

const blokken = (l: { blok: string }[]) => l.map((i) => i.blok);

describe("normaliseerIndeling", () => {
  it("geeft de standaard bij leeg, ongeldig of geen lijst", () => {
    for (const ruw of [null, undefined, "", "{kapot", "{}", 42, { blok: "stappen" }]) {
      expect(normaliseerIndeling(ruw)).toEqual(standaardIndeling());
    }
    expect(blokken(standaardIndeling())).toEqual([...HOMEPAGE_BLOKKEN]);
  });

  it("volgt standaard het ontwerp; de oudere extra blokken staan uit", () => {
    const zichtbaar = standaardIndeling().filter((i) => i.zichtbaar);
    expect(blokken(zichtbaar)).toEqual(["hero", "diensten", "probleem", "stappen", "over", "ervaringen", "blog", "nieuwsbrief", "vragen"]);
    for (const blok of ["figuurtypes", "advies", "afsluiting"] as const) expect(standaardZichtbaar(blok)).toBe(false);
  });

  it("zet nieuwe blokken in een oude opgeslagen indeling op hun eigen plek", () => {
    // Een indeling zoals die vóór de adviesroutes en het probleemblok werd opgeslagen.
    const oud = ["hero", "stappen", "figuurtypes", "advies", "over", "ervaringen", "blog", "nieuwsbrief", "vragen", "afsluiting"].map(
      (blok) => ({ blok, zichtbaar: blok !== "advies" }),
    );
    const uit = normaliseerIndeling(JSON.stringify(oud));
    expect(blokken(uit)).toEqual([
      "hero",
      "diensten",
      "probleem",
      "stappen",
      "figuurtypes",
      "advies",
      "over",
      "ervaringen",
      "blog",
      "nieuwsbrief",
      "vragen",
      "afsluiting",
    ]);
    // Wat opgeslagen was, blijft gelden; de nieuwe blokken zijn zichtbaar.
    expect(uit.find((i) => i.blok === "figuurtypes")?.zichtbaar).toBe(true);
    expect(uit.find((i) => i.blok === "advies")?.zichtbaar).toBe(false);
    expect(uit.find((i) => i.blok === "diensten")?.zichtbaar).toBe(true);
    expect(uit.find((i) => i.blok === "probleem")?.zichtbaar).toBe(true);
  });

  it("houdt de opgeslagen volgorde aan en vult ontbrekende blokken op hun standaardplek aan", () => {
    const uit = normaliseerIndeling(
      JSON.stringify([
        { blok: "vragen", zichtbaar: true },
        { blok: "stappen", zichtbaar: false },
      ]),
    );
    expect(blokken(uit)).toEqual([
      "hero",
      "diensten",
      "probleem",
      "vragen",
      "figuurtypes",
      "advies",
      "afsluiting",
      "stappen",
      "over",
      "ervaringen",
      "blog",
      "nieuwsbrief",
    ]);
    expect(uit.find((i) => i.blok === "stappen")?.zichtbaar).toBe(false);
    // Ontbrekende blokken krijgen hun standaardzichtbaarheid.
    expect(uit.find((i) => i.blok === "figuurtypes")?.zichtbaar).toBe(false);
    expect(uit.find((i) => i.blok === "over")?.zichtbaar).toBe(true);
  });

  it("laat onbekende en dubbele blokken weg", () => {
    const uit = normaliseerIndeling([
      { blok: "onbekend", zichtbaar: true },
      { blok: "over", zichtbaar: false },
      { blok: "over", zichtbaar: true },
      null,
      7,
      "advies",
    ]);
    expect(uit).toHaveLength(HOMEPAGE_BLOKKEN.length);
    const volgorde = blokken(uit);
    expect(volgorde[0]).toBe("hero");
    expect(volgorde.indexOf("over")).toBeLessThan(volgorde.indexOf("advies"));
    expect(uit.find((i) => i.blok === "over")?.zichtbaar).toBe(false);
    expect(new Set(blokken(uit)).size).toBe(uit.length);
  });

  it("zet de hero altijd zichtbaar bovenaan", () => {
    const uit = normaliseerIndeling([
      { blok: "afsluiting", zichtbaar: true },
      { blok: "hero", zichtbaar: false },
    ]);
    expect(uit[0]).toEqual({ blok: "hero", zichtbaar: true });
    expect(blokken(uit).filter((b) => b === "hero")).toHaveLength(1);
  });

  it("alleen expliciet false verbergt een blok", () => {
    const uit = normaliseerIndeling([{ blok: "stappen", zichtbaar: "nee" }, { blok: "advies" }]);
    expect(uit.find((i) => i.blok === "stappen")?.zichtbaar).toBe(true);
    expect(uit.find((i) => i.blok === "advies")?.zichtbaar).toBe(true);
  });
});

describe("homepage-indeling bewerken", () => {
  it("verschuift blokken, maar nooit boven de hero", () => {
    const std = standaardIndeling();
    expect(blokken(verschuifBlok(std, "probleem", "omhoog")).slice(0, 3)).toEqual(["hero", "probleem", "diensten"]);
    expect(verschuifBlok(std, "diensten", "omhoog")).toEqual(std);
    expect(verschuifBlok(std, "hero", "omlaag")).toEqual(std);
    expect(verschuifBlok(std, "afsluiting", "omlaag")).toEqual(std);
    expect(blokken(verschuifBlok(std, "advies", "omlaag")).slice(-2)).toEqual(["afsluiting", "advies"]);
  });

  it("zet zichtbaarheid, de hero blijft zichtbaar", () => {
    const std = standaardIndeling();
    expect(zetZichtbaar(std, "blog", false).find((i) => i.blok === "blog")?.zichtbaar).toBe(false);
    expect(zetZichtbaar(std, "hero", false)[0].zichtbaar).toBe(true);
  });

  it("herkent de standaardindeling", () => {
    expect(isStandaardIndeling(standaardIndeling())).toBe(true);
    expect(isStandaardIndeling(zetZichtbaar(standaardIndeling(), "over", false))).toBe(false);
    expect(isStandaardIndeling(verschuifBlok(standaardIndeling(), "over", "omhoog"))).toBe(false);
  });

  it("linkt elk blok naar een bestaande tekstsectie", () => {
    const ankers = [...WEBSITE.secties, ...NIEUWSBRIEF.secties].map((s) => s.sleutel.replace(/\./g, "-"));
    for (const blok of HOMEPAGE_BLOKKEN) {
      const [pad, anker] = BLOK_INFO[blok].tekstenHref.split("#");
      expect(pad).toMatch(/^\/admin\/teksten\/(website|nieuwsbrief)$/);
      expect(ankers, blok).toContain(anker);
    }
  });
});

describe("valideerSocialUrl", () => {
  it("accepteert https-adressen op het juiste domein (ook subdomeinen)", () => {
    expect(valideerSocialUrl("instagram", "https://www.instagram.com/lidathiry")).toEqual({
      ok: true,
      waarde: "https://www.instagram.com/lidathiry",
    });
    expect(valideerSocialUrl("pinterest", "https://nl.pinterest.com/lida/").ok).toBe(true);
    expect(valideerSocialUrl("youtube", "https://youtu.be/abc").ok).toBe(true);
    expect(valideerSocialUrl("facebook", "https://fb.com/lida").ok).toBe(true);
    expect(valideerSocialUrl("tiktok", "https://www.tiktok.com/@lida").ok).toBe(true);
    expect(valideerSocialUrl("linkedin", "https://nl.linkedin.com/in/lida").ok).toBe(true);
  });

  it("vult https:// aan als het ontbreekt; leeg is toegestaan", () => {
    expect(valideerSocialUrl("instagram", "  instagram.com/lida  ")).toEqual({ ok: true, waarde: "https://instagram.com/lida" });
    expect(valideerSocialUrl("instagram", "")).toEqual({ ok: true, waarde: null });
    expect(valideerSocialUrl("instagram", null)).toEqual({ ok: true, waarde: null });
  });

  it("weigert http, verkeerde domeinen, lookalikes en lege profielen", () => {
    expect(valideerSocialUrl("instagram", "http://instagram.com/lida").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "https://facebook.com/lida").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "https://instagram.com.evil.nl/lida").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "https://notinstagram.com/lida").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "https://user:pw@instagram.com/lida").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "javascript:alert(1)").ok).toBe(false);
    expect(valideerSocialUrl("instagram", "https://www.instagram.com/").ok).toBe(false);
    const fout = valideerSocialUrl("facebook", "https://example.com/x");
    expect(fout.ok === false && fout.fout).toContain("facebook.com");
  });
});

describe("valideerAfbeeldingUrl", () => {
  it("accepteert https en eigen paden", () => {
    expect(valideerAfbeeldingUrl("https://cdn.voorbeeld.nl/logo.png")).toEqual({ ok: true, waarde: "https://cdn.voorbeeld.nl/logo.png" });
    expect(valideerAfbeeldingUrl("/logo.svg")).toEqual({ ok: true, waarde: "/logo.svg" });
    expect(valideerAfbeeldingUrl(" ")).toEqual({ ok: true, waarde: null });
  });
  it("weigert http, protocol-relatieve en andere adressen", () => {
    for (const u of ["http://x.nl/a.png", "//evil.nl/a.png", "data:image/png;base64,AAA", "logo.png", "https://localhost/a.png"]) {
      expect(valideerAfbeeldingUrl(u, "Logo").ok, u).toBe(false);
    }
  });
});

describe("valideerWebsiteInvoer", () => {
  it("geeft schone waarden terug (leeg = null)", () => {
    const r = valideerWebsiteInvoer({
      site_naam: "  Lida Thiry Stijl ",
      site_omschrijving: "Een   omschrijving\nover twee regels",
      logo_url: "https://cdn.voorbeeld.nl/logo.png",
      social_instagram: "instagram.com/lida",
    });
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.waarden.site_naam).toBe("Lida Thiry Stijl");
    expect(r.waarden.site_omschrijving).toBe("Een omschrijving over twee regels");
    expect(r.waarden.favicon_url).toBeNull();
    expect(r.waarden.social_instagram).toBe("https://instagram.com/lida");
    expect(r.waarden.social_tiktok).toBeNull();
  });

  it("verzamelt alle fouten", () => {
    const r = valideerWebsiteInvoer({
      site_naam: "x".repeat(81),
      deel_afbeelding_url: "http://x.nl/a.jpg",
      social_linkedin: "https://example.com/in/lida",
    });
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.fouten).toHaveLength(3);
  });
});

describe("websiteInstellingen", () => {
  it("valt terug op de standaard zonder instellingen", () => {
    const s = websiteInstellingen(null);
    expect(s).toMatchObject({
      eigenNaam: null,
      korteNaam: STANDAARD_SITE.korteNaam,
      volledigeNaam: STANDAARD_SITE.volledigeNaam,
      omschrijving: STANDAARD_SITE.omschrijving,
      logoUrl: null,
      social: [],
      homepageIndeling: null,
    });
  });

  it("gebruikt de ingestelde waarden en negeert ongeldige links", () => {
    const s = websiteInstellingen({
      site_naam: "Studio Lida",
      logo_url: "https://cdn.voorbeeld.nl/logo.png",
      favicon_url: "javascript:alert(1)",
      social_tiktok: "https://www.tiktok.com/@lida",
      social_instagram: "https://evil.nl/lida",
      social_facebook: "https://www.facebook.com/lida",
    });
    expect(s.korteNaam).toBe("Studio Lida");
    expect(s.volledigeNaam).toBe("Studio Lida");
    expect(s.logoUrl).toBe("https://cdn.voorbeeld.nl/logo.png");
    expect(s.faviconUrl).toBeNull();
    // Vaste volgorde (die van SOCIAL_NETWERKEN), alleen geldige links.
    expect(s.social.map((l) => l.netwerk)).toEqual(["facebook", "tiktok"]);
  });
});

describe("bouwSiteMetadata", () => {
  it("geeft zonder instellingen dezelfde metadata als voorheen", () => {
    const m = bouwSiteMetadata(websiteInstellingen(null), "https://lidathiry.nl");
    expect(m.title).toEqual({ default: "Online kledingadviestest · Lida Thiry", template: "%s · Lida Thiry" });
    expect(m.description).toBe(STANDAARD_SITE.omschrijving);
    expect(m.applicationName).toBe("Lida Thiry Imago & Kledingadvies");
    expect(m.metadataBase?.toString()).toBe("https://lidathiry.nl/");
    expect(m.openGraph).toMatchObject({ siteName: "Lida Thiry Imago & Kledingadvies", title: "Ontdek je figuurtype · Lida Thiry" });
    // Zonder favicon/deelafbeelding: geen icons en geen images, zodat icon.svg en opengraph-image gelden.
    expect("icons" in m).toBe(false);
    expect(m.openGraph && "images" in m.openGraph).toBe(false);
    expect(m.twitter && "images" in m.twitter).toBe(false);
  });

  it("gebruikt naam, favicon en deelafbeelding uit de instellingen", () => {
    const m = bouwSiteMetadata(
      websiteInstellingen({
        site_naam: "Studio Lida",
        site_omschrijving: "Kledingadvies op maat.",
        favicon_url: "https://cdn.voorbeeld.nl/icoon.png?v=2",
        deel_afbeelding_url: "https://cdn.voorbeeld.nl/delen.jpg",
      }),
      "http://localhost:3000",
    );
    expect(m.title).toEqual({ default: "Online kledingadviestest · Studio Lida", template: "%s · Studio Lida" });
    expect(m.description).toBe("Kledingadvies op maat.");
    expect(m.icons).toMatchObject({ icon: [{ url: "https://cdn.voorbeeld.nl/icoon.png?v=2", type: "image/png" }] });
    expect(m.openGraph).toMatchObject({
      siteName: "Studio Lida",
      images: [{ url: "https://cdn.voorbeeld.nl/delen.jpg", alt: "Studio Lida" }],
    });
    expect(m.twitter).toMatchObject({ images: [{ url: "https://cdn.voorbeeld.nl/delen.jpg" }] });
  });

  it("pictogramType", () => {
    expect(pictogramType("/a.SVG")).toBe("image/svg+xml");
    expect(pictogramType("https://x.nl/favicon.ico#x")).toBe("image/x-icon");
    expect(pictogramType("https://x.nl/icoon")).toBeUndefined();
  });
});
