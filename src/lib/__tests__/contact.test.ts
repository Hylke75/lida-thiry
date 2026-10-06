import { describe, expect, it } from "vitest";
import {
  aantalLinks,
  berichtFilterQuery,
  isSpam,
  leesBerichtFilter,
  MAX,
  paginaUitReferer,
  spamRedenen,
  valideerAntwoord,
  valideerContact,
  voorproef,
  voornaamVan,
} from "../contact/regels";
import {
  citaatTekst,
  contactAntwoordMail,
  contactBevestigingMail,
  contactMeldingMail,
  platteTekstHtml,
  zonderOpmaak,
} from "../contact/mail-html";
import { combineer, standaardWaarden } from "../inhoud/schema";
import { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import { CONTACT_ANTWOORDMAIL, CONTACT_BEVESTIGMAIL, CONTACT_FORMULIER } from "../inhoud/groepen/contact";
import { GROEPEN } from "../inhoud/register";

const ONDERWERPEN = standaardWaarden(CONTACT_FORMULIER).onderwerpen.map((o) => o.onderwerp);
const GOED = {
  naam: "  Anna   de Vries ",
  email: " Anna@Voorbeeld.NL ",
  telefoon: "06-12345678",
  onderwerp: "Bestelling",
  bericht: "Hoi Lida,\r\nIk heb een vraag over mijn bestelling.",
};

describe("contact: validatie", () => {
  it("accepteert en schoont geldige invoer", () => {
    const v = valideerContact(GOED, ONDERWERPEN);
    expect(v).toEqual({
      ok: true,
      waarde: {
        naam: "Anna de Vries",
        email: "anna@voorbeeld.nl",
        telefoon: "06-12345678",
        onderwerp: "Bestelling",
        bericht: "Hoi Lida,\nIk heb een vraag over mijn bestelling.",
      },
    });
  });

  it("telefoon is optioneel", () => {
    const v = valideerContact({ ...GOED, telefoon: "  " }, ONDERWERPEN);
    expect(v.ok && v.waarde.telefoon).toBeNull();
  });

  it("geeft per veld een foutmelding", () => {
    const v = valideerContact({ naam: "", email: "geen-mail", telefoon: "bel me", onderwerp: "", bericht: "kort" }, ONDERWERPEN);
    expect(v.ok).toBe(false);
    if (v.ok) return;
    expect(Object.keys(v.fouten).sort()).toEqual(["bericht", "email", "naam", "onderwerp", "telefoon"]);
  });

  it("onderwerp moet uit de lijst komen, behalve als die leeg is", () => {
    expect(valideerContact({ ...GOED, onderwerp: "Iets anders" }, ONDERWERPEN).ok).toBe(false);
    expect(valideerContact({ ...GOED, onderwerp: "" }, []).ok).toBe(true);
    expect(valideerContact({ ...GOED, onderwerp: "Vrij onderwerp" }, [" ", ""]).ok).toBe(true);
  });

  it("begrenst de lengtes", () => {
    expect(valideerContact({ ...GOED, bericht: "x".repeat(MAX.bericht) }, ONDERWERPEN).ok).toBe(true);
    const te = valideerContact({ ...GOED, bericht: "x".repeat(MAX.bericht + 1), naam: "n".repeat(121) }, ONDERWERPEN);
    expect(te.ok === false && Object.keys(te.fouten).sort()).toEqual(["bericht", "naam"]);
  });

  it("negeert niet-tekst-waarden", () => {
    const v = valideerContact({ naam: 5, email: ["a@b.nl"], bericht: { x: 1 } }, []);
    expect(v.ok === false && Object.keys(v.fouten).sort()).toEqual(["bericht", "email", "naam"]);
  });

  it("antwoord uit het beheer", () => {
    expect(valideerAntwoord("  ")).toEqual({ ok: false, fout: "Schrijf eerst een antwoord." });
    expect(valideerAntwoord(" Dag\r\nAnna ")).toEqual({ ok: true, tekst: "Dag\nAnna" });
    expect(valideerAntwoord("x".repeat(MAX.antwoord + 1)).ok).toBe(false);
  });
});

describe("contact: spam", () => {
  const b = (bericht: string, extra: Partial<{ naam: string; onderwerp: string }> = {}) => ({
    naam: "Anna",
    onderwerp: "",
    bericht,
    ...extra,
  });

  it("telt links", () => {
    expect(aantalLinks("zie https://a.nl en http://b.nl en www.c.nl")).toBe(3);
    expect(aantalLinks("geen links hier")).toBe(0);
  });

  it("drie of meer links is spam, één of twee niet", () => {
    expect(isSpam(b("Kijk op https://mijnwebshop.nl voor mijn jurk"))).toBe(false);
    expect(isSpam(b("https://a.nl https://b.nl https://c.nl"))).toBe(true);
  });

  it("een link in naam of onderwerp is spam", () => {
    expect(isSpam(b("Hallo daar, een vraag", { naam: "www.spam.example" }))).toBe(true);
  });

  it("herkent verdachte woorden als los woord", () => {
    expect(spamRedenen(b("We offer SEO  services and backlinks"))).toEqual([
      "verdacht woord ‘backlinks’",
      "verdacht woord ‘seo services’",
    ]);
    expect(isSpam(b("Best CASINO bonus"))).toBe(true);
    // Niet binnen een ander woord.
    expect(isSpam(b("Ik zoek een cryptografisch patroon voor mijn trui"))).toBe(false);
    expect(isSpam(b("Ik heb een vraag over de test en mijn kleurtype."))).toBe(false);
  });
});

describe("contact: herkomst en filters", () => {
  it("leest het pad alleen uit een Referer van deze site", () => {
    const hosts = ["lidathiry.nl", "localhost:3000"];
    expect(paginaUitReferer("https://lidathiry.nl/contact?x=1#f", hosts)).toBe("/contact");
    expect(paginaUitReferer("http://localhost:3000/", hosts)).toBe("/");
    expect(paginaUitReferer("https://evil.example/contact", hosts)).toBeNull();
    expect(paginaUitReferer("javascript:alert(1)", hosts)).toBeNull();
    expect(paginaUitReferer("geen url", hosts)).toBeNull();
    expect(paginaUitReferer(null, hosts)).toBeNull();
  });

  it("leest en schrijft het lijstfilter", () => {
    expect(leesBerichtFilter({})).toEqual({ weergave: "inbox", pagina: 1 });
    expect(leesBerichtFilter({ status: "spam", q: " anna ", pagina: "3" })).toEqual({ weergave: "spam", q: "anna", pagina: 3 });
    expect(leesBerichtFilter({ status: "onzin", pagina: "-1" })).toEqual({ weergave: "inbox", pagina: 1 });
    expect(berichtFilterQuery({ weergave: "inbox", pagina: 1 })).toBe("");
    expect(berichtFilterQuery({ weergave: "nieuw", q: "a b", pagina: 2 })).toBe("status=nieuw&q=a+b&pagina=2");
  });

  it("voorproef en voornaam", () => {
    expect(voorproef("a\n\nb   c")).toBe("a b c");
    expect(voorproef("x".repeat(200), 10)).toBe(`${"x".repeat(9)}…`);
    expect(voornaamVan(" Anna de Vries")).toBe("Anna");
  });
});

describe("contact: mails", () => {
  const NAAM = `Anna <b>"&"</b>`;
  const NAAM_HTML = "Anna &lt;b&gt;&quot;&amp;&quot;&lt;/b&gt;";
  const BERICHT = "Regel één\nRegel <twee>\n\nNieuwe alinea";
  const algemeen = standaardWaarden(EMAILS_ALGEMEEN);

  it("platte tekst wordt veilige HTML met alinea's en regeleinden", () => {
    expect(platteTekstHtml(BERICHT)).toBe("<p>Regel één<br>Regel &lt;twee&gt;</p>\n<p>Nieuwe alinea</p>");
    expect(citaatTekst("Je schreef:", "a\nb")).toBe("Je schreef:\n> a\n> b");
    expect(zonderOpmaak("**Vet** en [privacy](/privacy)")).toBe("Vet en privacy (/privacy)");
  });

  it("melding aan de beheerder", () => {
    const m = contactMeldingMail({
      naam: NAAM,
      email: "anna@voorbeeld.nl",
      telefoon: null,
      onderwerp: "Bestelling",
      bericht: BERICHT,
      pagina: "/contact",
      link: "https://lidathiry.nl/admin/berichten/123",
    });
    expect(m.onderwerp).toBe(`Nieuw bericht van ${NAAM}: Bestelling`);
    expect(m.html).toContain(NAAM_HTML);
    expect(m.html).not.toContain("<b>");
    expect(m.html).toContain('href="https://lidathiry.nl/admin/berichten/123"');
    expect(m.html).toContain("Regel &lt;twee&gt;");
    expect(m.html).not.toContain("Telefoon");
    expect(m.tekst).toContain("Pagina: /contact");
    expect(m.tekst).not.toMatch(/\n\n\n/);
  });

  it("ontvangstbevestiging aan de afzender: algemeen, zonder iets van de bezoeker (geen spamrelay)", () => {
    const m = contactBevestigingMail(standaardWaarden(CONTACT_BEVESTIGMAIL), algemeen);
    expect(m.onderwerp).toBe("Bedankt voor je bericht");
    expect(m.html).toContain("<p>Hallo,</p>");
    expect(m.html).not.toContain("<blockquote");
    expect(m.html).not.toMatch(/\{[a-z_]+\}/);
    expect(m.tekst).not.toContain("> ");
  });

  it("ontvangstbevestiging: oude teksten met {naam} en {onderwerp} worden algemeen ingevuld", () => {
    const t = combineer(CONTACT_BEVESTIGMAIL, {
      onderwerp: "Over {onderwerp}",
      tekst: "Beste {naam},\n\nBedankt voor {onderwerp}.",
    });
    const m = contactBevestigingMail(t, algemeen);
    expect(m.onderwerp).toBe("Over je bericht");
    expect(m.html).toContain("<p>Beste,</p>");
    expect(m.tekst).toContain("Bedankt voor je bericht.");
    expect(m.html).not.toContain(NAAM_HTML);
  });

  it("antwoordmail met aangepaste teksten", () => {
    const t = combineer(CONTACT_ANTWOORDMAIL, { onderwerp: "Antwoord: {onderwerp}" });
    const m = contactAntwoordMail(t, {
      antwoord: "Beste Anna,\n\nDank je <wel>!",
      naam: NAAM,
      onderwerp: "",
      bericht: BERICHT,
      ontvangenOp: "2026-10-04T10:00:00Z",
    });
    expect(m.onderwerp).toBe("Antwoord: je bericht");
    expect(m.html).toContain("<p>Beste Anna,</p>");
    expect(m.html).toContain("Dank je &lt;wel&gt;!");
    expect(m.html).toContain(`Op 4 oktober 2026 schreef ${NAAM_HTML}:`);
    expect(m.tekst.startsWith("Beste Anna,\n\nDank je <wel>!\n\nOp 4 oktober 2026")).toBe(true);
    expect(m.html).not.toMatch(/\{[a-z_]+\}/);
  });
});

describe("contact: teksten", () => {
  it("staat in het register direct na de website", () => {
    expect(GROEPEN.map((g) => g.sleutel).slice(0, 2)).toEqual(["website", "contact"]);
  });
});
