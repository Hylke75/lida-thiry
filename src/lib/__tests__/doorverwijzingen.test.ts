import { describe, expect, it } from "vitest";
import { parseerCsvRijen } from "../nieuwsbrief/csv";
import {
  analyseerImport,
  bouwIndex,
  controleerTegenBestaande,
  doelAdres,
  exportRijen,
  filterDoorverwijzingen,
  isGereserveerd,
  leesPermanent,
  normaliseerNaar,
  normaliseerPad,
  slugWijziging,
  statusCode,
  testAdres,
  valideerDoorverwijzing,
  vanInLus,
  volgKeten,
  zoek,
  type Doorverwijzing,
} from "../doorverwijzingen/regels";

const r = (van: string, naar: string, permanent = true): Doorverwijzing => ({ van, naar, permanent });

describe("doorverwijzingen: paden", () => {
  it("normaliseert paden", () => {
    expect(normaliseerPad("/oud/")).toBe("/oud");
    expect(normaliseerPad("/oud///pagina//")).toBe("/oud/pagina");
    expect(normaliseerPad("/")).toBe("/");
    expect(normaliseerPad("")).toBe("/");
    expect(normaliseerPad("oud")).toBe("/oud");
    expect(normaliseerPad(" /oud?x=1#a ")).toBe("/oud");
    expect(normaliseerPad("/caf%C3%A9")).toBe("/café");
    expect(normaliseerPad("/Over-Mij")).toBe("/Over-Mij");
  });

  it("decodeert veilig bij ongeldige %-reeksen", () => {
    expect(normaliseerPad("/a%ZZb")).toBe("/a%ZZb");
    expect(normaliseerPad("/100%")).toBe("/100%");
    expect(normaliseerPad("/a%E0%A4%A/b%20c")).toBe("/a%E0%A4%A/b c");
  });

  it("herkent gereserveerde paden", () => {
    for (const p of ["/admin", "/admin/blog", "/API/x", "/auth/callback", "/_next/data/x"]) expect(isGereserveerd(p)).toBe(true);
    for (const p of ["/administratie", "/apie", "/blog/admin", "/"]) expect(isGereserveerd(p)).toBe(false);
  });

  it("normaliseert de bestemming maar laat query en anker staan", () => {
    expect(normaliseerNaar("/nieuw/?a=1#b")).toBe("/nieuw?a=1#b");
    expect(normaliseerNaar("https://example.com/x/")).toBe("https://example.com/x/");
  });

  it("leest permanent/tijdelijk", () => {
    expect(leesPermanent("")).toBe(true);
    expect(leesPermanent("ja")).toBe(true);
    expect(leesPermanent("301")).toBe(true);
    expect(leesPermanent("Tijdelijk")).toBe(false);
    expect(leesPermanent("302")).toBe(false);
    expect(leesPermanent(false)).toBe(false);
    expect(leesPermanent("misschien")).toBeNull();
  });
});

describe("doorverwijzingen: valideren", () => {
  it("accepteert een interne en een externe bestemming", () => {
    expect(valideerDoorverwijzing({ van: "/oud/", naar: "/nieuw/", permanent: "ja" })).toEqual({ ok: true, waarde: r("/oud", "/nieuw") });
    expect(valideerDoorverwijzing({ van: "/actie", naar: "https://shop.example.nl/x", permanent: "nee" })).toEqual({
      ok: true,
      waarde: r("/actie", "https://shop.example.nl/x", false),
    });
  });

  it("weigert ongeldige invoer", () => {
    const fout = (van: string, naar: string) => {
      const v = valideerDoorverwijzing({ van, naar, permanent: "ja" });
      return v.ok ? [] : v.fouten;
    };
    expect(fout("", "/x")).toHaveLength(1);
    expect(fout("oud", "/x")[0]).toMatch(/met één \/ beginnen/);
    expect(fout("//evil.com", "/x")[0]).toMatch(/met één \/ beginnen/);
    expect(fout("/oud?x=1", "/x")[0]).toMatch(/\?/);
    expect(fout("/", "/x")[0]).toMatch(/homepage/);
    expect(fout("/admin/x", "/x")[0]).toMatch(/\/admin/);
    expect(fout("/_next/static", "/x")[0]).toMatch(/kunnen niet/);
    expect(fout("/oud", "")[0]).toMatch(/nieuwe adres in/);
    expect(fout("/oud", "http://example.com")[0]).toMatch(/met \/ beginnen/);
    expect(fout("/oud", "//example.com")[0]).toMatch(/met \/ beginnen/);
    expect(fout("/oud", "https://localhost")[0]).toMatch(/geen geldig/);
    expect(fout("/oud", "javascript:alert(1)")[0]).toMatch(/met \/ beginnen/);
    expect(fout("/oud", "/oud/")[0]).toMatch(/hetzelfde/);
    expect(fout("/oud", "/oud?x=1")[0]).toMatch(/hetzelfde/);
    expect(fout("/" + "a".repeat(400), "/x")[0]).toMatch(/te lang/);
  });
});

describe("doorverwijzingen: lussen en ketens", () => {
  it("volgt een keten en vindt lussen", () => {
    expect(volgKeten([r("/a", "/b"), r("/b", "/c")], "/a").stappen.map((s) => s.naar)).toEqual(["/b", "/c"]);
    expect(volgKeten([r("/a", "/b"), r("/b", "/a")], "/a").lus).toBe(true);
    expect(volgKeten([r("/a", "https://x.nl/b")], "/a")).toEqual({ stappen: [r("/a", "https://x.nl/b")], lus: false });
  });

  it("weigert een rondje bij opslaan, ook bij aanpassen", () => {
    expect(controleerTegenBestaande(r("/b", "/a"), [r("/a", "/b")]).fouten[0]).toMatch(/rondje: \/b → \/a → \/b/);
    expect(controleerTegenBestaande(r("/c", "/a"), [r("/a", "/b"), r("/b", "/c")]).fouten).toHaveLength(1);
    // /a → /b aanpassen naar /a → /c: de oude regel telt niet meer mee.
    expect(controleerTegenBestaande(r("/a", "/c"), [r("/a", "/b"), r("/b", "/a")]).fouten).toEqual([]);
    // De van veranderen (/x → /a wordt /y → /a) vervangt de oude regel.
    expect(controleerTegenBestaande(r("/y", "/a"), [r("/x", "/a"), r("/a", "/x")], "/x").fouten).toEqual([]);
  });

  it("waarschuwt bij ketens", () => {
    const w1 = controleerTegenBestaande(r("/a", "/b"), [r("/b", "/c")]);
    expect(w1.fouten).toEqual([]);
    expect(w1.waarschuwingen[0]).toMatch(/\/b → \/c/);
    const w2 = controleerTegenBestaande(r("/b", "/c"), [r("/a", "/b")]);
    expect(w2.waarschuwingen[0]).toMatch(/verwijzen al adressen naar \/b \(\/a\)/);
    expect(controleerTegenBestaande(r("/a", "/b"), []).waarschuwingen).toEqual([]);
  });

  it("vindt alle regels in of richting een lus", () => {
    const regels = [r("/a", "/b"), r("/b", "/a"), r("/c", "/a"), r("/d", "/e"), r("/e", "https://x.nl"), r("/f", "/f")];
    expect([...vanInLus(regels)].sort()).toEqual(["/a", "/b", "/c", "/f"]);
    expect(vanInLus([])).toEqual(new Set());
  });

  it("is lineair voor lange ketens", () => {
    const regels = Array.from({ length: 5000 }, (_, i) => r(`/p${i}`, `/p${i + 1}`));
    const start = Date.now();
    expect(vanInLus(regels).size).toBe(0);
    expect(Date.now() - start).toBeLessThan(500);
  });
});

describe("doorverwijzingen: opzoeken", () => {
  const index = bouwIndex([
    r("/oud", "/nieuw"),
    r("/Hoofdletters", "/klein"),
    r("/café", "/koffie"),
    r("/admin/oud", "/x"), // gereserveerd: genegeerd
    r("/zelf", "/zelf/"), // naar zichzelf: genegeerd
    r("/l1", "/l2"),
    r("/l2", "/l1"), // lus: genegeerd
    r("/tijdelijk", "https://example.com/actie", false),
  ]);

  it("vindt exact, met schuine streep en gecodeerd", () => {
    expect(zoek(index, "/oud")?.naar).toBe("/nieuw");
    expect(zoek(index, "/oud/")?.naar).toBe("/nieuw");
    expect(zoek(index, "/caf%C3%A9")?.naar).toBe("/koffie");
  });

  it("valt terug op kleine letters", () => {
    expect(zoek(index, "/Hoofdletters")?.naar).toBe("/klein");
    expect(zoek(index, "/hoofdletters")?.naar).toBe("/klein");
    expect(zoek(index, "/OUD")?.naar).toBe("/nieuw");
  });

  it("negeert gereserveerde paden, zelfverwijzingen en lussen", () => {
    expect(zoek(index, "/admin/oud")).toBeNull();
    expect(zoek(index, "/zelf")).toBeNull();
    expect(zoek(index, "/l1")).toBeNull();
    expect(zoek(index, "/")).toBeNull();
    expect(zoek(index, "/bestaat-niet")).toBeNull();
  });

  it("slaat ongeldige rijen uit de database over", () => {
    const i = bouwIndex([{ van: "/a", naar: "ftp://x" } as Doorverwijzing, null as unknown as Doorverwijzing, r("/b", "/c")]);
    expect(i.exact.size).toBe(1);
  });

  it("bouwt het doeladres met de query", () => {
    expect(doelAdres("/nieuw", "")).toBe("/nieuw");
    expect(doelAdres("/nieuw", "?a=1&b=2")).toBe("/nieuw?a=1&b=2");
    expect(doelAdres("/nieuw?x=1", "?a=1")).toBe("/nieuw?x=1");
    expect(doelAdres("/nieuw#deel", "?a=1")).toBe("/nieuw?a=1#deel");
    expect(doelAdres("/nieuw", "?_rsc=abc")).toBe("/nieuw");
    expect(doelAdres("https://x.nl/p", "?utm_source=nb")).toBe("https://x.nl/p?utm_source=nb");
    expect(statusCode(true)).toBe(308);
    expect(statusCode(false)).toBe(307);
  });
});

describe("doorverwijzingen: test een adres", () => {
  const regels = [r("/a", "/b"), r("/b", "/c"), r("/t", "https://x.nl/", false)];

  it("beschrijft de uitkomst", () => {
    expect(testAdres(regels, "/admin")).toEqual({ soort: "gereserveerd", pad: "/admin" });
    expect(testAdres(regels, "/niets")).toEqual({ soort: "geen", pad: "/niets" });
    expect(testAdres(regels, "")).toEqual({ soort: "ongeldig", pad: "" });
    const t = testAdres(regels, "https://www.lidathiry.nl/t/?ref=1");
    expect(t).toMatchObject({ soort: "doorverwijzing", pad: "/t", doel: "https://x.nl/?ref=1", status: 307, vervolg: [] });
    const a = testAdres(regels, "/A?x=1");
    expect(a).toMatchObject({ soort: "doorverwijzing", doel: "/b?x=1", status: 308, lus: false });
    if (a.soort === "doorverwijzing") expect(a.vervolg.map((s) => s.naar)).toEqual(["/c"]);
  });

  it("filtert de lijst", () => {
    expect(filterDoorverwijzingen(regels, "X.NL").map((x) => x.van)).toEqual(["/t"]);
    expect(filterDoorverwijzingen(regels, " ")).toHaveLength(3);
  });
});

describe("doorverwijzingen: CSV", () => {
  it("leest een bestand met koprij in willekeurige volgorde", () => {
    const a = analyseerImport(parseerCsvRijen("permanent;naar;van\nja;/nieuw;/oud/\nnee;https://x.nl;/actie\n;/c;/b\n"));
    expect(a.rijen).toEqual([
      { van: "/oud", naar: "/nieuw", permanent: true, regel: 2 },
      { van: "/actie", naar: "https://x.nl", permanent: false, regel: 3 },
      { van: "/b", naar: "/c", permanent: true, regel: 4 },
    ]);
    expect(a.ongeldig).toEqual([]);
  });

  it("zonder koprij: van, naar, permanent; ongeldig en dubbel worden gemeld", () => {
    const a = analyseerImport(parseerCsvRijen("/a,/b\n/admin,/x\n/a,/c,nee\nzonder-slash,/x\n/d,/e,misschien"));
    expect(a.rijen).toEqual([{ van: "/a", naar: "/c", permanent: false, regel: 3 }]);
    expect(a.dubbel).toBe(1);
    expect(a.ongeldig.map((o) => o.regel)).toEqual([2, 4, 5]);
  });

  it("exporteert in hetzelfde formaat", () => {
    const rijen = exportRijen([r("/a", "/b"), r("/c", "https://x.nl", false)]);
    expect(rijen).toEqual([
      ["van", "naar", "permanent"],
      ["/a", "/b", "ja"],
      ["/c", "https://x.nl", "nee"],
    ]);
    const terug = analyseerImport(rijen.map((cellen, i) => ({ regel: i + 1, cellen })));
    expect(terug.rijen.map(({ van, naar, permanent }) => ({ van, naar, permanent }))).toEqual([r("/a", "/b"), r("/c", "https://x.nl", false)]);
  });
});

describe("doorverwijzingen: nieuw webadres", () => {
  it("geeft de wijzigingen voor een verhuisde pagina", () => {
    expect(slugWijziging("/blog/oud", "/blog/nieuw")).toEqual({
      verwijderVan: "/blog/nieuw",
      herrichtNaar: { van: "/blog/oud", naar: "/blog/nieuw" },
      upsert: { van: "/blog/oud", naar: "/blog/nieuw", permanent: true, automatisch: true },
    });
  });

  it("doet niets bij hetzelfde of een gereserveerd adres", () => {
    expect(slugWijziging("/over", "/over/")).toBeNull();
    expect(slugWijziging("/", "/x")).toBeNull();
    expect(slugWijziging("/admin", "/x")).toBeNull();
  });
});

describe("doorverwijzingen: hoofdletters, afbeeldingen en backslashes", () => {
  it("een regel /Over → /over stuurt /over niet naar zichzelf", () => {
    const index = bouwIndex([r("/Over", "/over")]);
    expect(zoek(index, "/Over")?.naar).toBe("/over");
    expect(zoek(index, "/over")).toBeNull();
    // Een andere schrijfwijze gaat wel naar /over, en daar stopt het.
    expect(zoek(index, "/OVER")?.naar).toBe("/over");
    expect(vanInLus([r("/Over", "/over")]).size).toBe(0);
  });

  it("vindt lussen die via kleine letters lopen", () => {
    const regels = [r("/A", "/b"), r("/B", "/a")];
    expect(vanInLus(regels)).toEqual(new Set(["/A", "/B"]));
    expect(volgKeten(regels, "/A").lus).toBe(true);
    const index = bouwIndex(regels);
    expect(zoek(index, "/A")).toBeNull();
    expect(zoek(index, "/b")).toBeNull();
    expect(controleerTegenBestaande(r("/B", "/a"), [r("/A", "/b")]).fouten).toHaveLength(1);
  });

  it("weigert afbeeldingspaden (die ziet de proxy niet), ook bij importeren", () => {
    for (const van of ["/oud/logo.svg", "/foto.png", "/a.jpg", "/a.jpeg", "/a.gif", "/a.webp", "/favicon.ico"]) {
      expect(valideerDoorverwijzing({ van, naar: "/nieuw" }).ok, van).toBe(false);
    }
    expect(valideerDoorverwijzing({ van: "/brochure.pdf", naar: "/nieuw" }).ok).toBe(true);
    const a = analyseerImport(parseerCsvRijen("/logo.png,/nieuw\n/oud,/nieuw"));
    expect(a.rijen.map((x) => x.van)).toEqual(["/oud"]);
    expect(a.ongeldig[0].reden).toMatch(/afbeeldingen/);
  });

  it("behandelt /\\ niet als intern adres", () => {
    expect(valideerDoorverwijzing({ van: "/oud", naar: "/\\evil.com" }).ok).toBe(false);
    expect(valideerDoorverwijzing({ van: "/oud", naar: "/%5Cevil.com" }).ok).toBe(false);
    expect(valideerDoorverwijzing({ van: "/oud", naar: "//evil.com" }).ok).toBe(false);
    expect(valideerDoorverwijzing({ van: "/o\\ud", naar: "/nieuw" }).ok).toBe(false);
    expect(zoek(bouwIndex([r("/oud", "/\\evil.com")]), "/oud")).toBeNull();
  });
});
