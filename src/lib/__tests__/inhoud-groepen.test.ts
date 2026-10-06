import { describe, expect, it } from "vitest";
import { GROEPEN } from "../inhoud/register";
import { parseerOpmaak, type Blok, type Inline } from "../inhoud/opmaak";
import type { Sectie } from "../inhoud/schema";
import { JURIDISCH_PRIVACY, JURIDISCH_VOORWAARDEN } from "../inhoud/groepen/juridisch";

/** Alle standaardteksten van een sectie, met het soort veld erbij. */
function standaardTeksten(s: Sectie): { veld: string; soort: string; tekst: string }[] {
  return Object.entries(s.velden).flatMap(([k, v]) =>
    v.soort === "lijst"
      ? v.standaard.flatMap((item, i) =>
          Object.entries(v.velden).map(([veld, def]) => ({
            veld: `${k}[${i}].${veld}`,
            soort: def.soort,
            tekst: item[veld] ?? "",
          })),
        )
      : [{ veld: k, soort: v.soort, tekst: v.standaard }],
  );
}

function platteTekst(delen: Inline[]): string[] {
  return delen.flatMap((d) =>
    d.soort === "tekst" ? [d.tekst] : d.soort === "vet" || d.soort === "link" ? platteTekst(d.kinderen) : [],
  );
}

function inlineVan(blokken: Blok[]): Inline[][] {
  return blokken.flatMap((b) => (b.soort === "lijst" ? b.items : b.soort === "blok" || b.soort === "afbeelding" ? [] : [b.inhoud]));
}

const SECTIES = GROEPEN.flatMap((g) => g.secties.map((s) => [`${g.sleutel}: ${s.sleutel}`, s] as const));

describe("inhoud: alle groepen", () => {
  it("heeft unieke sleutels voor groepen en secties", () => {
    const groepen = GROEPEN.map((g) => g.sleutel);
    expect(new Set(groepen).size).toBe(groepen.length);
    const secties = SECTIES.map(([, s]) => s.sleutel);
    expect(new Set(secties).size).toBe(secties.length);
  });

  it.each(SECTIES)("%s gebruikt alleen gedeclareerde {variabelen}", (_, s) => {
    const gedeclareerd = new Set(Object.keys(s.variabelen ?? {}));
    for (const { veld, tekst } of standaardTeksten(s)) {
      for (const [, naam] of tekst.matchAll(/\{([a-z_]+)\}/g)) {
        expect(gedeclareerd.has(naam), `{${naam}} in ${s.sleutel}.${veld} staat niet in variabelen`).toBe(true);
      }
    }
  });

  it.each(SECTIES)("%s: opmaakvelden hebben geen kapotte links", (_, s) => {
    for (const { veld, soort, tekst } of standaardTeksten(s)) {
      if (soort !== "opmaak") continue;
      const tekstdelen = inlineVan(parseerOpmaak(tekst)).flatMap(platteTekst);
      for (const deel of tekstdelen) {
        expect(deel, `losse linkopmaak in ${s.sleutel}.${veld}`).not.toMatch(/\]\(/);
      }
    }
  });
});

describe("inhoud: juridische teksten", () => {
  it.each([
    ["voorwaarden", JURIDISCH_VOORWAARDEN, 13],
    ["privacy", JURIDISCH_PRIVACY, 12],
  ] as const)("%s parseert met koppen en het blok {bedrijfsgegevens}", (_, s, koppen) => {
    const blokken = parseerOpmaak(s.velden.tekst.standaard);
    expect(blokken.filter((b) => b.soort === "kop" && b.niveau === 2)).toHaveLength(koppen);
    expect(blokken).toContainEqual({ soort: "blok", naam: "bedrijfsgegevens" });
    expect(s.velden.bijgewerkt.standaard).toBe("[datum]");
  });

  it("privacy gebruikt de bewaartermijn en de juiste links", () => {
    const tekst = JURIDISCH_PRIVACY.velden.tekst.standaard;
    expect(tekst.match(/\{bewaartermijn_dagen\}/g)).toHaveLength(2);
    const links = inlineVan(parseerOpmaak(tekst))
      .flat()
      .flatMap((d) => (d.soort === "link" ? [d.url] : []));
    expect(links).toEqual(["https://autoriteitpersoonsgegevens.nl", "/voorwaarden"]);
  });

  it("voorwaarden linken naar de privacyverklaring", () => {
    expect(JURIDISCH_VOORWAARDEN.velden.tekst.standaard).toContain("[privacyverklaring](/privacy)");
  });
});
