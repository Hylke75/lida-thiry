import { describe, expect, it } from "vitest";
import {
  absoluteLinks,
  adviesMail,
  betaalherinneringMail,
  bonHtml,
  cadeaubonKoperMail,
  cadeaubonMail,
  mijnAdviesMail,
  type BonGegevens,
} from "../email-html";
import { standaardWaarden } from "../inhoud/schema";
import {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BETAALHERINNERING,
  EMAILS_MIJN_ADVIES,
} from "../inhoud/groepen/emails";
import { CADEAUBON_KOPERMAIL, CADEAUBON_MAIL } from "../inhoud/groepen/cadeaubon";

const algemeen = standaardWaarden(EMAILS_ALGEMEEN);
const BASIS = "https://lidathiry.nl";
const zonderOnvervuld = (html: string) => expect(html).not.toMatch(/\{[a-z_]+\}/);

const bon: BonGegevens = {
  koperNaam: "Bo <b>",
  ontvangerNaam: "Anna",
  bedragCent: 3500,
  valuta: "EUR",
  code: "CADEAU-ABCD-EFGH",
  geldigTot: "2027-10-04T21:59:59.000Z",
  boodschap: "Fijne verjaardag!\n<script>x</script>",
};

describe("absoluteLinks", () => {
  it("maakt sitelinks volledig en laat andere links staan", () => {
    expect(absoluteLinks("[a](/mijn-advies) [b](https://x.nl/y) [c](//evil.nl)", `${BASIS}/`)).toBe(
      "[a](https://lidathiry.nl/mijn-advies) [b](https://x.nl/y) [c](//evil.nl)",
    );
  });
});

describe("e-mails: cadeaubon", () => {
  it("toont de bon met bedrag, code, geldigheid en ge-escapete boodschap", () => {
    const html = bonHtml(bon, "Persoonlijke boodschap");
    expect(html).toContain("€&nbsp;35,00".replace("&nbsp;", " "));
    expect(html).toContain("CADEAU-ABCD-EFGH");
    expect(html).toContain("Geldig tot en met 4 oktober 2027");
    expect(html).toContain("Voor Anna · van Bo &lt;b&gt;");
    expect(html).toContain("Fijne verjaardag!<br>&lt;script&gt;x&lt;/script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("laat de boodschap weg als die leeg is", () => {
    expect(bonHtml({ ...bon, boodschap: "  " }, "Persoonlijke boodschap")).not.toContain("Persoonlijke boodschap");
  });

  it("mailt de ontvanger met de naam van de koper", () => {
    const mail = cadeaubonMail(standaardWaarden(CADEAUBON_MAIL), algemeen, {
      aan: "ontvanger",
      bon,
      bestelUrl: `${BASIS}/bestellen`,
      basisUrl: BASIS,
      factuurnummer: "LT-2026-0001",
    });
    expect(mail.onderwerp).toBe("Bo <b> geeft je een cadeaubon voor persoonlijk kledingadvies");
    expect(mail.html).toContain("<p>Beste Anna,</p>");
    expect(mail.html).toContain("Bo &lt;b&gt; geeft je een cadeaubon van <strong>€ 35,00</strong>");
    expect(mail.html).toContain(`href="${BASIS}/bestellen"`);
    expect(mail.html).toContain("geldig tot en met 4 oktober 2027");
    // Geen factuur naar de ontvanger.
    expect(mail.html).not.toContain("LT-2026-0001");
    zonderOnvervuld(mail.html);
  });

  it("mailt de koper met de factuurregel", () => {
    const mail = cadeaubonMail(standaardWaarden(CADEAUBON_MAIL), algemeen, {
      aan: "koper",
      bon: { ...bon, ontvangerNaam: null },
      bestelUrl: `${BASIS}/bestellen`,
      basisUrl: BASIS,
      factuurnummer: "LT-2026-0001",
    });
    expect(mail.onderwerp).toBe("Je cadeaubon voor persoonlijk kledingadvies");
    expect(mail.html).toContain("<p>Beste Bo &lt;b&gt;,</p>");
    expect(mail.html).toContain("Factuurnummer LT-2026-0001");
    zonderOnvervuld(mail.html);
  });

  it("bevestigt de koper een geplande of directe verzending", () => {
    const opts = { bon, ontvangerEmail: "anna@x.nl", basisUrl: BASIS, factuurnummer: "LT-2026-0002" };
    const t = standaardWaarden(CADEAUBON_KOPERMAIL);
    const b = standaardWaarden(CADEAUBON_MAIL);
    const gepland = cadeaubonKoperMail(t, b, algemeen, { ...opts, verzendOp: "2026-12-24" });
    expect(gepland.html).toContain("wordt op <strong>24 december 2026</strong> naar anna@x.nl gestuurd");
    expect(gepland.html).toContain("CADEAU-ABCD-EFGH");
    zonderOnvervuld(gepland.html);
    const direct = cadeaubonKoperMail(t, b, algemeen, { ...opts, verzendOp: null });
    expect(direct.html).toContain("Je cadeaubon voor Anna is zojuist naar anna@x.nl gestuurd.");
    zonderOnvervuld(direct.html);
  });
});

describe("e-mails: betaalherinnering", () => {
  it("bevat bedrag, knop en reservelink", () => {
    const link = `${BASIS}/bestellen/hervat/abc?t=1.x&y`;
    const mail = betaalherinneringMail(standaardWaarden(EMAILS_BETAALHERINNERING), algemeen, {
      naam: "Anna",
      bedragCent: 4900,
      valuta: "EUR",
      link,
      basisUrl: BASIS,
    });
    expect(mail.onderwerp).toBe("Je bestelling staat nog voor je klaar");
    expect(mail.html).toContain("je bestelling van € 49,00 alsnog af");
    expect(mail.html).toContain('href="https://lidathiry.nl/bestellen/hervat/abc?t=1.x&amp;y"');
    expect(mail.html).toContain(">Bestelling afronden</a>");
    zonderOnvervuld(mail.html);
  });
});

describe("e-mails: mijn advies", () => {
  const t = standaardWaarden(EMAILS_MIJN_ADVIES);

  it("toont adviezen en open tests met knoppen", () => {
    const mail = mijnAdviesMail(t, algemeen, {
      naam: "Anna",
      basisUrl: BASIS,
      adviezen: [{ type: "6H", afgerondOp: "2026-09-01T10:00:00Z", url: `${BASIS}/api/test/a/pdf` }],
      tests: [{ besteldOp: "2026-10-01T10:00:00Z", verlooptOp: "2026-10-31T10:00:00Z", url: `${BASIS}/test/b` }],
    });
    expect(mail.html).toContain("<p>Beste Anna,</p>");
    expect(mail.html).toContain("Type <strong>6H</strong>");
    expect(mail.html).toContain("afgerond op 1 september 2026");
    expect(mail.html).toContain(`href="${BASIS}/api/test/a/pdf"`);
    expect(mail.html).toContain(">Ga verder met de test</a>");
    expect(mail.html).toContain("link geldig t/m 31 oktober 2026");
    zonderOnvervuld(mail.html);
  });

  it("laat lege onderdelen weg en heeft een naam als terugval", () => {
    const mail = mijnAdviesMail(t, algemeen, { naam: null, basisUrl: BASIS, adviezen: [], tests: [] });
    expect(mail.html).toContain("<p>Beste klant,</p>");
    expect(mail.html).not.toContain(t.adviezen_kop);
    expect(mail.html).not.toContain(t.tests_kop);
  });
});

describe("e-mails: advies verwijst naar Mijn advies", () => {
  it("maakt de link naar /mijn-advies volledig", () => {
    const mail = adviesMail(standaardWaarden(EMAILS_ADVIES), algemeen, {
      naam: "Anna",
      sleutel: "6H",
      downloadUrl: `${BASIS}/api/test/x/pdf`,
    });
    expect(mail.html).toContain(`href="${BASIS}/mijn-advies"`);
  });
});
