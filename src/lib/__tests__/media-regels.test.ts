import { describe, expect, it } from "vitest";
import {
  altUitNaam,
  bevatVerwijzing,
  controleerBestand,
  extensieVoorMime,
  formatAfmetingen,
  formatGrootte,
  gebruikZoektekst,
  isImporteerbaar,
  isMediaBucket,
  isVeiligPad,
  leesTypeFilter,
  likePatroon,
  mapVoorImport,
  MEDIA_MAX_BYTES,
  mediaPad,
  mimeVoorNaam,
  normaliseerMap,
  opmaakFragment,
  schoneBestandsnaam,
  schoneZoekterm,
  zoekFilter,
} from "../media/regels";

describe("media: bestandsnamen", () => {
  it("haalt paden en vreemde tekens weg", () => {
    expect(schoneBestandsnaam("C:\\fotos\\Zomer 2026.JPG")).toBe("Zomer 2026.JPG");
    expect(schoneBestandsnaam("../../etc/passwd")).toBe("passwd");
    expect(schoneBestandsnaam('a<b>c:"d|e?.png')).toBe("abcde.png");
    expect(schoneBestandsnaam("  veel    spaties .webp ")).toBe("veel spaties .webp");
    expect(schoneBestandsnaam("")).toBe("afbeelding");
    expect(schoneBestandsnaam("..")).toBe("afbeelding");
    expect(schoneBestandsnaam(undefined)).toBe("afbeelding");
  });

  it("kort lange namen in en houdt de extensie", () => {
    const naam = schoneBestandsnaam(`${"x".repeat(300)}.jpeg`);
    expect(naam.length).toBe(120);
    expect(naam.endsWith(".jpeg")).toBe(true);
  });

  it("maakt een eerste omschrijving uit de naam", () => {
    expect(altUitNaam("rode_jas-in-de-winter.jpg")).toBe("rode jas in de winter");
  });
});

describe("media: typen en extensies", () => {
  it("koppelt MIME-type en extensie", () => {
    expect(extensieVoorMime("image/jpeg")).toBe("jpg");
    expect(extensieVoorMime("IMAGE/PNG")).toBe("png");
    expect(extensieVoorMime("image/svg+xml")).toBe("svg");
    expect(extensieVoorMime("image/vnd.microsoft.icon")).toBe("ico");
    expect(extensieVoorMime("application/pdf")).toBeNull();
    expect(mimeVoorNaam("Foto.JPEG")).toBe("image/jpeg");
    expect(mimeVoorNaam("favicon.ico")).toBe("image/x-icon");
    expect(mimeVoorNaam("document.pdf")).toBeNull();
    expect(mimeVoorNaam("geen-extensie")).toBeNull();
  });

  it("controleert type en grootte per soort", () => {
    expect(controleerBestand({ type: "image/jpeg", size: 1000 })).toBeNull();
    expect(controleerBestand({ type: "image/svg+xml", size: 1000 }, "afbeelding")).toBeNull();
    expect(controleerBestand({ type: "image/svg+xml", size: 1000 }, "foto")).toMatch(/JPG, PNG, GIF of WebP/);
    expect(controleerBestand({ type: "image/x-icon", size: 1000 }, "icoon")).toBeNull();
    expect(controleerBestand({ type: "image/jpeg", size: 1000 }, "icoon")).toMatch(/PNG, SVG of ICO/);
    expect(controleerBestand({ type: "image/x-icon", size: 1000 }, "alle")).toBeNull();
    expect(controleerBestand({ type: "image/png", size: 0 })).toMatch(/leeg/);
    expect(controleerBestand({ type: "image/png", size: MEDIA_MAX_BYTES + 1 })).toMatch(/te groot/);
    expect(controleerBestand({ type: "text/html", size: 10 }, "alle")).not.toBeNull();
  });

  it("leest het typefilter veilig", () => {
    expect(leesTypeFilter("svg")).toBe("svg");
    expect(leesTypeFilter("onzin")).toBe("alles");
    expect(leesTypeFilter(undefined)).toBe("alles");
  });
});

describe("media: mappen en paden", () => {
  it("normaliseert mapnamen", () => {
    expect(normaliseerMap("Logo")).toBe("logo");
    expect(normaliseerMap("Mijn Logo's")).toBe("mijn-logos");
    expect(normaliseerMap("  Pagina’s / Over mij ")).toBe("paginas-over-mij");
    expect(normaliseerMap("Ééntje")).toBe("eentje");
    expect(normaliseerMap("---")).toBeNull();
    expect(normaliseerMap(42)).toBeNull();
    expect(normaliseerMap("a".repeat(60))?.length).toBe(40);
  });

  it("bouwt het opslagpad", () => {
    expect(mediaPad("Blog", "abc", "jpg")).toBe("blog/abc.jpg");
    expect(mediaPad("", "abc", "png")).toBe("algemeen/abc.png");
  });

  it("weigert onveilige paden en buckets", () => {
    expect(isVeiligPad("blog/abc.jpg")).toBe(true);
    expect(isVeiligPad("paginas/omslag/a-b_c.webp")).toBe(true);
    expect(isVeiligPad("../geheim.jpg")).toBe(false);
    expect(isVeiligPad("/blog/a.jpg")).toBe(false);
    expect(isVeiligPad("blog//a.jpg")).toBe(false);
    expect(isVeiligPad("blog/a.jpg?x=1")).toBe(false);
    expect(isVeiligPad("")).toBe(false);
    expect(isMediaBucket("media")).toBe(true);
    expect(isMediaBucket("nieuwsbrief")).toBe(true);
    expect(isMediaBucket("beeldbank")).toBe(false);
  });

  it("kiest een map voor oudere uploads", () => {
    expect(mapVoorImport("blog", "omslag/x.jpg")).toBe("blog");
    expect(mapVoorImport("blog", "paginas/omslag/x.jpg")).toBe("paginas");
    expect(mapVoorImport("nieuwsbrief", "afbeeldingen/x.png")).toBe("nieuwsbrief");
    expect(isImporteerbaar(".emptyFolderPlaceholder")).toBe(false);
    expect(isImporteerbaar("x.webp")).toBe(true);
    expect(isImporteerbaar("x.pdf")).toBe(false);
  });
});

describe("media: weergave", () => {
  it("formatteert groottes in het Nederlands", () => {
    expect(formatGrootte(800)).toBe("800 B");
    expect(formatGrootte(12_345)).toBe("12 kB");
    expect(formatGrootte(1.4 * 1024 * 1024)).toBe("1,4 MB");
    expect(formatGrootte(null)).toBe("–");
    expect(formatAfmetingen(1200, 630)).toBe("1200 × 630");
    expect(formatAfmetingen(null, 630)).toBeNull();
  });

  it("maakt een opmaakfragment", () => {
    expect(opmaakFragment("https://x.nl/a.jpg", "Rode [jas]\n")).toBe("![Rode jas](https://x.nl/a.jpg)");
  });
});

describe("media: zoeken en gebruik", () => {
  it("maakt zoektermen veilig voor PostgREST", () => {
    expect(schoneZoekterm('  jas, (rood) "100%" ')).toBe("jas rood 100");
    expect(schoneZoekterm(5)).toBe("");
    expect(zoekFilter("jas")).toBe('naam.ilike."%jas%",alt.ilike."%jas%"');
    expect(zoekFilter(" , ")).toBeNull();
  });

  it("zoekt op bucket en pad, met ge-escapete like-tekens", () => {
    const m = { bucket: "media", pad: "blog/a_b.jpg" };
    expect(gebruikZoektekst(m)).toBe("/media/blog/a_b.jpg");
    expect(likePatroon(gebruikZoektekst(m))).toBe("%/media/blog/a\\_b.jpg%");
    expect(likePatroon("100%")).toBe("%100\\%%");
  });

  it("herkent verwijzingen in tekst en JSON", () => {
    const m = { bucket: "media", pad: "blog/abc.jpg" };
    const url = "https://p.supabase.co/storage/v1/object/public/media/blog/abc.jpg";
    expect(bevatVerwijzing(`Tekst ![x](${url}) meer`, m)).toBe(true);
    expect(bevatVerwijzing([{ soort: "afbeelding", url }], m)).toBe(true);
    expect(bevatVerwijzing("https://p.supabase.co/storage/v1/object/public/media/blog/abc.jpgx", { bucket: "media", pad: "blog/abc.png" })).toBe(false);
    expect(bevatVerwijzing(null, m)).toBe(false);
    expect(bevatVerwijzing("…/public/blog/blog/abc.jpg", m)).toBe(false);
  });
});
