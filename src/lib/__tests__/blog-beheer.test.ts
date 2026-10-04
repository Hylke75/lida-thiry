import { describe, expect, it } from "vitest";
import {
  campagneBlokkenUitBericht,
  eersteAlineas,
  filterBerichten,
  fotoplekBijCursor,
  maakLinksAbsoluut,
  pasOpmaakToe,
  splitsVoorVoorbeeld,
  uniekeSlug,
  uniekGesorteerd,
  vindPlaatshouders,
  voegAfbeeldingIn,
} from "../blog/beheer";
import { publicatieProblemen } from "../blog/regels";
import { controleerVoorVerzenden, valideerBlokken } from "../nieuwsbrief/blokken";

describe("blogbeheer: invulplekken", () => {
  it("vindt foto- en aanvulplekken met positie", () => {
    const tekst = "Intro\n\n[foto: vrouw in jurk]\n\nHet kost [aan te vullen: prijs] euro.";
    const p = vindPlaatshouders(tekst);
    expect(p.map((x) => x.tekst)).toEqual(["[foto: vrouw in jurk]", "[aan te vullen: prijs]"]);
    expect(p[0].foto).toBe("vrouw in jurk");
    expect(p[1].foto).toBeNull();
    expect(tekst.slice(p[1].start, p[1].eind)).toBe("[aan te vullen: prijs]");
    expect(vindPlaatshouders("[link](/blog) en [iets anders]")).toEqual([]);
  });

  it("herkent dezelfde plekken als de publicatiecontrole", () => {
    for (const t of ["[foto: x]", "[Aan te vullen]", "[invullen: naam]", "[bron nodig]"]) {
      expect(vindPlaatshouders(t).length).toBe(1);
      expect(publicatieProblemen({ titel: "x", samenvatting: "", inhoud: t })).toContain("Er staan nog [invulplekken] in de tekst.");
    }
  });

  it("splitst fotoregels apart voor het voorbeeld", () => {
    expect(splitsVoorVoorbeeld("## Kop\nTekst\n[foto: rode jas]\nMeer\n\n- a")).toEqual([
      { soort: "tekst", tekst: "## Kop\nTekst" },
      { soort: "foto", beschrijving: "rode jas" },
      { soort: "tekst", tekst: "Meer\n\n- a" },
    ]);
    expect(splitsVoorVoorbeeld("Alleen tekst")).toEqual([{ soort: "tekst", tekst: "Alleen tekst" }]);
  });
});

describe("blogbeheer: werkbalk", () => {
  it("maakt de selectie vet of voegt een voorbeeld in", () => {
    expect(pasOpmaakToe("een mooi woord", 4, 8, "vet")).toEqual({ tekst: "een **mooi** woord", start: 6, eind: 10 });
    const leeg = pasOpmaakToe("ab", 1, 1, "vet");
    expect(leeg.tekst).toBe("a**vette tekst**b");
    expect(leeg.tekst.slice(leeg.start, leeg.eind)).toBe("vette tekst");
  });

  it("maakt een link en selecteert het adres", () => {
    const r = pasOpmaakToe("lees dit", 5, 8, "link");
    expect(r.tekst).toBe("lees [dit](https://)");
    expect(r.tekst.slice(r.start, r.eind)).toBe("https://");
  });

  it("maakt van regels een kop of lijst, en weer terug", () => {
    const t = "eerste\ntweede regel\nderde";
    const kop = pasOpmaakToe(t, 9, 9, "kop");
    expect(kop.tekst).toBe("eerste\n## tweede regel\nderde");
    expect(pasOpmaakToe(kop.tekst, 10, 10, "kop").tekst).toBe(t);
    expect(pasOpmaakToe(kop.tekst, 10, 10, "subkop").tekst).toBe("eerste\n### tweede regel\nderde");
    const lijst = pasOpmaakToe(t, 0, t.length, "lijst");
    expect(lijst.tekst).toBe("- eerste\n- tweede regel\n- derde");
    expect(pasOpmaakToe(lijst.tekst, 0, lijst.tekst.length, "lijst").tekst).toBe(t);
  });

  it("begint een nieuwe kop op een lege regel", () => {
    const r = pasOpmaakToe("a\n\nb", 2, 2, "kop");
    expect(r.tekst).toBe("a\n## \nb");
    expect(r.start).toBe(5);
  });

  it("voegt een afbeelding als eigen regel in", () => {
    const r = voegAfbeeldingIn("Alinea een.", 11, 11, "https://x.nl/a.jpg", "Een [rode] jas");
    expect(r.tekst).toBe("Alinea een.\n\n![Een rode jas](https://x.nl/a.jpg)\n");
    expect(voegAfbeeldingIn("", 0, 0, "https://x.nl/a.jpg", "a").tekst).toBe("![a](https://x.nl/a.jpg)\n");
    expect(voegAfbeeldingIn("a\n\nb", 2, 2, "https://x.nl/a.jpg", "f").tekst).toBe("a\n\n![f](https://x.nl/a.jpg)\n\nb");
  });

  it("vervangt een fotoplek door de afbeelding", () => {
    const t = "Intro\n\n[foto: blazer]\n\nSlot";
    const pos = t.indexOf("blazer");
    expect(fotoplekBijCursor(t, pos, pos)).toBe("blazer");
    expect(fotoplekBijCursor(t, 0, 0)).toBeNull();
    expect(voegAfbeeldingIn(t, pos, pos, "https://x.nl/b.png", "Blazer").tekst).toBe("Intro\n\n![Blazer](https://x.nl/b.png)\n\nSlot");
  });
});

describe("blogbeheer: slugs en overzicht", () => {
  it("maakt een unieke slug met -2, -3", () => {
    expect(uniekeSlug("Mijn bericht", [])).toBe("mijn-bericht");
    expect(uniekeSlug("mijn-bericht", ["mijn-bericht", "mijn-bericht-2"])).toBe("mijn-bericht-3");
    expect(uniekeSlug("", [])).toBe("bericht");
    const lang = "a".repeat(80);
    expect(uniekeSlug(lang, [lang]).length).toBeLessThanOrEqual(100);
  });

  it("filtert op titel, status, categorie en tag", () => {
    const nu = new Date("2026-10-04T12:00:00Z");
    const b = [
      { titel: "Jurken voor de Peer", status: "gepubliceerd" as const, gepubliceerd_op: "2026-10-01T00:00:00Z", categorie: "Stijl", tags: ["jurken"] },
      { titel: "Najaar", status: "gepubliceerd" as const, gepubliceerd_op: "2026-11-01T00:00:00Z", categorie: null, tags: [] },
      { titel: "Kleuren", status: "concept" as const, gepubliceerd_op: null, categorie: "stijl", tags: ["kleur"] },
    ];
    expect(filterBerichten(b, { zoek: "peer" }, nu).map((x) => x.titel)).toEqual(["Jurken voor de Peer"]);
    expect(filterBerichten(b, { status: "ingepland" }, nu).map((x) => x.titel)).toEqual(["Najaar"]);
    expect(filterBerichten(b, { status: "onzin" }, nu).length).toBe(3);
    expect(filterBerichten(b, { categorie: "Stijl" }, nu).length).toBe(2);
    expect(filterBerichten(b, { tag: "kleur" }, nu).map((x) => x.titel)).toEqual(["Kleuren"]);
    expect(uniekGesorteerd(["Stijl", "stijl", null, " Kleur "])).toEqual(["Kleur", "Stijl"]);
  });
});

describe("blogbeheer: nieuwsbrief van een bericht", () => {
  const bericht = {
    titel: "Jurken voor de Peer",
    slug: "jurken-voor-de-peer",
    samenvatting: "Zo kies je een jurk die past.",
    inhoud: "## Inleiding\n\nEerste alinea met [de test](/bestellen).\n\n[foto: jurk]\n\n- lijst\n\nTweede alinea.\n\nDerde alinea.",
    omslag_url: "https://x.supabase.co/storage/v1/object/public/blog/omslag/a.jpg",
    omslag_alt: "",
  };

  it("pakt de eerste gewone alinea's", () => {
    expect(eersteAlineas(bericht.inhoud)).toEqual(["Eerste alinea met [de test](/bestellen).", "Tweede alinea."]);
    expect(maakLinksAbsoluut("[a](/b) [c](https://d.nl) [e](//f)", "https://site.nl/")).toBe("[a](https://site.nl/b) [c](https://d.nl) [e](//f)");
  });

  it("maakt geldige, verzendklare blokken", () => {
    const blokken = campagneBlokkenUitBericht(bericht, "https://lidathiry.nl");
    expect(blokken.map((b) => b.soort)).toEqual(["afbeelding", "kop", "tekst", "knop"]);
    expect(blokken[0]).toMatchObject({ alt: "Jurken voor de Peer", link: "https://lidathiry.nl/blog/jurken-voor-de-peer" });
    expect(blokken[2]).toMatchObject({
      tekst: "Zo kies je een jurk die past.\n\nEerste alinea met [de test](https://lidathiry.nl/bestellen).\n\nTweede alinea.",
    });
    expect(blokken[3]).toMatchObject({ tekst: "Lees verder", url: "https://lidathiry.nl/blog/jurken-voor-de-peer" });
    const { blokken: schoon, fouten } = valideerBlokken(blokken);
    expect(fouten).toEqual([]);
    expect(controleerVoorVerzenden({ onderwerp: bericht.titel, blokken: schoon })).toEqual([]);
  });

  it("laat de omslag weg zonder https-adres", () => {
    const blokken = campagneBlokkenUitBericht({ ...bericht, omslag_url: null }, "https://lidathiry.nl");
    expect(blokken[0].soort).toBe("kop");
  });
});
