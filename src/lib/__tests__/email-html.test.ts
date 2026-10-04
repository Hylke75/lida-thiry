import { describe, expect, it } from "vitest";
import { adviesMail, bevestigingMail, herinneringMail } from "../email-html";
import { combineer, standaardWaarden } from "../inhoud/schema";
import {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BEVESTIGING,
  EMAILS_HERINNERING,
} from "../inhoud/groepen/emails";

const algemeen = standaardWaarden(EMAILS_ALGEMEEN);
const NAAM = `Anna <b>"&"</b>`;
const NAAM_HTML = "Anna &lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;";
const zonderOnvervuld = (html: string) => expect(html).not.toMatch(/\{[a-z_]+\}/);

describe("e-mails: bevestiging", () => {
  const mail = bevestigingMail(standaardWaarden(EMAILS_BEVESTIGING), algemeen, {
    naam: NAAM,
    link: "https://example.com/test/abc",
    geldigDagen: 30,
    overzicht: {
      prijsCent: 4500,
      kortingCent: 500,
      kortingscode: "<WELKOM>",
      totaalCent: 4000,
      valuta: "EUR",
      factuurnummer: "F-2026-001",
    },
  });

  it("vult de standaardteksten en variabelen in, met escaping", () => {
    expect(mail.onderwerp).toBe("Bedankt voor je bestelling – je kledingadviestest staat klaar");
    expect(mail.html).toContain('<h1 style="font-size:20px">Bedankt voor je bestelling!</h1>');
    expect(mail.html).toContain(`<p>Beste ${NAAM_HTML},</p>`);
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain("<p>Je kunt later verdergaan met dezelfde link; die is 30 dagen geldig.</p>");
    expect(mail.html).toContain('<p style="font-size:13px;color:#555">Bij je bestelling heb je ingestemd');
    expect(mail.html).toContain("Werkt de knop niet? Kopieer deze link:<br>https://example.com/test/abc");
    expect(mail.html).toContain(">Start de test</a>");
    expect(mail.html).toContain(">© Lida Thiry Imago &amp; Kledingadvies</p></div>");
    zonderOnvervuld(mail.html);
  });

  it("houdt het besteloverzicht en de factuurregel in de code", () => {
    expect(mail.html).toContain("Korting (&lt;WELKOM&gt;)");
    expect(mail.html).toContain("Factuurnummer F-2026-001");
    // Volgorde: tekst, overzicht, knop.
    expect(mail.html.indexOf("Wat fijn")).toBeLessThan(mail.html.indexOf("<table"));
    expect(mail.html.indexOf("<table")).toBeLessThan(mail.html.indexOf(">Start de test</a>"));
  });

  it("gebruikt aangepaste teksten", () => {
    const t = combineer(EMAILS_BEVESTIGING, {
      onderwerp: "Hoi {naam}",
      knop: "Begin <nu>",
      tekst: "**Welkom** {naam}",
    });
    const m = bevestigingMail(t, { voettekst: "Groet" }, { naam: "Bo", link: "https://x/t", geldigDagen: 7 });
    expect(m.onderwerp).toBe("Hoi Bo");
    expect(m.html).toContain("<p><strong>Welkom</strong> Bo</p>");
    expect(m.html).toContain(">Begin &lt;nu&gt;</a>");
    expect(m.html).toContain(">Groet</p></div>");
    expect(m.html).not.toContain("<table");
  });
});

describe("e-mails: herinnering", () => {
  it("zet de verloopzin met datum in de tekst", () => {
    const mail = herinneringMail(standaardWaarden(EMAILS_HERINNERING), algemeen, {
      naam: NAAM,
      link: "https://example.com/test/abc",
      verlooptOp: "2026-10-12T10:00:00Z",
    });
    expect(mail.onderwerp).toBe("Herinnering: je kledingadviestest staat nog klaar");
    expect(mail.html).toContain(`<p>Beste ${NAAM_HTML},</p>`);
    expect(mail.html).toContain(
      "je test staat gewoon voor je klaar! Je link is geldig tot en met 12 oktober 2026.</p>",
    );
    expect(mail.html).toContain("<p>Het invullen duurt ongeveer een kwartier.");
    zonderOnvervuld(mail.html);
  });

  it("laat de verloopzin weg zonder verloopdatum", () => {
    const mail = herinneringMail(standaardWaarden(EMAILS_HERINNERING), algemeen, {
      naam: "Anna",
      link: "https://example.com/test/abc",
      verlooptOp: null,
    });
    expect(mail.html).toContain("je test staat gewoon voor je klaar!</p>");
    zonderOnvervuld(mail.html);
  });
});

describe("e-mails: advies", () => {
  it("toont het type vet en de downloadknop", () => {
    const mail = adviesMail(standaardWaarden(EMAILS_ADVIES), algemeen, {
      naam: NAAM,
      sleutel: "6H",
      downloadUrl: "https://example.com/advies.pdf?token=a&b=c",
    });
    expect(mail.onderwerp).toBe("Je persoonlijke kledingadvies staat klaar");
    expect(mail.html).toContain('<h1 style="font-size:20px">Je persoonlijke kledingadvies</h1>');
    expect(mail.html).toContain(`<p>Beste ${NAAM_HTML},</p>`);
    expect(mail.html).toContain("jouw type <strong>6H</strong>. Je vindt je persoonlijke advies in de bijgevoegde PDF.</p>");
    expect(mail.html).toContain('href="https://example.com/advies.pdf?token=a&amp;b=c"');
    expect(mail.html).toContain(">Bekijk je advies (PDF)</a>");
    zonderOnvervuld(mail.html);
  });
});
