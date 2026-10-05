import { describe, expect, it } from "vitest";
import { analyseerImport, csvCel, maakCsv, parseerCsv, raadScheidingsteken } from "../nieuwsbrief/csv";
import {
  filterQuery,
  geldigEmail,
  handmatigeToestemming,
  leesFilter,
  likeLetterlijk,
  ontleedTags,
} from "../nieuwsbrief/contactregels";
import { nieuwsbriefBevestigingMail } from "../email-html";
import { combineer, standaardWaarden } from "../inhoud/schema";
import { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import { NIEUWSBRIEF_BEVESTIGMAIL } from "../inhoud/groepen/nieuwsbrief";

describe("csv: parseren", () => {
  it("herkent het scheidingsteken op de eerste regel", () => {
    expect(raadScheidingsteken("email;naam\na@b.nl;An")).toBe(";");
    expect(raadScheidingsteken("email,naam\na@b.nl,An")).toBe(",");
    expect(raadScheidingsteken("email\tnaam")).toBe("\t");
    expect(raadScheidingsteken('"a;b",c,d')).toBe(",");
    expect(raadScheidingsteken("email")).toBe(",");
  });

  it("verwerkt BOM, aanhalingstekens, regeleinden en lege regels", () => {
    const tekst = '﻿email;naam\r\n"a@b.nl";"de ""Vries"", An"\r\n\r\nc@d.nl;"twee\nregels"\rx@y.nl;Z';
    expect(parseerCsv(tekst)).toEqual([
      ["email", "naam"],
      ["a@b.nl", 'de "Vries", An'],
      ["c@d.nl", "twee\nregels"],
      ["x@y.nl", "Z"],
    ]);
  });

  it("houdt een lege laatste cel en een ontbrekende eindregel", () => {
    expect(parseerCsv("a,b,\nc,,d")).toEqual([
      ["a", "b", ""],
      ["c", "", "d"],
    ]);
  });
});

describe("csv: contacten importeren", () => {
  it("leest kolommen op naam uit de koprij, in elke volgorde", () => {
    const a = analyseerImport("Tags;Naam;E-mailadres\nvip|klant;Anna;Anna@Voorbeeld.NL\n;Bert;bert@voorbeeld.nl");
    expect(a.heeftKoprij).toBe(true);
    expect(a.kolommen).toEqual({ email: 2, naam: 1, tags: 0 });
    expect(a.rijen).toEqual([
      { regel: 2, email: "anna@voorbeeld.nl", naam: "Anna", tags: ["vip", "klant"] },
      { regel: 3, email: "bert@voorbeeld.nl", naam: "Bert", tags: [] },
    ]);
  });

  it("werkt zonder koprij: de eerste kolom met @ is het adres", () => {
    const a = analyseerImport("1,a@b.nl,An,x;y\n2,c@d.nl,,");
    expect(a.heeftKoprij).toBe(false);
    expect(a.rijen).toEqual([
      { regel: 1, email: "a@b.nl", naam: "An", tags: ["x", "y"] },
      { regel: 2, email: "c@d.nl", naam: null, tags: [] },
    ]);
  });

  it("telt ongeldige en dubbele adressen", () => {
    const a = analyseerImport('email,naam\na@b.nl\ngeen-adres\n\nA@B.nl\n,Piet\n"x",",\nmeer"\nc@d');
    expect(a.rijen.map((r) => r.email)).toEqual(["a@b.nl"]);
    expect(a.dubbel).toBe(1);
    // Regelnummers kloppen met het bestand, ook na lege regels en regeleinden binnen een veld.
    expect(a.ongeldig).toEqual([
      { regel: 3, waarde: "geen-adres", reden: "Geen geldig e-mailadres" },
      { regel: 6, waarde: "", reden: "Geen e-mailadres" },
      { regel: 7, waarde: "x", reden: "Geen geldig e-mailadres" },
      { regel: 9, waarde: "c@d", reden: "Geen geldig e-mailadres" },
    ]);
  });

  it("begrenst het aantal rijen", () => {
    const tekst = ["email", ...Array.from({ length: 12 }, (_, i) => `p${i}@x.nl`)].join("\n");
    const a = analyseerImport(tekst, 10);
    expect(a.teVeel).toBe(true);
    expect(a.rijen).toHaveLength(10);
    expect(analyseerImport(tekst, 12).teVeel).toBe(false);
  });

  it("geeft een lege analyse voor een leeg bestand", () => {
    const a = analyseerImport("");
    expect(a.rijen).toEqual([]);
    expect(a.ongeldig).toEqual([]);
  });
});

describe("csv: exporteren", () => {
  it("zet aanhalingstekens waar nodig en voorkomt formules", () => {
    expect(csvCel("gewoon")).toBe("gewoon");
    expect(csvCel("a;b")).toBe('"a;b"');
    expect(csvCel("a,b")).toBe("a,b");
    expect(csvCel("a,b", ",")).toBe('"a,b"');
    expect(csvCel('zeg "hoi"')).toBe('"zeg ""hoi"""');
    expect(csvCel("twee\nregels")).toBe('"twee\nregels"');
    expect(csvCel("=SOM(A1)")).toBe("'=SOM(A1)");
    expect(csvCel("@x")).toBe("'@x");
    expect(csvCel(null)).toBe("");
    expect(csvCel(3)).toBe("3");
  });

  it("maakt een bestand met BOM dat weer in te lezen is", () => {
    const csv = maakCsv([
      ["email", "naam", "tags"],
      ["a@b.nl", "de Vries; An", "x|y"],
    ]);
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("\r\n");
    const a = analyseerImport(csv);
    expect(a.rijen).toEqual([{ regel: 2, email: "a@b.nl", naam: "de Vries; An", tags: ["x", "y"] }]);
  });
});

describe("contactregels", () => {
  it("controleert e-mailadressen", () => {
    expect(geldigEmail("  An@Voorbeeld.NL ")).toBe("an@voorbeeld.nl");
    expect(geldigEmail("an@voorbeeld")).toBeNull();
    expect(geldigEmail("a b@c.nl")).toBeNull();
    expect(geldigEmail(`${"a".repeat(250)}@b.nl`)).toBeNull();
  });

  it("ontleedt tags", () => {
    expect(ontleedTags(" VIP , klant;vip| Nieuwe  klant ,,")).toEqual(["vip", "klant", "nieuwe klant"]);
    expect(ontleedTags("")).toEqual([]);
    expect(ontleedTags(Array.from({ length: 30 }, (_, i) => `t${i}`).join(","))).toHaveLength(20);
  });

  it("leest filters uit de URL en negeert onzin", () => {
    expect(leesFilter({ q: " anna ", status: "aangemeld", tag: " VIP ", bron: "import", pagina: "3" })).toEqual({
      q: "anna",
      status: "aangemeld",
      tag: "vip",
      bron: "import",
      pagina: 3,
    });
    expect(leesFilter({ status: "hack", bron: "x", pagina: "-1", tag: ["a", "b"] })).toEqual({ pagina: 1, tag: "a" });
    expect(leesFilter({ pagina: "1.5" })).toEqual({ pagina: 1 });
  });

  it("bouwt een querystring zonder lege waarden", () => {
    expect(filterQuery({ q: "a b", status: "afgemeld", pagina: 1 })).toBe("q=a+b&status=afgemeld");
    expect(filterQuery({ tag: "vip", pagina: 2 })).toBe("tag=vip&pagina=2");
    expect(filterQuery({})).toBe("");
  });

  it("maakt zoektermen veilig voor PostgREST-filters", () => {
    expect(likeLetterlijk("an_de%vries\\x")).toBe("an\\_de\\%vries\\\\x");
  });

  it("legt handmatige toestemming vast met beheerder en datum", () => {
    const op = new Date("2026-10-04T10:15:00Z");
    expect(handmatigeToestemming("toegevoegd", "lida@voorbeeld.nl", op)).toBe(
      "Handmatig toegevoegd door beheerder lida@voorbeeld.nl op 4 oktober 2026 om 12:15: toestemming bevestigd",
    );
    expect(handmatigeToestemming("geïmporteerd", "x@y.nl", op)).toMatch(/^Geïmporteerd \(CSV\) door beheerder x@y\.nl op /);
  });
});

describe("e-mails: bevestiging nieuwsbrief", () => {
  const algemeen = standaardWaarden(EMAILS_ALGEMEEN);
  const link = "https://example.com/nieuwsbrief/bevestig/abc?x=1&y=2";

  it("vult de standaardteksten in, met escaping en de link", () => {
    const mail = nieuwsbriefBevestigingMail(standaardWaarden(NIEUWSBRIEF_BEVESTIGMAIL), algemeen, {
      naam: `Anna <b>`,
      link,
    });
    expect(mail.onderwerp).toBe("Bevestig je aanmelding voor de nieuwsbrief");
    expect(mail.html).toContain('<h1 style="font-size:20px">Nog één klik…</h1>');
    expect(mail.html).toContain("<p>Hoi Anna &lt;b&gt;,</p>");
    expect(mail.html).not.toContain("<b>");
    expect(mail.html).toContain('href="https://example.com/nieuwsbrief/bevestig/abc?x=1&amp;y=2"');
    expect(mail.html).toContain(">Ja, ik meld me aan</a>");
    expect(mail.html).toContain("Heb je je niet aangemeld?");
    expect(mail.html).toContain("Werkt de knop niet? Kopieer deze link:<br>https://example.com/nieuwsbrief/bevestig/abc?x=1&amp;y=2");
    expect(mail.html).not.toMatch(/\{[a-z_]+\}/);
  });

  it("gebruikt ‘daar’ zonder naam en aangepaste teksten", () => {
    const t = combineer(NIEUWSBRIEF_BEVESTIGMAIL, { onderwerp: "Welkom {naam}!", kop: "Hé {naam}" });
    expect(nieuwsbriefBevestigingMail(t, algemeen, { naam: "  ", link }).onderwerp).toBe("Welkom daar!");
    expect(nieuwsbriefBevestigingMail(t, algemeen, { naam: null, link }).html).toContain(">Hé daar</h1>");
    expect(nieuwsbriefBevestigingMail(t, algemeen, { naam: "Bo", link }).onderwerp).toBe("Welkom Bo!");
  });
});
