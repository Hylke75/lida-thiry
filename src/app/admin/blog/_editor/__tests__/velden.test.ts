import { describe, expect, it } from "vitest";
import type { BlogBericht } from "@/lib/blog/regels";
import { aiBereik, alsInvoer, alsVelden, pasAiVoorstelToe, slugTijdensTypen, slugVolgtTitel } from "../velden";

const bericht: BlogBericht = {
  id: "1",
  slug: "mijn-titel",
  titel: "Mijn titel",
  samenvatting: "",
  inhoud: "Tekst",
  omslag_url: null,
  omslag_alt: "",
  categorie: null,
  tags: ["a"],
  status: "concept",
  gepubliceerd_op: null,
  seo_titel: "",
  seo_omschrijving: "",
  auteur: "Lida",
  uitgelicht: false,
  ai_gegenereerd: false,
  ai_opdracht: null,
  aangemaakt_op: "2026-01-01T00:00:00Z",
  bijgewerkt_op: "2026-01-01T00:00:00Z",
};

describe("blogeditor: velden", () => {
  it("zet null om in lege tekst en weer terug", () => {
    const v = alsVelden(bericht);
    expect(v.omslag_url).toBe("");
    expect(v.categorie).toBe("");
    expect(v).not.toHaveProperty("id");
    const invoer = alsInvoer({ ...v, omslag_url: "  ", categorie: " Stijl " });
    expect(invoer.omslag_url).toBeNull();
    expect(invoer.categorie).toBe("Stijl");
    expect(alsInvoer({ ...v, categorie: "  " }).categorie).toBeNull();
  });

  it("laat het webadres alleen bij een concept met een afgeleide of standaardslug de titel volgen", () => {
    expect(slugVolgtTitel(bericht, "concept")).toBe(true);
    expect(slugVolgtTitel({ titel: "Iets", slug: "nieuw-bericht" }, "concept")).toBe(true);
    expect(slugVolgtTitel({ titel: "Iets", slug: "nieuw-bericht-3" }, "concept")).toBe(true);
    expect(slugVolgtTitel({ titel: "Iets", slug: "eigen-adres" }, "concept")).toBe(false);
    expect(slugVolgtTitel(bericht, "online")).toBe(false);
    expect(slugVolgtTitel(bericht, "ingepland")).toBe(false);
  });

  it("maakt van spaties streepjes tijdens het typen", () => {
    expect(slugTijdensTypen("Mijn  Nieuwe Slug")).toBe("mijn-nieuwe-slug");
  });
});

describe("blogeditor: AI-voorstel", () => {
  it("bewerkt de selectie, of alles als er niets (zinnigs) geselecteerd is", () => {
    const t = "Een. Twee. Drie.";
    expect(aiBereik(t, 5, 10)).toEqual({ van: 5, tot: 10, voor: "Twee.", geheel: false });
    expect(aiBereik(t, 3, 3)).toEqual({ van: 0, tot: t.length, voor: t, geheel: true });
    expect(aiBereik(t, 4, 5)).toEqual({ van: 0, tot: t.length, voor: t, geheel: true });
  });

  it("neemt het voorstel over op de oorspronkelijke plek", () => {
    expect(pasAiVoorstelToe("Een. Twee. Drie.", { start: 5, eind: 10, voor: "Twee.", na: "2." })).toEqual({ tekst: "Een. 2. Drie.", start: 5 });
  });

  it("zoekt het stuk op als de tekst ervoor veranderd is", () => {
    expect(pasAiVoorstelToe("Nieuw. Een. Twee. Drie.", { start: 5, eind: 10, voor: "Twee.", na: "2." })).toEqual({ tekst: "Nieuw. Een. 2. Drie.", start: 12 });
  });

  it("geeft null als het stuk weg is of vaker voorkomt", () => {
    expect(pasAiVoorstelToe("Een. Drie.", { start: 5, eind: 10, voor: "Twee.", na: "2." })).toBeNull();
    expect(pasAiVoorstelToe("Twee. Twee. Twee.", { start: 1, eind: 6, voor: "Twee.", na: "2." })).toBeNull();
  });
});
