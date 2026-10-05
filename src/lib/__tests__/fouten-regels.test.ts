import { describe, expect, it } from "vitest";
import {
  bovensteFrame,
  drempelVan,
  GEMELD_BIJ,
  isBrowserRuis,
  leesBrowserMelding,
  meldReden,
  normaliseerBericht,
  normaliseerFrame,
  ontleedFout,
  schoonDetails,
  schoonPad,
  schoonTekst,
  vingerafdrukInvoer,
  zoekTerm,
} from "../fouten/regels";

describe("schoonTekst", () => {
  it("haalt e-mailadressen, JWT's, Bearer-tokens en geheimen weg", () => {
    expect(schoonTekst("Mail naar anna.de.vries+test@example.nl mislukt")).toBe("Mail naar [e-mail] mislukt");
    expect(schoonTekst("token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjMifQ.abc_DEF-123")).toBe("token [token]");
    expect(schoonTekst("Authorization: Bearer sk_live_abc.def")).toBe("Authorization: Bearer [token]");
    expect(schoonTekst('{"password":"hunter2","naam":"x"}')).toBe('{"password":"[verborgen]","naam":"x"}');
    expect(schoonTekst("api_key=abc123 en secret: geheimpje")).toBe("api_key=[verborgen] en secret: [verborgen]");
  });

  it("haalt querystrings uit URL's en paden", () => {
    expect(schoonTekst("GET https://lidathiry.nl/bestellen/bedankt?order=123&email=a@b.nl faalde")).toBe(
      "GET https://lidathiry.nl/bestellen/bedankt?[…] faalde",
    );
    expect(schoonTekst("pad /api/mijn-advies?token=x")).toBe("pad /api/mijn-advies?[…]");
  });

  it("vervangt lange tokens (testlinks) maar laat bestandsnamen van de build staan", () => {
    expect(schoonTekst("/test/Ab3dEf9hIjKlMnOpQrStUvWxYz012345")).toBe("/test/[token]");
    expect(schoonTekst("/review/" + "a1".repeat(32))).toBe("/review/[token]");
    const frame = "at Pagina (/var/task/.next/server/chunks/ssr/src_app_admin_fouten_page_tsx_1a2b3c4d._.js:12:34)";
    expect(schoonTekst(frame)).toBe(frame);
  });

  it("vervangt lange nummers en IBAN's, maar geen regel- en kolomnummers", () => {
    expect(schoonTekst("Bel 06-12345678 of +31 6 1234 5678")).toBe("Bel [nummer] of [nummer]");
    expect(schoonTekst("Rekening NL91ABNA0417164300")).toBe("Rekening [iban]");
    expect(schoonTekst("at x (file.js:123456789:12)")).toBe("at x (file.js:123456789:12)");
  });
});

describe("schoonPad en schoonDetails", () => {
  it("geeft alleen het pad, zonder query en hash", () => {
    expect(schoonPad("https://lidathiry.nl/test/abc?x=1#y")).toBe("/test/abc");
    expect(schoonPad("/admin/orders?q=anna@example.nl")).toBe("/admin/orders");
    expect(schoonPad("")).toBeNull();
    expect(schoonPad(undefined)).toBeNull();
  });

  it("schoont recursief en verbergt gevoelige sleutels", () => {
    expect(
      schoonDetails({ email: "a@b.nl", token: "abc", lijst: ["x@y.nl", 3], diep: { cookie: "sb=1", ok: true } }),
    ).toEqual({ email: "[e-mail]", token: "[verborgen]", lijst: ["[e-mail]", 3], diep: { cookie: "[verborgen]", ok: true } });
  });
});

describe("normaliseren en vingerafdruk", () => {
  it("dezelfde soort fout met andere ids, e-mails of getallen geeft dezelfde tekst", () => {
    const a = normaliseerBericht("Order 3f2504e0-4f89-11d3-9a0c-0305e82c3301 van anna@x.nl: 3 pogingen");
    const b = normaliseerBericht("Order 7c9e6679-7425-40de-944b-e07fc1f90ae7 van bob@y.com: 12 pogingen");
    expect(a).toBe(b);
    expect(a).toBe("Order <uuid> van <email>: <n> pogingen");
  });

  it("vervangt hex-ids, tokens en querystrings", () => {
    expect(normaliseerBericht("Digest deadbeef1234 bij /test/Ab3dEf9hIjKlMnOpQrStUvWxYz012345?x=1")).toBe(
      "Digest <hex> bij /test/<token>",
    );
  });

  it("neemt het bovenste eigen frame, niet uit node_modules", () => {
    const stack = [
      "TypeError: kapot",
      "    at fetch (/var/task/node_modules/@supabase/postgrest-js/dist/index.js:10:5)",
      "    at leesOrder (/var/task/.next/server/chunks/ssr/src_lib_orders_ts_9f8e7d6c._.js:42:17)",
      "    at async Pagina (/var/task/.next/server/app/page.js:1:2)",
    ].join("\n");
    expect(bovensteFrame(stack)).toBe("at leesOrder (/var/task/.next/server/chunks/ssr/src_lib_orders_ts_9f8e7d6c._.js:42:17)");
    expect(bovensteFrame("fn@https://lidathiry.nl/_next/static/chunks/abc.js:1:2")).toBe(
      "fn@https://lidathiry.nl/_next/static/chunks/abc.js:1:2",
    );
    expect(bovensteFrame(null)).toBe("");
  });

  it("frames zonder regelnummers, domein en bouw-hash (stabiel tussen deploys)", () => {
    const v1 = normaliseerFrame("at leesOrder (https://lidathiry.nl/_next/static/chunks/page-1a2b3c4d5e.js:42:17)");
    const v2 = normaliseerFrame("at leesOrder (https://preview.vercel.app/_next/static/chunks/page-9f8e7d6c5b.js:40:3)");
    expect(v1).toBe(v2);
    expect(v1).toBe("at leesOrder (/_next/static/chunks/page.js)");
  });

  it("de vingerafdruk-invoer hangt af van bron, soort melding en frame", () => {
    const stack = "Error: x\n    at a (/app/x.js:1:1)";
    expect(vingerafdrukInvoer("server", "Order 12 mislukt", stack)).toBe(vingerafdrukInvoer("server", "Order 99 mislukt", stack));
    expect(vingerafdrukInvoer("server", "Order 12 mislukt", stack)).not.toBe(vingerafdrukInvoer("browser", "Order 12 mislukt", stack));
    expect(vingerafdrukInvoer("server", "Order 12 mislukt", stack)).not.toBe(
      vingerafdrukInvoer("server", "Order 12 mislukt", "Error: x\n    at b (/app/y.js:1:1)"),
    );
  });
});

describe("ontleedFout", () => {
  it("leest Errors, tekst en objecten", () => {
    const e = new TypeError("kapot");
    expect(ontleedFout(e)).toMatchObject({ bericht: "kapot", naam: "TypeError" });
    expect(ontleedFout(new Error("x")).naam).toBeNull();
    expect(ontleedFout("los")).toEqual({ bericht: "los", stack: null, naam: null });
    expect(ontleedFout({ message: "van supabase", code: "23505" }).bericht).toBe("van supabase");
    expect(ontleedFout({ a: 1 }).bericht).toBe('{"a":1}');
    expect(ontleedFout(undefined).bericht).toBe("undefined");
  });
});

describe("browserruis", () => {
  it("negeert ResizeObserver, Script error en extensies", () => {
    expect(isBrowserRuis("ResizeObserver loop limit exceeded")).toBe(true);
    expect(isBrowserRuis("ResizeObserver loop completed with undelivered notifications.")).toBe(true);
    expect(isBrowserRuis("Script error.")).toBe(true);
    expect(isBrowserRuis("x is undefined", "at y (chrome-extension://abc/content.js:1:1)")).toBe(true);
    expect(isBrowserRuis("x", null, "moz-extension://abc/x.js")).toBe(true);
    expect(isBrowserRuis("")).toBe(true);
    expect(isBrowserRuis("TypeError: Cannot read properties of undefined (reading 'naam')")).toBe(false);
  });

  it("valideert een browsermelding", () => {
    expect(leesBrowserMelding(null)).toBeNull();
    expect(leesBrowserMelding({ bericht: "" })).toBeNull();
    expect(leesBrowserMelding({ bericht: "x", soort: "raar", stack: 3 })).toEqual({
      bericht: "x",
      stack: null,
      pad: null,
      soort: "fout",
      digest: null,
      bestand: null,
    });
    expect(leesBrowserMelding({ bericht: "x".repeat(5000), soort: "belofte" })?.bericht).toHaveLength(2000);
  });
});

describe("meldReden", () => {
  const nu = new Date("2026-10-04T12:00:00Z");
  const uurGeleden = new Date(nu.getTime() - 3600_000).toISOString();
  const tweeDagenGeleden = new Date(nu.getTime() - 48 * 3600_000).toISOString();

  it("meldt een nieuwe fout", () => {
    expect(meldReden({ aantal: 1, gemeld_op: null }, nu)).toBe("nieuw");
    expect(meldReden({ bron: "server", aantal: 1, gemeld_op: null }, nu)).toBe("nieuw");
  });

  it("browserfouten (openbaar endpoint): geen mail bij nieuw, wel bij een drempel", () => {
    expect(meldReden({ bron: "browser", aantal: 1, gemeld_op: null }, nu)).toBeNull();
    expect(meldReden({ bron: "browser", aantal: 9, gemeld_op: null }, nu)).toBeNull();
    expect(meldReden({ bron: "browser", aantal: 10, gemeld_op: null }, nu)).toBe("drempel");
  });

  it("meldt een fout die terug is na 'opgelost' (gemeld_op gewist)", () => {
    expect(meldReden({ aantal: 5, gemeld_op: null, details: { [GEMELD_BIJ]: 1 } }, nu)).toBe("terug");
  });

  it("geen dubbele mail bij twee gelijktijdige eerste meldingen", () => {
    expect(meldReden({ aantal: 2, gemeld_op: null, details: null }, nu)).toBeNull();
  });

  it("meldt drempels 10/100/1000 hooguit één keer per 24 uur", () => {
    expect(meldReden({ aantal: 10, gemeld_op: tweeDagenGeleden, details: { [GEMELD_BIJ]: 1 } }, nu)).toBe("drempel");
    expect(meldReden({ aantal: 10, gemeld_op: uurGeleden, details: { [GEMELD_BIJ]: 1 } }, nu)).toBeNull();
    // Later ingehaald: de drempel van 10 is gepasseerd sinds de vorige mail.
    expect(meldReden({ aantal: 37, gemeld_op: tweeDagenGeleden, details: { [GEMELD_BIJ]: 1 } }, nu)).toBe("drempel");
    // Al gemaild bij 10: pas weer bij 100.
    expect(meldReden({ aantal: 57, gemeld_op: tweeDagenGeleden, details: { [GEMELD_BIJ]: 10 } }, nu)).toBeNull();
    expect(meldReden({ aantal: 100, gemeld_op: tweeDagenGeleden, details: { [GEMELD_BIJ]: 10 } }, nu)).toBe("drempel");
    expect(meldReden({ aantal: 3, gemeld_op: tweeDagenGeleden, details: { [GEMELD_BIJ]: 1 } }, nu)).toBeNull();
  });

  it("drempelVan", () => {
    expect([0, 9, 10, 99, 100, 999, 1000, 50_000].map(drempelVan)).toEqual([0, 0, 10, 10, 100, 100, 1000, 1000]);
  });
});

describe("zoekTerm", () => {
  it("haalt tekens weg die een PostgREST-filter breken", () => {
    expect(zoekTerm("a,b(c)%*")).toBe("a b c");
    expect(zoekTerm(["x"])).toBe("");
    expect(zoekTerm("x".repeat(200))).toHaveLength(100);
  });
});
