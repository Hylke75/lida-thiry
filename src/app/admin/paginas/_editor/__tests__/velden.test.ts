import { describe, expect, it } from "vitest";
import type { Pagina } from "@/lib/paginas/beheer";
import { alsInvoer, alsVelden, schoonSlug, slugTijdensTypen, slugVolgtTitel } from "../velden";

const pagina: Pagina = {
  id: "1",
  slug: "over-mij",
  titel: "Over mij",
  intro: "",
  inhoud: "",
  omslag_url: null,
  omslag_alt: "",
  status: "concept",
  in_menu: true,
  in_footer: false,
  menu_label: "",
  volgorde: 3,
  seo_titel: "",
  seo_omschrijving: "",
  niet_indexeren: false,
  aangemaakt_op: "2026-01-01T00:00:00Z",
  bijgewerkt_op: "2026-01-01T00:00:00Z",
};

describe("pagina-editor: velden", () => {
  it("zet de volgorde om naar tekst en terug (ongeldig = 0)", () => {
    const v = alsVelden(pagina);
    expect(v.volgorde).toBe("3");
    expect(v.omslag_url).toBe("");
    expect(alsInvoer(v).volgorde).toBe(3);
    expect(alsInvoer({ ...v, volgorde: "" }).volgorde).toBe(0);
    expect(alsInvoer({ ...v, volgorde: "abc" }).volgorde).toBe(0);
    expect(alsInvoer({ ...v, omslag_url: " " }).omslag_url).toBeNull();
  });

  it("laat het webadres alleen bij een concept met een afgeleide of standaardslug de titel volgen", () => {
    expect(slugVolgtTitel(pagina)).toBe(true);
    expect(slugVolgtTitel({ ...pagina, slug: "nieuwe-pagina-2", titel: "Iets" })).toBe(true);
    expect(slugVolgtTitel({ ...pagina, slug: "eigen" })).toBe(false);
    expect(slugVolgtTitel({ ...pagina, status: "gepubliceerd" })).toBe(false);
  });

  it("schoont de slug op tijdens en na het typen", () => {
    expect(slugTijdensTypen("Over Mij")).toBe("over-mij");
    expect(schoonSlug("-over--mij!-")).toBe("over-mij");
    expect(schoonSlug("é-a")).toBe("a");
    expect(schoonSlug("contact")).toBe("contact");
  });
});
