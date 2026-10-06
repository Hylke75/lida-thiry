import { describe, expect, it } from "vitest";
import { compacteer, heeftVerschil, regelDiff, splitsRegels, telVerschil, vergelijkReeksen, woordDiff } from "../versies/diff";
import {
  beslisVersie,
  blogAlsTekst,
  isVersieSoort,
  omschrijvingVoor,
  paginaAlsTekst,
  paginaSnapshot,
  SAMENVOEG_MS,
  stabielJson,
  tekstAlsTekst,
  tekstSnapshot,
} from "../versies/regels";
import { sectie } from "../inhoud/schema";
import type { Pagina } from "../paginas/beheer";

describe("diff", () => {
  it("splitst regels en normaliseert regeleinden", () => {
    expect(splitsRegels("")).toEqual([]);
    expect(splitsRegels("a\r\nb\rc")).toEqual(["a", "b", "c"]);
  });

  it("vindt de langste gemeenschappelijke deelreeks", () => {
    const s = vergelijkReeksen(["a", "b", "c", "d"], ["a", "x", "c", "d", "e"]);
    expect(s.map((x) => `${x.soort[0]}${x.waarde}`)).toEqual(["ga", "wb", "ex", "gc", "gd", "ee"]);
  });

  it("gelijke teksten hebben geen verschil", () => {
    const r = regelDiff("een\ntwee", "een\ntwee");
    expect(heeftVerschil(r)).toBe(false);
    expect(r).toHaveLength(2);
  });

  it("toegevoegde en verwijderde regels", () => {
    const r = regelDiff("een\ntwee\ndrie", "een\ndrie\nvier");
    expect(r.map((x) => [x.soort, x.tekst])).toEqual([
      ["gelijk", "een"],
      ["weg", "twee"],
      ["gelijk", "drie"],
      ["erbij", "vier"],
    ]);
    expect(telVerschil(r)).toEqual({ erbij: 1, weg: 1 });
  });

  it("alles nieuw of alles weg", () => {
    expect(regelDiff("", "a\nb").map((x) => x.soort)).toEqual(["erbij", "erbij"]);
    expect(regelDiff("a\nb", "").map((x) => x.soort)).toEqual(["weg", "weg"]);
  });

  it("markeert gewijzigde woorden binnen een gewijzigde regel", () => {
    const r = regelDiff("Ik draag graag rood.", "Ik draag graag blauw.");
    expect(r.map((x) => x.soort)).toEqual(["weg", "erbij"]);
    expect(r[0].delen).toEqual([
      { tekst: "Ik draag graag ", gewijzigd: false },
      { tekst: "rood.", gewijzigd: true },
    ]);
    expect(r[1].delen?.filter((d) => d.gewijzigd).map((d) => d.tekst)).toEqual(["blauw."]);
    // Samengevoegd geeft de delen de oorspronkelijke regel terug.
    expect(r[1].delen?.map((d) => d.tekst).join("")).toBe("Ik draag graag blauw.");
  });

  it("geen woordmarkering als de regels niets gemeen hebben", () => {
    const r = regelDiff("appel peer", "kiwi banaan");
    expect(r.every((x) => !x.delen)).toBe(true);
  });

  it("woordDiff markeert witruimte niet", () => {
    const w = woordDiff("a b", "a  b");
    expect(w.nieuw.every((d) => !d.gewijzigd)).toBe(true);
  });

  it("klapt ongewijzigde stukken in", () => {
    const oud = Array.from({ length: 20 }, (_, i) => `regel ${i}`).join("\n");
    const nieuw = oud.replace("regel 10", "regel tien");
    const c = compacteer(regelDiff(oud, nieuw), 2);
    expect(c[0]).toEqual({ soort: "overslag", aantal: 8 });
    expect(c[c.length - 1]).toEqual({ soort: "overslag", aantal: 7 });
    expect(c.filter((x) => x.soort !== "overslag")).toHaveLength(6);
  });

  it("blijft werken bij grote teksten", () => {
    const oud = Array.from({ length: 3000 }, (_, i) => `r${i}`).join("\n");
    const nieuw = Array.from({ length: 3000 }, (_, i) => `s${i}`).join("\n");
    expect(telVerschil(regelDiff(oud, nieuw))).toEqual({ erbij: 3000, weg: 3000 });
  });
});

describe("stabielJson", () => {
  it("is onafhankelijk van de volgorde van sleutels", () => {
    expect(stabielJson({ b: 1, a: { d: [1, { y: 2, x: 1 }], c: null } })).toBe(stabielJson({ a: { c: null, d: [1, { x: 1, y: 2 }] }, b: 1 }));
  });
  it("negeert undefined-velden maar niet null", () => {
    expect(stabielJson({ a: 1, b: undefined })).toBe(stabielJson({ a: 1 }));
    expect(stabielJson({ a: 1, b: null })).not.toBe(stabielJson({ a: 1 }));
    expect(stabielJson(undefined)).toBe("null");
  });
  it("arrays blijven op volgorde", () => {
    expect(stabielJson([1, 2])).not.toBe(stabielJson([2, 1]));
  });
});

describe("beslisVersie", () => {
  const nu = new Date("2026-10-04T12:00:00Z");
  const geleden = (ms: number) => new Date(nu.getTime() - ms).toISOString();

  it("voegt de eerste versie altijd toe", () => {
    expect(beslisVersie(null, { inhoud: { a: 1 }, door: "x@y.nl" }, nu)).toBe("toevoegen");
  });

  it("slaat gelijke inhoud over (ook met andere sleutelvolgorde)", () => {
    const laatste = { inhoud: { a: 1, b: 2 }, gemaakt_door: "x@y.nl", op: geleden(60 * 60_000) };
    expect(beslisVersie(laatste, { inhoud: { b: 2, a: 1 }, door: "ander@y.nl" }, nu)).toBe("overslaan-gelijk");
    expect(beslisVersie(laatste, { inhoud: { b: 2, a: 1 }, door: "ander@y.nl" }, nu, true)).toBe("overslaan-gelijk");
  });

  it("voegt snel opslaan door dezelfde persoon samen", () => {
    const laatste = { inhoud: { a: 1 }, gemaakt_door: "x@y.nl", op: geleden(2 * 60_000) };
    expect(beslisVersie(laatste, { inhoud: { a: 2 }, door: "x@y.nl" }, nu)).toBe("overslaan-samenvoegen");
  });

  it("maakt wel een versie na 5 minuten, voor een ander, of bij forceren", () => {
    const recent = { inhoud: { a: 1 }, gemaakt_door: "x@y.nl", op: geleden(2 * 60_000) };
    expect(beslisVersie({ ...recent, op: geleden(SAMENVOEG_MS) }, { inhoud: { a: 2 }, door: "x@y.nl" }, nu)).toBe("toevoegen");
    expect(beslisVersie(recent, { inhoud: { a: 2 }, door: "ander@y.nl" }, nu)).toBe("toevoegen");
    expect(beslisVersie(recent, { inhoud: { a: 2 }, door: "x@y.nl" }, nu, true)).toBe("toevoegen");
  });

  it("zonder bekende persoon wordt niet samengevoegd", () => {
    const laatste = { inhoud: { a: 1 }, gemaakt_door: null, op: geleden(60_000) };
    expect(beslisVersie(laatste, { inhoud: { a: 2 }, door: null }, nu)).toBe("toevoegen");
  });

  it("een versie uit de toekomst (klokverschil) wordt niet samengevoegd", () => {
    const laatste = { inhoud: { a: 1 }, gemaakt_door: "x@y.nl", op: new Date(nu.getTime() + 60_000).toISOString() };
    expect(beslisVersie(laatste, { inhoud: { a: 2 }, door: "x@y.nl" }, nu)).toBe("toevoegen");
  });
});

describe("momentopnames", () => {
  const pagina: Pagina = {
    id: "00000000-0000-4000-8000-000000000001",
    slug: "over-mij",
    titel: "Over mij",
    intro: "Hallo",
    inhoud: "## Kop\n\nTekst",
    omslag_url: null,
    omslag_alt: "",
    status: "gepubliceerd",
    in_menu: true,
    in_footer: false,
    menu_label: "",
    volgorde: 10,
    seo_titel: "",
    seo_omschrijving: "",
    niet_indexeren: false,
    aangemaakt_op: "2026-01-01T00:00:00Z",
    bijgewerkt_op: "2026-01-02T00:00:00Z",
  };

  it("laat id en tijdstempels weg, zodat alleen echte wijzigingen tellen", () => {
    const a = paginaSnapshot(pagina);
    const b = paginaSnapshot({ ...pagina, bijgewerkt_op: "2026-02-02T00:00:00Z" });
    expect(a).not.toHaveProperty("id");
    expect(a).not.toHaveProperty("bijgewerkt_op");
    expect(stabielJson(a)).toBe(stabielJson(b));
    expect(omschrijvingVoor(a)).toBe("Gepubliceerd");
    expect(omschrijvingVoor({ ...a, status: "concept" })).toBe("Opgeslagen");
  });

  it("toont een pagina als tekst met de inhoud per regel", () => {
    const t = paginaAlsTekst(paginaSnapshot(pagina));
    expect(t).toContain("Titel: Over mij");
    expect(t).toContain("Webadres: /over-mij");
    expect(t.split("\n")).toContain("## Kop");
  });

  it("blog als tekst verdraagt ontbrekende velden", () => {
    expect(blogAlsTekst({})).toContain("Titel: ");
    expect(blogAlsTekst({ tags: ["a", "b"] })).toContain("Tags: a, b");
  });

  it("tekstsectie: null = standaardtekst, aangevuld met de standaard", () => {
    const s = sectie({
      sleutel: "test.x",
      titel: "X",
      velden: {
        kop: { soort: "tekst", label: "Kop", standaard: "Standaardkop" },
        vragen: { soort: "lijst", label: "Vragen", itemNaam: "vraag", velden: { v: { soort: "tekst", label: "Vraag", standaard: "" } }, standaard: [] },
      },
    });
    expect(tekstSnapshot(null)).toEqual({ waarde: null });
    expect(tekstSnapshot([1])).toEqual({ waarde: null });
    const std = tekstAlsTekst(s, tekstSnapshot(null));
    expect(std).toContain("(standaardtekst)");
    expect(std).toContain("Kop: Standaardkop");
    const eigen = tekstAlsTekst(s, tekstSnapshot({ kop: "Eigen", vragen: [{ _id: "a1", v: "Waarom?" }] }));
    expect(eigen).toContain("Kop: Eigen");
    expect(eigen).toContain("1. Vraag: Waarom?");
  });

  it("herkent geldige soorten", () => {
    expect(isVersieSoort("pagina")).toBe(true);
    expect(isVersieSoort("tekst")).toBe(true);
    expect(isVersieSoort("anders")).toBe(false);
  });
});
