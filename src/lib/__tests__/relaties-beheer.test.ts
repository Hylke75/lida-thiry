import { describe, expect, it } from "vitest";
import type { Relatie } from "../relaties/regels";
import {
  achternaamSleutel,
  filterRelaties,
  kenmerken,
  leesRelatieFilter,
  normaliseerZoektekst,
  pastBijZoekterm,
  relatieFilterQuery,
  sorteerRelaties,
  telefoonCijfers,
  telRelaties,
  tagsInGebruik,
  type Koppelingen,
} from "../relaties/zoeken";
import { naamSleutel, planSamenvoeging, standaardKeuzes, vindDubbelen, voegNotitieToe } from "../relaties/dubbel";
import { analyseerRelatieImport, exportRijen, herkenKolommen, ontsnapCel, planImport } from "../relaties/csv";
import { controleerRelatieInvoer, leesDatum } from "../relaties/formulier";
import { bouwTijdlijn } from "../relaties/tijdlijn";
import { maakCsv } from "../nieuwsbrief/csv";

let teller = 0;
function relatie(r: Partial<Relatie> = {}): Relatie {
  teller++;
  return {
    id: `00000000-0000-4000-8000-${String(teller).padStart(12, "0")}`,
    email: null,
    voornaam: null,
    achternaam: null,
    telefoon: null,
    bedrijf: null,
    straat: null,
    postcode: null,
    plaats: null,
    land: "Nederland",
    geboortedatum: null,
    notities: "",
    tags: [],
    bron: "handmatig",
    aangemaakt_op: `2026-01-${String((teller % 28) + 1).padStart(2, "0")}T10:00:00+00:00`,
    bijgewerkt_op: "2026-02-01T10:00:00+00:00",
    ...r,
  };
}

const koppelingen = (k: Partial<Record<keyof Koppelingen, string[]>> = {}): Koppelingen => ({
  klant: new Set(k.klant ?? []),
  nieuwsbrief: new Set(k.nieuwsbrief ?? []),
  berichtEmails: new Set(k.berichtEmails ?? []),
  berichtRelaties: new Set(k.berichtRelaties ?? []),
});

describe("relaties: zoeken", () => {
  it("normaliseert zoektekst en telefoonnummers", () => {
    expect(normaliseerZoektekst("  José   MÜLLER ")).toBe("jose muller");
    expect(telefoonCijfers("+31 (0)6-1234 5678")).toBe("0612345678");
    expect(telefoonCijfers("0031 6 12345678")).toBe("0612345678");
    expect(telefoonCijfers("06 12 34 56 78")).toBe("0612345678");
    expect(telefoonCijfers(null)).toBe("");
  });

  it("negeert tussenvoegsels bij het sorteren op achternaam", () => {
    expect(achternaamSleutel("van der Berg")).toBe("berg");
    expect(achternaamSleutel("de Vries")).toBe("vries");
    expect(achternaamSleutel("Van")).toBe("van");
  });

  it("zoekt op naam, e-mail, plaats, bedrijf en telefoon", () => {
    const r = relatie({ voornaam: "Anna", achternaam: "de Vries", email: "anna@x.nl", plaats: "Zwolle", bedrijf: "Stijl BV", telefoon: "+31 6 12345678", postcode: "8011 AB" });
    expect(pastBijZoekterm(r, "anna vries")).toBe(true);
    expect(pastBijZoekterm(r, "ANNA@x")).toBe(true);
    expect(pastBijZoekterm(r, "zwolle")).toBe(true);
    expect(pastBijZoekterm(r, "stijl")).toBe(true);
    expect(pastBijZoekterm(r, "0612345678")).toBe(true);
    expect(pastBijZoekterm(r, "06-1234")).toBe(true);
    expect(pastBijZoekterm(r, "8011ab")).toBe(true);
    expect(pastBijZoekterm(r, "anna jansen")).toBe(false);
    expect(pastBijZoekterm(relatie({ voornaam: "Zoë" }), "zoe")).toBe(true);
  });

  it("leest en schrijft het filter uit de URL", () => {
    const f = leesRelatieFilter({ q: " anna ", tag: "VIP", bron: "x", klant: "ja", nieuwsbrief: "misschien", sort: "plaats", pagina: "3" });
    expect(f).toEqual({ q: "anna", tag: "vip", klant: "ja", sort: "plaats", pagina: 3 });
    expect(relatieFilterQuery(f)).toBe("q=anna&tag=vip&klant=ja&sort=plaats&pagina=3");
    expect(relatieFilterQuery({ sort: "naam", pagina: 1 })).toBe("");
  });

  it("filtert op koppelingen, tag en bron en telt", () => {
    const a = relatie({ email: "a@x.nl", tags: ["vip"], bron: "bestelling" });
    const b = relatie({ email: "b@x.nl" });
    const c = relatie({});
    const k = koppelingen({ klant: ["a@x.nl"], nieuwsbrief: ["a@x.nl", "b@x.nl"], berichtRelaties: [c.id] });
    expect(kenmerken(c, k)).toEqual({ klant: false, nieuwsbrief: false, bericht: true });
    expect(filterRelaties([a, b, c], { klant: "ja" }, k)).toEqual([a]);
    expect(filterRelaties([a, b, c], { klant: "nee", nieuwsbrief: "ja" }, k)).toEqual([b]);
    expect(filterRelaties([a, b, c], { bericht: "ja" }, k)).toEqual([c]);
    expect(filterRelaties([a, b, c], { tag: "vip", bron: "bestelling" }, k)).toEqual([a]);
    expect(telRelaties([a, b, c], k)).toEqual({ totaal: 3, klant: 1, nieuwsbrief: 2, bericht: 1 });
    expect(tagsInGebruik([{ tags: ["b", "a"] }, { tags: ["a"] }])).toEqual(["a", "b"]);
  });

  it("sorteert op naam, plaats en nieuwste", () => {
    const berg = relatie({ voornaam: "Piet", achternaam: "van den Berg", plaats: "Utrecht", aangemaakt_op: "2026-03-01T00:00:00Z" });
    const aa = relatie({ voornaam: "Ans", achternaam: "Aalders", plaats: "Zwolle", aangemaakt_op: "2026-01-01T00:00:00Z" });
    const leeg = relatie({ email: "z@x.nl", aangemaakt_op: "2026-02-01T00:00:00.5Z" });
    expect(sorteerRelaties([leeg, berg, aa]).map((r) => r.id)).toEqual([aa.id, berg.id, leeg.id]);
    expect(sorteerRelaties([leeg, aa, berg], "plaats").map((r) => r.id)).toEqual([berg.id, aa.id, leeg.id]);
    expect(sorteerRelaties([aa, leeg, berg], "nieuwste").map((r) => r.id)).toEqual([berg.id, leeg.id, aa.id]);
  });
});

describe("relaties: dubbelen", () => {
  it("vindt dubbelen op naam + postcode, telefoon en naam met ander e-mailadres", () => {
    const a = relatie({ voornaam: "Anna", achternaam: "de Vries", email: "anna@x.nl", postcode: "1234 AB", aangemaakt_op: "2026-01-01T00:00:00Z" });
    const b = relatie({ voornaam: "anna", achternaam: "De Vriés", email: "anna@y.nl", postcode: "1234ab", aangemaakt_op: "2026-01-02T00:00:00Z" });
    const c = relatie({ voornaam: "Kees", achternaam: "Jansen", telefoon: "06 1234 5678", aangemaakt_op: "2026-01-03T00:00:00Z" });
    const d = relatie({ voornaam: "K.", achternaam: "Jansen", telefoon: "+31612345678", aangemaakt_op: "2026-01-04T00:00:00Z" });
    const e = relatie({ voornaam: "Anna", email: "anna@z.nl" }); // alleen voornaam: geen naamsleutel
    const paren = vindDubbelen([b, d, a, c, e]);
    expect(paren).toHaveLength(2);
    expect(paren[0].a.id).toBe(a.id);
    expect(paren[0].b.id).toBe(b.id);
    expect(paren[0].redenen.sort()).toEqual(["naam_ander_email", "naam_postcode"]);
    expect(paren[1].redenen).toEqual(["telefoon"]);
    expect(naamSleutel(e)).toBe("");
  });

  it("slaat korte telefoonnummers en zelfde naam zonder e-mail over", () => {
    const a = relatie({ voornaam: "Jan", achternaam: "Smit", telefoon: "112" });
    const b = relatie({ voornaam: "Jan", achternaam: "Smit", telefoon: "112", email: "jan@x.nl" });
    expect(vindDubbelen([a, b])).toEqual([]);
  });

  it("plant het samenvoegen", () => {
    const blijft = relatie({ voornaam: "Anna", achternaam: null, email: "anna@x.nl", plaats: "Zwolle", tags: ["vip"], notities: "[1 jan] oud", aangemaakt_op: "2026-02-01T00:00:00Z" });
    const weg = relatie({ voornaam: "Ans", achternaam: "de Vries", email: "ans@y.nl", plaats: "Kampen", tags: ["vip", "klant"], notities: "andere", aangemaakt_op: "2026-01-01T00:00:00Z", land: "België" });
    expect(standaardKeuzes(blijft, weg).achternaam).toBe("weg");
    expect(standaardKeuzes(blijft, weg).plaats).toBe("blijft");
    const plan = planSamenvoeging(blijft, weg, { email: "weg", land: "weg" }, "4 okt 2026");
    expect(plan.blijftId).toBe(blijft.id);
    expect(plan.wegId).toBe(weg.id);
    expect(plan.emailOvernemen).toBe(true);
    expect(plan.wijziging).toEqual({
      tags: ["vip", "klant"],
      notities: "[4 okt 2026] Samengevoegd met Ans de Vries <ans@y.nl>.\n\n[1 jan] oud\n\nandere",
      aangemaakt_op: "2026-01-01T00:00:00Z",
      achternaam: "de Vries",
      email: "ans@y.nl",
      land: "België",
    });
    expect(planSamenvoeging(blijft, weg, {}, "x").emailOvernemen).toBe(false);
  });

  it("zet een notitie met datum bovenaan", () => {
    expect(voegNotitieToe("oud", " nieuw ", "4 okt 2026 10:00", "lida@x.nl")).toBe("[4 okt 2026 10:00 · lida@x.nl]\nnieuw\n\noud");
    expect(voegNotitieToe("", "eerste", "4 okt")).toBe("[4 okt]\neerste");
    expect(voegNotitieToe("oud", "  ", "4 okt")).toBe("oud");
  });
});

describe("relaties: CSV", () => {
  it("herkent kolommen en maakt de formulebescherming ongedaan", () => {
    expect(herkenKolommen(["E-mail", "Voornaam", "Achternaam", "Telefoonnummer", "Woonplaats", "Adres", "Huisnummer", "Tags"])).toEqual({
      email: 0,
      voornaam: 1,
      achternaam: 2,
      telefoon: 3,
      plaats: 4,
      straat: 5,
      huisnummer: 6,
      tags: 7,
    });
    expect(ontsnapCel("'+31 6 123")).toBe("+31 6 123");
    expect(ontsnapCel("'gewoon")).toBe("'gewoon");
  });

  it("leest relaties, splitst de naam en telt ongeldig en dubbel", () => {
    const csv = [
      "naam;email;telefoon;straat;huisnummer;postcode;plaats;tags",
      "Anna de Vries;ANNA@x.nl;06 123;Dorpsstraat;1;1234ab;Zwolle;vip|klant",
      "Kees;geen-mail;;;;;;",
      "Anna;anna@x.nl;;;;;;",
      ";;;;;;;",
      "Piet Jansen;piet@x.nl;;;;;;",
    ].join("\n");
    const a = analyseerRelatieImport(csv);
    expect(a.geenKoprij).toBe(false);
    expect(a.rijen).toHaveLength(2);
    expect(a.rijen[0]).toEqual({
      regel: 2,
      gegevens: { email: "anna@x.nl", voornaam: "Anna", achternaam: "de Vries", telefoon: "06 123", straat: "Dorpsstraat 1", postcode: "1234 AB", plaats: "Zwolle" },
      tags: ["vip", "klant"],
    });
    expect(a.ongeldig).toEqual([{ regel: 3, waarde: "geen-mail", reden: "Geen geldig e-mailadres" }]);
    expect(a.dubbel).toBe(1);
  });

  it("geeft voornaam/achternaam voorrang boven naam en eist een koprij", () => {
    const a = analyseerRelatieImport("voornaam,achternaam,naam,email\nAns,Smit,Iemand Anders,ans@x.nl\n");
    expect(a.rijen[0].gegevens).toMatchObject({ voornaam: "Ans", achternaam: "Smit" });
    expect(analyseerRelatieImport("anna@x.nl;Anna\n").geenKoprij).toBe(true);
  });

  it("begrenst het aantal rijen", () => {
    const csv = ["email", "a@x.nl", "b@x.nl", "c@x.nl"].join("\n");
    const a = analyseerRelatieImport(csv, 2);
    expect(a.teVeel).toBe(true);
    expect(a.rijen).toHaveLength(2);
  });

  it("plant een import: alleen lege velden aanvullen", () => {
    const bestaand = new Map([["a@x.nl", { id: "1", tags: ["vip"], voornaam: "Anna", plaats: null }], ["b@x.nl", { id: "2", tags: ["beurs"], voornaam: "Bea" }]]);
    const plan = planImport(
      [
        { gegevens: { email: "a@x.nl", voornaam: "Ans", plaats: "Zwolle" }, tags: [] },
        { gegevens: { email: "b@x.nl", voornaam: "B" }, tags: [] },
        { gegevens: { email: "c@x.nl", voornaam: "Cor" }, tags: ["x"] },
      ],
      bestaand,
      "Beurs",
    );
    expect(plan.nieuw).toEqual([{ gegevens: { email: "c@x.nl", voornaam: "Cor" }, tags: ["x", "beurs"] }]);
    expect(plan.bijwerken).toEqual([{ id: "1", email: "a@x.nl", wijziging: { plaats: "Zwolle", tags: ["vip", "beurs"] } }]);
    expect(plan.ongewijzigd).toBe(1);
  });

  it("exporteert veilig en weer importeerbaar", () => {
    const r = relatie({ voornaam: "=SOM(1)", email: "a@x.nl", telefoon: "+31 6 1", tags: ["a", "b"] });
    const rijen = exportRijen([r], koppelingen({ klant: ["a@x.nl"] }));
    const csv = maakCsv(rijen);
    expect(csv).toContain("'=SOM(1)");
    expect(csv).toContain("'+31 6 1");
    const terug = analyseerRelatieImport(csv);
    expect(terug.rijen[0].gegevens).toMatchObject({ voornaam: "=SOM(1)", telefoon: "+31 6 1", email: "a@x.nl" });
    expect(terug.rijen[0].tags).toEqual(["a", "b"]);
    expect(rijen[1][12]).toBe("ja");
  });
});

describe("relaties: formulier", () => {
  it("leest datums", () => {
    expect(leesDatum("1981-02-29")).toBeNull();
    expect(leesDatum("1984-02-29")).toBe("1984-02-29");
    expect(leesDatum("4-10-1990")).toBe("1990-10-04");
    expect(leesDatum("31/04/1990")).toBeNull();
  });

  it("controleert en schoont de invoer", () => {
    const { invoer, fouten } = controleerRelatieInvoer(
      { email: " Anna@X.nl ", voornaam: "Anna", postcode: "1234ab", land: "", tags: "VIP, beurs", notities: "a\r\nb", geboortedatum: "1990-01-01" },
      "2026-10-04",
    );
    expect(fouten).toEqual({});
    expect(invoer).toMatchObject({ email: "anna@x.nl", postcode: "1234 AB", land: "Nederland", tags: ["vip", "beurs"], notities: "a\nb", achternaam: null, geboortedatum: "1990-01-01" });
    expect(controleerRelatieInvoer({ email: "fout", geboortedatum: "2030-01-01" }, "2026-10-04").fouten).toEqual({
      email: "Dit is geen geldig e-mailadres.",
      geboortedatum: "Vul een geldige geboortedatum in.",
      naam: "Vul minstens een naam, bedrijf of e-mailadres in.",
    });
  });
});

describe("relaties: tijdlijn", () => {
  it("combineert alles, nieuwste eerst", () => {
    const items = bouwTijdlijn({
      relatie: { aangemaakt_op: "2026-01-01T00:00:00Z", bijgewerkt_op: "2026-01-01T00:00:10Z", bronLabel: "Bestelling" },
      bestellingen: [
        { id: "o1", status: "advies_verzonden", bedrag_cent: 4900, toegekend_type: "12A", aangemaakt_op: "2026-01-02T00:00:00Z", betaald_op: "2026-01-02T00:01:00Z", afgerond_op: "2026-01-03T00:00:00Z" },
      ],
      nieuwsbrief: { id: "n1", status: "afgemeld", aangemaakt_op: "2026-01-04T00:00:00Z", bevestigd_op: null, afgemeld_op: "2026-01-06T00:00:00Z" },
      verzendingen: [
        { id: "v1", status: "verzonden", verzonden_op: "2026-01-05T00:00:00Z", aangemaakt_op: "2026-01-05T00:00:00Z", geopend_op: "2026-01-05T01:00:00Z", aantal_geopend: 2, geklikt_op: null, aantal_kliks: 0, campagne: { id: "c", naam: "Januari" } },
        { id: "v2", status: "mislukt", verzonden_op: null, aangemaakt_op: "2026-01-05T00:00:00Z", geopend_op: null, aantal_geopend: 0, geklikt_op: null, aantal_kliks: 0, campagne: null },
      ],
      berichten: [{ id: "b1", onderwerp: "", status: "beantwoord", aangemaakt_op: "2026-01-07T00:00:00Z" }],
      antwoorden: [{ id: "a1", bericht_id: "b1", verzonden_op: "2026-01-08T00:00:00Z" }],
      labels: {
        orderStatus: (s) => s,
        bedrag: (c) => `€ ${c / 100}`,
        figuurtype: (s) => s,
        nieuwsbriefStatus: (s) => s,
        berichtStatus: (s) => s,
      },
    });
    expect(items.map((i) => i.sleutel)).toEqual([
      "antwoord-a1",
      "bericht-b1",
      "nb-afgemeld",
      "mail-v1",
      "nb-aangemeld",
      "order-afgerond-o1",
      "order-o1",
      "relatie-aangemaakt",
    ]);
    expect(items[1]).toMatchObject({ titel: "Bericht: (geen onderwerp)", link: "/admin/berichten/b1" });
    expect(items[3].details).toEqual(["geopend (2×)", "niet geklikt"]);
    expect(items[6]).toMatchObject({ link: "/admin/order/o1", details: ["advies_verzonden", "€ 49", "Figuurtype 12A", "betaald 2026-01-02"] });
  });
});
