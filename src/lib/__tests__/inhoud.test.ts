import { describe, expect, it } from "vitest";
import { bevatPlaceholder, combineer, sectie, standaardWaarden, valideer, vulIn } from "../inhoud/schema";
import { opmaakNaarHtml, opmaakNaarTekst, parseerOpmaak } from "../inhoud/opmaak";

const S = sectie({
  sleutel: "test.voorbeeld",
  titel: "Voorbeeld",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Hallo", max: 10 },
    tekst: { soort: "opmaak", label: "Tekst", standaard: "Alinea" },
    vragen: {
      soort: "lijst",
      label: "Vragen",
      itemNaam: "vraag",
      max: 2,
      velden: {
        vraag: { soort: "tekst", label: "Vraag", standaard: "" },
        antwoord: { soort: "tekstvak", label: "Antwoord", standaard: "" },
      },
      standaard: [{ _id: "vast", vraag: "V1", antwoord: "A1" }, { vraag: "V2", antwoord: "A2" }],
    },
  },
});

describe("inhoud: schema", () => {
  it("geeft standaardwaarden met ids", () => {
    const w = standaardWaarden(S);
    expect(w.titel).toBe("Hallo");
    expect(w.vragen.map((v) => v._id)).toEqual(["vast", "std2"]);
  });

  it("combineert opgeslagen waarden met de standaard", () => {
    const w = combineer(S, { titel: "Nieuw", vragen: [{ _id: "x", vraag: "Q" }], onbekend: 1 });
    expect(w.titel).toBe("Nieuw");
    expect(w.tekst).toBe("Alinea");
    expect(w.vragen).toEqual([{ _id: "x", vraag: "Q", antwoord: "" }]);
    expect(combineer(S, null).titel).toBe("Hallo");
  });

  it("valideert lengte en aantal en schoont invoer op", () => {
    const fout = valideer(S, { titel: "veel te lange titel", vragen: [{}, {}, {}] });
    expect(fout.ok).toBe(false);
    if (!fout.ok) expect(fout.fouten).toHaveLength(2);

    const goed = valideer(S, { titel: " Hoi\n ", tekst: "a\r\nb", vragen: [{ _id: "a", vraag: "Q" }, { _id: "a" }] });
    expect(goed.ok).toBe(true);
    if (goed.ok) {
      expect(goed.waarde.titel).toBe("Hoi");
      expect(goed.waarde.tekst).toBe("a\nb");
      const ids = (goed.waarde.vragen as { _id: string }[]).map((v) => v._id);
      expect(new Set(ids).size).toBe(2);
    }
  });

  it("vult variabelen in en laat onbekende staan", () => {
    expect(vulIn("Beste {naam}, {onbekend}", { naam: "Anna" })).toBe("Beste Anna, {onbekend}");
  });

  it("herkent placeholders", () => {
    expect(bevatPlaceholder({ a: "Ik ben [aan te vullen: bio]" })).toBe(true);
    expect(bevatPlaceholder({ l: [{ _id: "1", t: "gewoon" }] })).toBe(false);
  });
});

describe("inhoud: opmaak", () => {
  it("herkent koppen, lijsten, alinea's en blokken", () => {
    const blokken = parseerOpmaak("## Kop\n\nEen\ntwee\n\n- a\n- b\n{bedrijfsgegevens}\n### Sub");
    expect(blokken.map((b) => b.soort)).toEqual(["kop", "alinea", "lijst", "blok", "kop"]);
  });

  it("maakt veilige HTML met links, vet en variabelen", () => {
    const html = opmaakNaarHtml("Hoi **{naam}** <script>, zie [site](https://x.nl) en [boos](javascript:alert(1))", {
      variabelen: { naam: "<Anna>" },
    });
    expect(html).toBe(
      '<p>Hoi <strong>&lt;Anna&gt;</strong> &lt;script&gt;, zie <a href="https://x.nl">site</a> en [boos](javascript:alert(1))</p>',
    );
  });

  it("vult blokken in en maakt platte tekst", () => {
    expect(opmaakNaarHtml("{blok}", { blokken: { blok: "<div>x</div>" } })).toBe("<div>x</div>");
    expect(opmaakNaarTekst("## Kop\n\n**Vet** en [link](/a)")).toBe("Kop Vet en link");
  });
});

describe("inhoud: opmaak met afbeeldingen", () => {
  it("herkent alleen https-afbeeldingen op een eigen regel", () => {
    const blokken = parseerOpmaak("![Jurk](https://x.nl/a.png)\n\n![Fout](http://x.nl/a.png)\n\nTekst ![inline](https://x.nl/b.png)");
    expect(blokken[0]).toEqual({ soort: "afbeelding", url: "https://x.nl/a.png", alt: "Jurk" });
    expect(blokken.slice(1).every((b) => b.soort === "alinea")).toBe(true);
    expect(opmaakNaarHtml('![A "b"](https://x.nl/a.png)')).toBe('<img src="https://x.nl/a.png" alt="A &quot;b&quot;">');
    expect(opmaakNaarTekst("![A](https://x.nl/a.png)\n\nHoi")).toBe("Hoi");
  });
});
