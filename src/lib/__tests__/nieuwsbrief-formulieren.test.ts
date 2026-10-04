import { describe, expect, it } from "vitest";
import {
  aanmeldOpties,
  bevestigdPercentage,
  blokCode,
  formulierTeksten,
  geldigeFormulierSlug,
  kopieSlug,
  leesFormulierSlug,
  maakSlug,
  naamLabel,
  telAanmeldingen,
  valideerFormulier,
} from "../nieuwsbrief/formulierregels";
import { beschrijfDoelgroep, normaliseerDoelgroep, valtBinnen } from "../nieuwsbrief/doelgroep";
import { formulierSlugUitBlok } from "../paginas/regels";
import { filterQuery, leesFilter } from "../nieuwsbrief/contactregels";

const ID = "3f2b8c1e-1234-4abc-9def-0123456789ab";
const ID2 = "aaaaaaaa-bbbb-4ccc-8ddd-eeeeeeeeeeee";

describe("slugs en blokcode", () => {
  it("maakt een slug van een naam", () => {
    expect(maakSlug("Zomeractie 2026!")).toBe("zomeractie-2026");
    expect(maakSlug("  Café & Crème  ")).toBe("cafe-en-creme");
    expect(maakSlug("---")).toBe("");
    expect(maakSlug("a".repeat(80)).length).toBe(60);
  });

  it("keurt slugs goed of af", () => {
    expect(geldigeFormulierSlug("zomer-actie")).toBe(true);
    expect(geldigeFormulierSlug("Zomer")).toBe(false);
    expect(geldigeFormulierSlug("zomer--actie")).toBe(false);
    expect(geldigeFormulierSlug("-zomer")).toBe(false);
    expect(geldigeFormulierSlug("bevestig")).toBe(false);
    expect(geldigeFormulierSlug("afmelden")).toBe(false);
    expect(geldigeFormulierSlug("a".repeat(61))).toBe(false);
  });

  it("vindt een vrije slug voor een kopie", () => {
    expect(kopieSlug("zomer", [])).toBe("zomer-kopie");
    expect(kopieSlug("zomer", ["zomer", "zomer-kopie", "zomer-kopie-2"])).toBe("zomer-kopie-3");
    const lang = kopieSlug("a".repeat(60), []);
    expect(geldigeFormulierSlug(lang)).toBe(true);
  });

  it("blokcode en slug uit blok zijn elkaars omgekeerde", () => {
    expect(blokCode("zomer-actie")).toBe("{nieuwsbrief_zomer_actie}");
    expect(formulierSlugUitBlok(blokCode("zomer-actie").slice(1, -1))).toBe("zomer-actie");
  });

  it("leest de formulier-slug uit een aanvraag", () => {
    expect(leesFormulierSlug(undefined)).toBeUndefined();
    expect(leesFormulierSlug("")).toBeUndefined();
    expect(leesFormulierSlug(" Zomer ")).toBe("zomer");
    expect(leesFormulierSlug("zomer actie")).toBeNull();
    expect(leesFormulierSlug(42)).toBeNull();
  });
});

describe("valideerFormulier", () => {
  const goed = {
    naam: " Zomeractie ",
    slug: "zomer",
    titel: "Doe mee",
    tekst: "Tekst",
    knop: "Ja!",
    succes_tekst: "Check je mail",
    toestemming_tekst: "",
    naam_veld: "verplicht",
    tags: "Zomer, actie,zomer",
    dubbele_opt_in: "on",
    eigen_pagina: null,
    actief: "on",
  };

  it("geeft schone waarden", () => {
    const v = valideerFormulier(goed);
    expect(v).toEqual({
      ok: true,
      waarden: {
        naam: "Zomeractie",
        slug: "zomer",
        titel: "Doe mee",
        tekst: "Tekst",
        knop: "Ja!",
        succes_tekst: "Check je mail",
        toestemming_tekst: "",
        naam_veld: "verplicht",
        tags: ["zomer", "actie"],
        dubbele_opt_in: true,
        eigen_pagina: false,
        actief: true,
      },
    });
  });

  it("meldt fouten", () => {
    const v = valideerFormulier({ ...goed, naam: "", slug: "Bevestig", knop: " ", naam_veld: "x" });
    expect(v.ok).toBe(false);
    if (!v.ok) {
      expect(v.fouten).toHaveLength(4);
      expect(v.fouten.join(" ")).toMatch(/bevestig/);
    }
    const slecht = valideerFormulier({ ...goed, slug: "zomer actie!" });
    expect(slecht.ok).toBe(false);
    const teLang = valideerFormulier({ ...goed, tekst: "x".repeat(3000) });
    expect(teLang.ok).toBe(false);
  });
});

describe("publieke teksten", () => {
  const standaard = {
    naam_label: "Voornaam (optioneel)",
    email_label: "E-mailadres",
    fout: "Mislukt",
    toestemming_tekst: "Standaard [privacy](/privacy)",
  };

  it("past het naamlabel aan", () => {
    expect(naamLabel("Voornaam (optioneel)", "verplicht")).toBe("Voornaam");
    expect(naamLabel("Voornaam (optioneel)", "optioneel")).toBe("Voornaam (optioneel)");
    expect(naamLabel("(optioneel)", "verplicht")).toBe("Voornaam");
  });

  it("valt terug op de standaard toestemmingstekst", () => {
    const f = { titel: "T", tekst: "", naam_veld: "verborgen" as const, knop: "", succes_tekst: "Top", toestemming_tekst: " " };
    expect(formulierTeksten(f, standaard)).toMatchObject({
      knop: "Aanmelden",
      toestemming: "Standaard [privacy](/privacy)",
      emailLabel: "E-mailadres",
      naamVeld: "verborgen",
    });
    expect(formulierTeksten({ ...f, toestemming_tekst: "Eigen" }, standaard).toestemming).toBe("Eigen");
  });
});

describe("aanmeldOpties (API)", () => {
  const formulier = {
    id: ID,
    naam_veld: "optioneel" as const,
    toestemming_tekst: "Ik wil de **nieuwsbrief**. Zie [privacy](/privacy).",
    dubbele_opt_in: false,
    tags: ["Zomer", "zomer", "actie"],
  };

  it("zonder formulier: precies het standaardgedrag", () => {
    expect(aanmeldOpties(null, "  Anna ", "Standaard **opmaak**")).toEqual({
      ok: true,
      opties: { naam: "Anna", toestemmingTekst: "Standaard **opmaak**", dubbeleOptIn: true, tags: [], formulierId: null },
    });
    expect(aanmeldOpties(null, "", "x")).toMatchObject({ ok: true, opties: { naam: null } });
  });

  it("met formulier: instellingen, tags en platte toestemmingstekst", () => {
    expect(aanmeldOpties(formulier, "Anna", "Standaard")).toEqual({
      ok: true,
      opties: {
        naam: "Anna",
        toestemmingTekst: "Ik wil de nieuwsbrief. Zie privacy.",
        dubbeleOptIn: false,
        tags: ["zomer", "actie"],
        formulierId: ID,
      },
    });
  });

  it("verplichte naam, verborgen naam en lege toestemming", () => {
    expect(aanmeldOpties({ ...formulier, naam_veld: "verplicht" }, "  ", "x")).toEqual({ ok: false, fout: "Vul je naam in." });
    expect(aanmeldOpties({ ...formulier, naam_veld: "verborgen" }, "Anna", "x")).toMatchObject({ ok: true, opties: { naam: null } });
    expect(aanmeldOpties({ ...formulier, toestemming_tekst: "" }, "", "Standaard [link](/p)")).toMatchObject({
      ok: true,
      opties: { toestemmingTekst: "Standaard link" },
    });
  });
});

describe("telAanmeldingen", () => {
  const nu = new Date("2026-10-04T12:00:00Z");
  it("telt totaal, recent en bevestigd per formulier", () => {
    const t = telAanmeldingen(
      [
        { formulier_id: ID, toestemming_op: "2026-10-01T10:00:00Z", aangemaakt_op: "2026-10-01T10:00:00Z", bevestigd_op: "2026-10-01T10:05:00Z" },
        { formulier_id: ID, toestemming_op: "2026-06-01T10:00:00Z", aangemaakt_op: "2026-06-01T10:00:00Z", bevestigd_op: null },
        // Opnieuw aangemeld na een oude bevestiging: nog niet opnieuw bevestigd.
        { formulier_id: ID, toestemming_op: "2026-10-02T10:00:00Z", aangemaakt_op: "2025-01-01T10:00:00Z", bevestigd_op: "2025-01-01T10:01:00Z" },
        { formulier_id: ID2, toestemming_op: null, aangemaakt_op: "2026-01-01T10:00:00Z", bevestigd_op: "2026-01-01T10:00:00Z" },
        { formulier_id: null, toestemming_op: null, aangemaakt_op: "2026-10-01T10:00:00Z", bevestigd_op: null },
      ],
      nu,
    );
    expect(t.get(ID)).toEqual({ totaal: 3, recent: 2, bevestigd: 1 });
    expect(t.get(ID2)).toEqual({ totaal: 1, recent: 0, bevestigd: 1 });
    expect(t.size).toBe(2);
    expect(bevestigdPercentage(t.get(ID))).toBe("33%");
    expect(bevestigdPercentage(undefined)).toBe("—");
  });
});

describe("doelgroep: filter op formulier", () => {
  const c = { email: "a@b.nl", status: "aangemeld", bron: "formulier", tags: [], formulier_id: ID };

  it("normaliseert formulier-ids", () => {
    expect(normaliseerDoelgroep({ formulieren: [ID, ID.toUpperCase(), "geen-uuid", 3] })).toEqual({ formulieren: [ID] });
    expect(normaliseerDoelgroep({ formulieren: [] })).toEqual({});
  });

  it("valtBinnen", () => {
    expect(valtBinnen(c, { formulieren: [ID] })).toBe(true);
    expect(valtBinnen(c, { formulieren: [ID2, ID] })).toBe(true);
    expect(valtBinnen(c, { formulieren: [ID2] })).toBe(false);
    expect(valtBinnen({ ...c, formulier_id: null }, { formulieren: [ID] })).toBe(false);
    expect(valtBinnen({ ...c, formulier_id: undefined }, {})).toBe(true);
    expect(valtBinnen({ ...c, status: "onbevestigd" }, { formulieren: [ID] })).toBe(false);
  });

  it("beschrijft de doelgroep met formulier-namen", () => {
    expect(beschrijfDoelgroep({ formulieren: [ID, ID2] }, undefined, (id) => (id === ID ? "Zomer" : "Workshop"))).toBe(
      "Aangemelde contacten: via formulier ‘Zomer’ of ‘Workshop’",
    );
    expect(beschrijfDoelgroep({ formulieren: [ID] })).toBe("Aangemelde contacten: via formulier ‘onbekend formulier’");
  });
});

describe("contactenfilter op formulier", () => {
  it("leest en schrijft het formulier-id", () => {
    expect(leesFilter({ formulier: ID })).toEqual({ pagina: 1, formulier: ID });
    expect(leesFilter({ formulier: "x" })).toEqual({ pagina: 1 });
    expect(filterQuery({ formulier: ID })).toBe(`formulier=${ID}`);
  });
});
