import { describe, expect, it } from "vitest";
import { evalueerLivegang, isEigenDomein, livegangStatus, opsomming, sectieAnker, type LivegangGegevens } from "../livegang";
import { sectie, type Groep } from "../inhoud/schema";

const HERO = sectie({
  sleutel: "website.hero",
  titel: "Bovenaan",
  velden: { titel: { soort: "tekst", label: "Titel", standaard: "Welkom" } },
});
const OVER = sectie({
  sleutel: "website.over.mij",
  titel: "Over mij",
  velden: {
    tekst: { soort: "opmaak", label: "Tekst", standaard: "Ik ben [aan te vullen: naam]." },
    vragen: {
      soort: "lijst",
      label: "Vragen",
      itemNaam: "vraag",
      velden: { vraag: { soort: "tekst", label: "Vraag", standaard: "" } },
      standaard: [{ vraag: "Wat kost het?" }],
    },
  },
});
const WEBSITE: Groep = { sleutel: "website", titel: "Website", omschrijving: "", secties: [HERO, OVER] };

const ALLE_CATEGORIEEN = Array.from({ length: 12 }, (_, i) => i + 1);

function compleet(): LivegangGegevens {
  return {
    prijsCent: 2995,
    instellingen: {
      bedrijfsnaam: "Lida Thiry",
      bedrijf_adres: "Straat 1, 1234 AB Plaats",
      kvk_nummer: "12345678",
      contact_email: "info@voorbeeld.nl",
      adviseur_email: "lida@voorbeeld.nl",
      logo_url: "https://cdn.voorbeeld.nl/logo.png",
      deel_afbeelding_url: "https://cdn.voorbeeld.nl/delen.jpg",
    },
    tekstgroepen: [WEBSITE],
    opgeslagenTeksten: new Map([["website.over.mij", { tekst: "Ik ben Lida.", vragen: [] }]]),
    lichaamstypes: [
      { code: "X", naam: "Zandloper", actief: true, beeld_id: "b1" },
      { code: "Q", naam: "Oud type", actief: false, beeld_id: null },
    ],
    adviestypes: ALLE_CATEGORIEEN.map((c) => ({ sleutel: `${c}X`, secties: 3 })),
    ontbrekendeKoppelingen: [],
    omgeving: {
      RESEND_VAN: "Lida <info@lidathiry.nl>",
      RESEND_API_KEY: "re_123",
      MOLLIE_API_KEY: "live_abc",
      NEXT_PUBLIC_SITE_URL: "https://lidathiry.nl",
      RESEND_WEBHOOK_SECRET: "whsec_abc",
      NIEUWSBRIEF_GEHEIM: "geheim",
      ANTHROPIC_API_KEY: "sk-ant-123",
    },
    aangemeldeContacten: 12,
    contactformulierGepubliceerd: true,
  };
}

const vind = (g: LivegangGegevens, id: string) => {
  const item = evalueerLivegang(g).find((i) => i.id === id);
  if (!item) throw new Error(`geen item ${id}`);
  return item;
};

describe("evalueerLivegang", () => {
  it("is helemaal klaar als alles in orde is", () => {
    const items = evalueerLivegang(compleet());
    expect(items.filter((i) => !i.ok)).toEqual([]);
    expect(livegangStatus(items)).toEqual({ klaar: true, allesKlaar: true, openVerplicht: 0, openAanbevolen: 0 });
  });

  it("meldt een ontbrekende prijs", () => {
    expect(vind({ ...compleet(), prijsCent: null }, "prijs")).toMatchObject({
      ok: false,
      links: [{ href: "/admin/instellingen" }],
    });
  });

  it("noemt de ontbrekende bedrijfsgegevens (lege tekst telt als leeg)", () => {
    const g = compleet();
    g.instellingen = { ...g.instellingen, kvk_nummer: "  ", contact_email: null };
    const item = vind(g, "bedrijfsgegevens");
    expect(item.ok).toBe(false);
    expect(item.detail).toBe("Nog in te vullen: KvK-nummer en contact-e-mailadres.");
  });

  it("controleert het adres voor foutmeldingen", () => {
    const g = compleet();
    g.instellingen = { ...g.instellingen, adviseur_email: undefined };
    expect(vind(g, "foutmeldingen").ok).toBe(false);
  });

  it("vindt invulplekken in standaard- en opgeslagen teksten, met link naar het anker", () => {
    const g = { ...compleet(), opgeslagenTeksten: new Map() };
    const item = vind(g, "teksten");
    expect(item.ok).toBe(false);
    expect(item.links).toEqual([{ href: "/admin/teksten/website#website-over-mij", label: "Website: Over mij" }]);

    const opgeslagen = new Map<string, unknown>([
      ["website.over.mij", { tekst: "Klaar", vragen: [{ _id: "a", vraag: "[invullen] vraag" }] }],
    ]);
    expect(vind({ ...compleet(), opgeslagenTeksten: opgeslagen }, "teksten").ok).toBe(false);
  });

  it("werkt voor groepen die later worden toegevoegd", () => {
    const extra: Groep = {
      sleutel: "mails",
      titel: "E-mails",
      omschrijving: "",
      secties: [
        sectie({
          sleutel: "mail.welkom",
          titel: "Welkom",
          velden: { onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "[aan te vullen]" } },
        }),
      ],
    };
    const item = vind({ ...compleet(), tekstgroepen: [WEBSITE, extra] }, "teksten");
    expect(item.links.map((l) => l.href)).toEqual(["/admin/teksten/mails#mail-welkom"]);
  });

  it("beperkt het aantal links per punt", () => {
    const secties = Array.from({ length: 10 }, (_, i) =>
      sectie({ sleutel: `x.s${i}`, titel: `S${i}`, velden: { t: { soort: "tekst", label: "T", standaard: "[invullen]" } } }),
    );
    const item = vind({ ...compleet(), tekstgroepen: [{ sleutel: "x", titel: "X", omschrijving: "", secties }] }, "teksten");
    expect(item.links).toHaveLength(6);
    expect(item.links.at(-1)).toEqual({ href: "/admin/teksten", label: "Alle teksten" });
    expect(item.detail).toContain("10 onderdelen");
  });

  it("meldt ontbrekende koppelingen van de berekening", () => {
    const item = vind({ ...compleet(), ontbrekendeKoppelingen: ["Lepel", "Rechthoek"] }, "koppeling");
    expect(item.ok).toBe(false);
    expect(item.detail).toBe("Nog niet gekoppeld: Lepel en Rechthoek.");
  });

  it("meldt ontbrekende adviestypes alleen voor actieve lichaamstypes", () => {
    const g = compleet();
    g.adviestypes = g.adviestypes.filter((t) => t.sleutel !== "7X" && t.sleutel !== "12X");
    const item = vind(g, "adviestypes");
    expect(item.ok).toBe(false);
    expect(item.detail).toBe("Ontbreekt: Zandloper (7X, 12X).");
    expect(item.links).toEqual([{ href: "/admin/types?letter=X", label: "Zandloper" }]);
  });

  it("meldt adviestypes zonder onderdelen (inactieve types tellen niet mee)", () => {
    const g = compleet();
    g.adviestypes = [
      ...g.adviestypes.map((t) => (t.sleutel === "3X" ? { ...t, secties: 0 } : t)),
      { sleutel: "1Q", secties: 0 },
    ];
    const item = vind(g, "adviestekst");
    expect(item.ok).toBe(false);
    expect(item.links).toEqual([{ href: "/admin/types/3X", label: "3X" }]);
  });

  it("een ontbrekende afbeelding is een aanbeveling, geen blokkade", () => {
    const g = compleet();
    g.lichaamstypes = [{ code: "X", naam: "Zandloper", actief: true, beeld_id: null }];
    const items = evalueerLivegang(g);
    expect(items.find((i) => i.id === "silhouetfoto")).toMatchObject({ ok: false, niveau: "aanbevolen" });
    expect(livegangStatus(items)).toMatchObject({ klaar: true, allesKlaar: false, openAanbevolen: 1 });
  });

  it("controleert de omgeving: testmodus, afzender, Mollie-sleutel", () => {
    const g = compleet();
    g.omgeving = { MOLLIE_API_KEY: "test_abc", GRATIS_TEST: "1" };
    const items = evalueerLivegang(g);
    const open = items.filter((i) => !i.ok).map((i) => i.id);
    expect(open).toEqual([
      "gratis-test",
      "mollie",
      "resend-sleutel",
      "resend-van",
      "site-url",
      "eigen-domein",
      "nieuwsbrief-afzender",
      "nieuwsbrief-webhook",
      "nieuwsbrief-geheim",
      "ai-schrijfhulp",
    ]);
    expect(items.find((i) => i.id === "mollie")?.detail).toContain("testsleutel");
    expect(items.find((i) => i.id === "resend-van")?.detail).toContain("resend.dev");
    expect(livegangStatus(items)).toMatchObject({ klaar: false, openVerplicht: 6, openAanbevolen: 4 });

    expect(vind({ ...compleet(), omgeving: { ...compleet().omgeving, MOLLIE_API_KEY: "" } }, "mollie").detail).toContain(
      "ontbreekt",
    );
  });
});

describe("nieuwsbrief in de controlelijst", () => {
  it("waarschuwt voor de testafzender van resend.dev zodra er aangemelde contacten zijn", () => {
    const g = compleet();
    g.omgeving = { ...g.omgeving, RESEND_VAN: "Lida <onboarding@resend.dev>" };
    const item = vind(g, "nieuwsbrief-afzender");
    expect(item).toMatchObject({ ok: false, niveau: "verplicht" });
    expect(item.detail).toContain("12 aangemelde contacten");

    expect(vind({ ...g, aangemeldeContacten: 0 }, "nieuwsbrief-afzender").ok).toBe(true);
    expect(vind({ ...g, aangemeldeContacten: undefined }, "nieuwsbrief-afzender").ok).toBe(true);
    // Geen RESEND_VAN: dan wordt ook het testadres gebruikt.
    expect(vind({ ...g, omgeving: { ...g.omgeving, RESEND_VAN: "" } }, "nieuwsbrief-afzender").ok).toBe(false);
    expect(vind(compleet(), "nieuwsbrief-afzender").ok).toBe(true);
  });

  it("webhookgeheim en linkgeheim zijn aanbevelingen met uitleg", () => {
    const g = compleet();
    g.omgeving = { ...g.omgeving, RESEND_WEBHOOK_SECRET: "", NIEUWSBRIEF_GEHEIM: undefined };
    const items = evalueerLivegang(g);
    const webhook = items.find((i) => i.id === "nieuwsbrief-webhook");
    expect(webhook).toMatchObject({ ok: false, niveau: "aanbevolen" });
    expect(webhook?.detail).toContain("bounces");
    expect(items.find((i) => i.id === "nieuwsbrief-geheim")).toMatchObject({ ok: false, niveau: "aanbevolen" });
    expect(livegangStatus(items)).toMatchObject({ klaar: true, allesKlaar: false, openAanbevolen: 2 });
  });
});

describe("blog in de controlelijst", () => {
  it("een ontbrekende AI-sleutel is een aanbeveling, geen blokkade", () => {
    const g = compleet();
    g.omgeving = { ...g.omgeving, ANTHROPIC_API_KEY: " " };
    const items = evalueerLivegang(g);
    const item = items.find((i) => i.id === "ai-schrijfhulp");
    expect(item).toMatchObject({ ok: false, niveau: "aanbevolen", links: [{ href: "/admin/blog" }] });
    expect(item?.detail).toContain("ANTHROPIC_API_KEY");
    expect(livegangStatus(items)).toMatchObject({ klaar: true, allesKlaar: false, openAanbevolen: 1 });
    expect(vind(compleet(), "ai-schrijfhulp").ok).toBe(true);
  });
});

describe("contact in de controlelijst", () => {
  it("raadt een gepubliceerd contactformulier aan", () => {
    const g = { ...compleet(), contactformulierGepubliceerd: undefined };
    const items = evalueerLivegang(g);
    expect(items.find((i) => i.id === "contactformulier")).toMatchObject({
      ok: false,
      niveau: "aanbevolen",
      links: [{ href: "/admin/paginas" }],
    });
    expect(livegangStatus(items)).toMatchObject({ klaar: true, openAanbevolen: 1 });
  });

  it("meldingen gaan naar adviseur_email of contact_email", () => {
    const zonder = compleet();
    zonder.instellingen = { ...zonder.instellingen, adviseur_email: "", contact_email: null };
    expect(vind(zonder, "contact-meldingen")).toMatchObject({ ok: false, niveau: "verplicht" });
    expect(vind({ ...zonder, contactformulierGepubliceerd: false }, "contact-meldingen").niveau).toBe("aanbevolen");

    const alleenContact = compleet();
    alleenContact.instellingen = { ...alleenContact.instellingen, adviseur_email: "" };
    expect(vind(alleenContact, "contact-meldingen").ok).toBe(true);
    expect(vind(compleet(), "contact-meldingen").ok).toBe(true);
  });
});

describe("website in de controlelijst", () => {
  it("logo en deelafbeelding zijn aanbevelingen met een link naar de website-instellingen", () => {
    const g = compleet();
    g.instellingen = { ...g.instellingen, logo_url: null, deel_afbeelding_url: " " };
    const items = evalueerLivegang(g);
    expect(items.find((i) => i.id === "logo")).toMatchObject({
      ok: false,
      niveau: "aanbevolen",
      links: [{ href: "/admin/website" }],
    });
    expect(items.find((i) => i.id === "deelafbeelding")).toMatchObject({ ok: false, niveau: "aanbevolen" });
    expect(livegangStatus(items)).toMatchObject({ klaar: true, allesKlaar: false, openAanbevolen: 2 });
  });

  it("raadt een eigen domein aan in plaats van *.vercel.app", () => {
    const g = compleet();
    g.omgeving = { ...g.omgeving, NEXT_PUBLIC_SITE_URL: "https://lida-thiry.vercel.app" };
    const item = vind(g, "eigen-domein");
    expect(item).toMatchObject({ ok: false, niveau: "aanbevolen" });
    expect(item.detail).toContain("lida-thiry.vercel.app");
    expect(vind(compleet(), "eigen-domein").ok).toBe(true);
  });

  it("isEigenDomein", () => {
    expect(isEigenDomein("https://lidathiry.nl")).toBe(true);
    expect(isEigenDomein("https://www.lidathiry.nl/")).toBe(true);
    expect(isEigenDomein("https://lida-thiry.vercel.app")).toBe(false);
    expect(isEigenDomein("https://LIDA.VERCEL.APP.")).toBe(false);
    expect(isEigenDomein("http://localhost:3000")).toBe(false);
    expect(isEigenDomein("http://127.0.0.1:3000")).toBe(false);
    expect(isEigenDomein("")).toBe(false);
    expect(isEigenDomein(undefined)).toBe(false);
    expect(isEigenDomein("geen url")).toBe(false);
  });
});

describe("hulpjes", () => {
  it("opsomming", () => {
    expect(opsomming([])).toBe("");
    expect(opsomming(["a"])).toBe("a");
    expect(opsomming(["a", "b", "c"])).toBe("a, b en c");
  });
  it("sectieAnker", () => {
    expect(sectieAnker("website.over.mij")).toBe("website-over-mij");
  });
});
