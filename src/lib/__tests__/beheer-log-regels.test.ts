import { describe, expect, it } from "vitest";
import {
  actieCategorie,
  bewaarGrens,
  datumGrenzen,
  leesLogFilter,
  logCsvRijen,
  logFilterParams,
  onderwerpLink,
  schoonDetails,
  schoonOmschrijving,
  zoekPatroon,
} from "../beheer-log-regels";

const ID = "3f2b8c1e-1d2a-4b3c-9d8e-0123456789ab";

describe("schoonDetails", () => {
  it("haalt geheimen weg", () => {
    const d = schoonDetails({
      wachtwoord: "geheim123",
      password: "x",
      testtoken: "abc",
      api_key: "sk-123",
      totp: { qr_code: "data:image/svg+xml;base64,AAAA", secret: "JBSW" },
      naam: "Lida",
      code: "WELKOM10",
    });
    expect(d).toEqual({
      wachtwoord: "[verborgen]",
      password: "[verborgen]",
      testtoken: "[verborgen]",
      api_key: "[verborgen]",
      totp: "[verborgen]",
      naam: "Lida",
      code: "WELKOM10",
    });
  });

  it("geheimen ook dieper in het object", () => {
    expect(schoonDetails({ a: { b: { token: "x", ok: 1 } } })).toEqual({ a: { b: { token: "[verborgen]", ok: 1 } } });
  });

  it("korte aanduiding voor grote of binaire waarden", () => {
    const d = schoonDetails({
      plaatje: `data:image/png;base64,${"A".repeat(5000)}`,
      lang: "x".repeat(2000),
      bestand: new Uint8Array(10),
      lijst: Array.from({ length: 80 }, (_, i) => i),
    })!;
    expect(d.plaatje).toMatch(/^\[data-url/);
    expect(String(d.lang).length).toBeLessThan(600);
    expect(d.bestand).toBe("[binair, 10 bytes]");
    expect((d.lijst as unknown[]).length).toBe(51);
  });

  it("beperkt de diepte en de totale omvang", () => {
    const diep = schoonDetails({ a: { b: { c: { d: { e: { f: 1 } } } } } })!;
    expect(JSON.stringify(diep)).toContain("[…]");
    const groot: Record<string, string> = {};
    for (let i = 0; i < 49; i++) groot[`veld${i}`] = "woord ".repeat(70);
    const s = schoonDetails(groot)!;
    expect(s.ingekort).toBe(true);
    expect(JSON.stringify(s).length).toBeLessThan(1000);
  });

  it("leeg of niets wordt null; functies vallen weg; datums als ISO", () => {
    expect(schoonDetails(null)).toBeNull();
    expect(schoonDetails(undefined)).toBeNull();
    expect(schoonDetails({})).toBeNull();
    expect(schoonDetails({ f: () => 1 })).toBeNull();
    expect(schoonDetails({ op: new Date("2026-10-04T10:00:00Z") })).toEqual({ op: "2026-10-04T10:00:00.000Z" });
    expect(schoonDetails("los")).toEqual({ waarde: "los" });
  });

  it("gooit niet bij kringverwijzingen", () => {
    const a: Record<string, unknown> = { x: 1 };
    a.zelf = a;
    expect(() => schoonDetails(a)).not.toThrow();
  });
});

describe("schoonOmschrijving", () => {
  it("één regel, ingekort", () => {
    expect(schoonOmschrijving("  a\n  b ")).toBe("a b");
    expect(schoonOmschrijving("x".repeat(900)).length).toBe(500);
    expect(schoonOmschrijving(undefined)).toBe("");
  });
});

describe("onderwerpLink", () => {
  it("linkt naar het onderwerp in het beheer", () => {
    expect(onderwerpLink("order", ID)).toBe(`/admin/order/${ID}`);
    expect(onderwerpLink("pagina", ID)).toBe(`/admin/paginas/${ID}`);
    expect(onderwerpLink("blog", ID)).toBe(`/admin/blog/${ID}`);
    expect(onderwerpLink("relatie", ID)).toBe(`/admin/adresboek/${ID}`);
    expect(onderwerpLink("contact", ID)).toBe(`/admin/nieuwsbrief/contacten/${ID}`);
    expect(onderwerpLink("campagne", ID)).toBe(`/admin/nieuwsbrief/campagnes/${ID}`);
    expect(onderwerpLink("kortingscode", "WELKOM")).toBe("/admin/kortingscodes");
  });
  it("geen link zonder bruikbaar id of bij onbekende soort", () => {
    expect(onderwerpLink("pagina", "niet-een-uuid")).toBeNull();
    expect(onderwerpLink("onbekend", ID)).toBeNull();
    expect(onderwerpLink(null, ID)).toBeNull();
    expect(onderwerpLink("order", null)).toBeNull();
  });
});

describe("filter", () => {
  it("leest geldige waarden en negeert de rest", () => {
    expect(
      leesLogFilter({ gebruiker: ID, categorie: "order", soort: "pagina", van: "2026-01-01", tot: "2026-01-31", q: " zoek ", pagina: "3" }),
    ).toEqual({ gebruiker: ID, categorie: "order", soort: "pagina", van: "2026-01-01", tot: "2026-01-31", q: "zoek", pagina: 3 });
    expect(leesLogFilter({ gebruiker: "x", categorie: "or;der", van: "1-1-2026", pagina: "-1" })).toEqual({
      gebruiker: undefined,
      categorie: undefined,
      soort: undefined,
      van: undefined,
      tot: undefined,
      q: undefined,
      pagina: 1,
    });
  });
  it("maakt er weer zoekparameters van", () => {
    const f = leesLogFilter({ categorie: "order", q: "a b" });
    expect(logFilterParams(f).toString()).toBe("categorie=order&q=a+b");
    expect(logFilterParams(f, { pagina: 2 }).get("pagina")).toBe("2");
  });
  it("datumgrenzen in Nederlandse tijd (tot en met de einddatum)", () => {
    expect(datumGrenzen({ van: "2026-07-01", tot: "2026-07-01" })).toEqual({
      vanaf: "2026-06-30T22:00:00.000Z",
      totVoor: "2026-07-01T22:00:00.000Z",
    });
    expect(datumGrenzen({ van: "2026-01-15" }).vanaf).toBe("2026-01-14T23:00:00.000Z");
    expect(datumGrenzen({})).toEqual({});
  });
  it("zoekpatroon zonder tekens die het filter breken", () => {
    expect(zoekPatroon("lida@voorbeeld.nl")).toBe("*lida@voorbeeld.nl*");
    expect(zoekPatroon("a,b(c)")).toBe("*a b c*");
    expect(zoekPatroon("%*")).toBeNull();
  });
});

describe("overig", () => {
  it("categorie van een actie", () => {
    expect(actieCategorie("order.verwijderen")).toBe("order");
    expect(actieCategorie("los")).toBe("los");
  });
  it("bewaargrens: 2 jaar terug", () => {
    expect(bewaarGrens(new Date("2026-10-04T03:00:00Z")).toISOString()).toBe("2024-10-04T03:00:00.000Z");
  });
  it("CSV-rijen met kopregel", () => {
    const rijen = logCsvRijen([
      {
        id: 1,
        gebruiker_id: ID,
        email: "lida@voorbeeld.nl",
        actie: "order.verwijderen",
        onderwerp_soort: "order",
        onderwerp_id: "o1",
        omschrijving: "Bestelling verwijderd",
        details: { status: "betaald" },
        op: "2026-10-04T10:00:00Z",
      },
    ]);
    expect(rijen[0][0]).toBe("Tijdstip");
    expect(rijen[1]).toEqual([
      "2026-10-04T10:00:00Z",
      "lida@voorbeeld.nl",
      "order.verwijderen",
      "order",
      "o1",
      "Bestelling verwijderd",
      '{"status":"betaald"}',
    ]);
  });
});
