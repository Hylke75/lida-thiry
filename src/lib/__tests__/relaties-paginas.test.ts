import { describe, expect, it } from "vitest";
import { aanvulling, normaliseerPostcode, schoonGegevens, splitsNaam, volledigeNaam } from "../relaties/regels";
import { blokkenInTekst, blokVoorFormulier, formulierSlugUitBlok, geldigePaginaSlug, onbekendeBlokken } from "../paginas/regels";

describe("relaties: regels", () => {
  it("splitst namen en voegt ze samen", () => {
    expect(splitsNaam(" Anna  de Vries ")).toEqual({ voornaam: "Anna", achternaam: "de Vries" });
    expect(splitsNaam("Anna")).toEqual({ voornaam: "Anna", achternaam: null });
    expect(splitsNaam("")).toEqual({ voornaam: null, achternaam: null });
    expect(volledigeNaam({ voornaam: "Anna", achternaam: null })).toBe("Anna");
  });

  it("schoont invoer op", () => {
    expect(normaliseerPostcode("1234ab")).toBe("1234 AB");
    expect(normaliseerPostcode("B-1000")).toBe("B-1000");
    expect(schoonGegevens({ email: " ANNA@X.NL ", voornaam: " ", postcode: "1234 ab", telefoon: 5 })).toEqual({
      email: "anna@x.nl",
      postcode: "1234 AB",
    });
    expect(schoonGegevens({ email: "geen-mail" }).email).toBeUndefined();
  });

  it("vult alleen lege velden aan", () => {
    expect(aanvulling({ voornaam: "Anna", plaats: null }, { voornaam: "Ans", plaats: "Utrecht", email: "a@b.nl" })).toEqual({ plaats: "Utrecht" });
  });
});

describe("paginas: regels", () => {
  it("weigert vaste routes als slug", () => {
    expect(geldigePaginaSlug("over-mij")).toBe(true);
    expect(geldigePaginaSlug("blog")).toBe(false);
    expect(geldigePaginaSlug("Over Mij")).toBe(false);
  });

  it("vindt blokken en formulieren", () => {
    const tekst = "Intro\n{contactformulier}\n {nieuwsbrief_zomer_actie} \n{onzin}\nTekst {inline}";
    expect(blokkenInTekst(tekst)).toEqual(["contactformulier", "nieuwsbrief_zomer_actie", "onzin"]);
    expect(formulierSlugUitBlok("nieuwsbrief_zomer_actie")).toBe("zomer-actie");
    expect(blokVoorFormulier("zomer-actie")).toBe("nieuwsbrief_zomer_actie");
    expect(onbekendeBlokken(tekst, ["zomer-actie"])).toEqual(["onzin"]);
  });
});
