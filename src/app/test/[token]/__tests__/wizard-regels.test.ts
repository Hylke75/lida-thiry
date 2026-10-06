import { describe, expect, it } from "vitest";
import { standaardWaarden } from "@/lib/inhoud/schema";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import {
  TEST_AFRONDEN,
  TEST_ALGEMEEN,
  TEST_MATEN,
  TEST_METEN,
  TEST_OVER_JOU,
  TEST_SILHOUET,
  TEST_UITSLAG,
  TEST_VRAGEN,
  maatVeldenMetTeksten,
  pasvormVragen,
  type TestTeksten,
} from "@/lib/inhoud/groepen/test";
import {
  EERSTE_MATEN_STAP,
  LEEG,
  getal,
  isBereikbaar,
  kaalLabel,
  maakPayload,
  maakStappen,
  maatFout,
  metingenKomenOvereen,
  overzichtRijen,
  schoonGetal,
  silhouetVerschilMelding,
  stapFout,
  type Antwoorden,
} from "../wizard-regels";

const teksten: TestTeksten = {
  algemeen: standaardWaarden(TEST_ALGEMEEN),
  overJou: standaardWaarden(TEST_OVER_JOU),
  maten: standaardWaarden(TEST_MATEN),
  meten: standaardWaarden(TEST_METEN),
  silhouet: standaardWaarden(TEST_SILHOUET),
  vragen: standaardWaarden(TEST_VRAGEN),
  afronden: standaardWaarden(TEST_AFRONDEN),
  uitslag: standaardWaarden(TEST_UITSLAG),
};

const maatVelden = maatVeldenMetTeksten(teksten.maten);
const vragen = pasvormVragen(teksten.vragen);
const stappen = maakStappen(teksten, maatVelden, vragen);
const veld = (s: string) => maatVelden.find((v) => v.sleutel === s)!;

const silhouetten = [
  { letter: "A", naam: "Zandloper" },
  { letter: "B", naam: "Peer" },
] as unknown as Silhouet[];

/** Volledig en geldig ingevulde test. */
function compleet(): Antwoorden {
  const maten = { borst: "92", taille: "85", hoge_heup: "90", heup: "95" };
  return {
    lengte: "170",
    gewicht: "65",
    maten,
    controle: { ...maten },
    silhouet: "A",
    pasvorm: Object.fromEntries(vragen.map((q) => [q.sleutel, q.opties[0]])),
  };
}

describe("maakStappen", () => {
  it("zet over jou, de meetstappen, silhouet, vragen en afronden achter elkaar", () => {
    expect(stappen.map((s) => s.soort)).toEqual(["jij", "maten", "maten", "maten", "silhouet", "vragen", "controle"]);
    expect(stappen[EERSTE_MATEN_STAP].soort).toBe("maten");
    expect(stappen.map((s) => s.titel).slice(1, 4)).toEqual(["Bovenlichaam", "Taille", "Heupen en benen"]);
  });
});

describe("invoerhulpjes", () => {
  it("getal geeft NaN voor lege invoer", () => {
    expect(getal("")).toBeNaN();
    expect(getal(undefined)).toBeNaN();
    expect(getal("12.5")).toBe(12.5);
  });

  it("schoonGetal maakt van een komma een punt en laat alleen cijfers over", () => {
    expect(schoonGetal("92,5")).toBe("92.5");
    expect(schoonGetal("ab 7x0 cm")).toBe("70");
  });

  it("kaalLabel haalt '(optioneel)' weg", () => {
    expect(kaalLabel("Binnenbeenlengte (optioneel)")).toBe("Binnenbeenlengte");
  });

  it("metingenKomenOvereen staat maximaal 2 cm verschil toe", () => {
    expect(metingenKomenOvereen("90", "92")).toBe(true);
    expect(metingenKomenOvereen("90", "92.5")).toBe(false);
  });
});

describe("maatFout", () => {
  it("eist verplichte maten en laat optionele leeg toe", () => {
    expect(maatFout(veld("borst"), LEEG)).toBe("Vul deze maat in.");
    expect(maatFout(veld("schouder"), LEEG)).toBeNull();
  });

  it("controleert de grenzen per soort maat", () => {
    const a = { ...LEEG, maten: { borst: "40", binnenbeen: "120" } };
    expect(maatFout(veld("borst"), a)).toBe("Deze maat ligt normaal tussen 50 en 200 cm. Meet nog eens.");
    expect(maatFout(veld("binnenbeen"), a)).toBe("Deze maat ligt normaal tussen 55 en 100 cm. Meet nog eens.");
  });

  it("vraagt om een overeenkomende controlemeting", () => {
    expect(maatFout(veld("borst"), { ...LEEG, maten: { borst: "92" } })).toBe(
      "Meet nog een keer en vul de tweede meting in.",
    );
    expect(maatFout(veld("borst"), { ...LEEG, maten: { borst: "92" }, controle: { borst: "96" } })).toBe(
      "Je twee metingen verschillen meer dan 2 cm. Meet nog een keer goed.",
    );
    expect(maatFout(veld("borst"), { ...LEEG, maten: { borst: "92" }, controle: { borst: "93" } })).toBeNull();
  });
});

describe("stapFout", () => {
  it("keurt een volledig ingevulde test goed", () => {
    const a = compleet();
    expect(stappen.map((s) => stapFout(s, a))).toEqual(stappen.map(() => null));
  });

  it("controleert lengte en gewicht", () => {
    const jij = stappen[0];
    expect(stapFout(jij, LEEG)).toBe("Vul je lengte en gewicht in.");
    expect(stapFout(jij, { ...LEEG, lengte: "1.70", gewicht: "65" })).toBe(
      "Vul je lengte in centimeters in (bijvoorbeeld 168).",
    );
    expect(stapFout(jij, { ...LEEG, lengte: "170", gewicht: "300" })).toBe(
      "Vul je gewicht in kilo's in (bijvoorbeeld 65).",
    );
  });

  it("eist een silhouet en geldige antwoorden op alle vragen", () => {
    const silhouet = stappen.find((s) => s.soort === "silhouet")!;
    const vragenStap = stappen.find((s) => s.soort === "vragen")!;
    expect(stapFout(silhouet, LEEG)).toBe("Kies het silhouet dat het meest op het jouwe lijkt.");
    const a = compleet();
    a.pasvorm[vragen[0].sleutel] = "geen bestaande optie";
    expect(stapFout(vragenStap, a)).toBe("Beantwoord alle vragen.");
  });
});

describe("isBereikbaar", () => {
  it("staat alleen eerder bereikte stappen toe waarvan alles ervoor klopt", () => {
    const a = compleet();
    expect(isBereikbaar(3, 2, stappen, a)).toBe(false);
    expect(isBereikbaar(2, 2, stappen, a)).toBe(true);
    expect(isBereikbaar(2, 6, stappen, { ...a, lengte: "" })).toBe(false);
    expect(isBereikbaar(0, 0, stappen, LEEG)).toBe(true);
  });
});

describe("maakPayload", () => {
  it("zet de antwoorden om naar getallen en stuurt alleen huidige vragen mee", () => {
    const a = compleet();
    a.pasvorm.oude_vraag = "x";
    const p = maakPayload(a, maatVelden, vragen, true);
    expect(p.lengte_cm).toBe(170);
    expect(p.gewicht_kg).toBe(65);
    expect(p.maten).toMatchObject({ borst: 92, schouder: undefined, binnenbeen: undefined });
    expect(Object.keys(p.controlemetingen).sort()).toEqual(["borst", "heup", "hoge_heup", "taille"]);
    expect(p.gekozen_silhouet).toBe("A");
    expect(p.pasvormantwoorden).not.toHaveProperty("oude_vraag");
    expect(Object.keys(p.pasvormantwoorden)).toHaveLength(vragen.length);
    expect(p.hermeting).toBe(true);
  });
});

describe("silhouetVerschilMelding", () => {
  const staart =
    " Loop je maten nog één keer na (en eventueel je silhouetkeuze) en rond daarna opnieuw af. Blijft het verschil bestaan, dan gaan we uit van je maten.";

  it("gebruikt de reden van de server als die er is", () => {
    expect(silhouetVerschilMelding(silhouetten, "A", "B", "Eigen reden.")).toBe(`Eigen reden.${staart}`);
  });

  it("noemt anders het gekozen en het berekende silhouet", () => {
    expect(silhouetVerschilMelding(silhouetten, "A", "B", undefined)).toBe(
      `Je koos Zandloper, maar je maten passen meer bij Peer.${staart}`,
    );
    expect(silhouetVerschilMelding(silhouetten, "A", "Z", null)).toBe(
      `Het silhouet dat je koos past niet helemaal bij je maten.${staart}`,
    );
  });
});

describe("overzichtRijen", () => {
  it("toont elke waarde met de stap waar je hem wijzigt", () => {
    const rijen = overzichtRijen(compleet(), stappen, maatVelden, vragen, silhouetten);
    const rij = (label: string) => rijen.find((r) => r.label === label)!;
    expect(rij("Lengte")).toEqual({ label: "Lengte", waarde: "170 cm", stap: 0 });
    expect(rij("Borstomvang")).toEqual({ label: "Borstomvang", waarde: "92 cm", stap: 1 });
    expect(rij("Binnenbeenlengte")).toEqual({ label: "Binnenbeenlengte", waarde: "—", stap: 3 });
    expect(rij("Silhouet")).toEqual({ label: "Silhouet", waarde: "Zandloper", stap: 4 });
    expect(rij(vragen[0].vraag).stap).toBe(5);
    expect(rijen).toHaveLength(2 + maatVelden.length + 1 + vragen.length);
  });
});
