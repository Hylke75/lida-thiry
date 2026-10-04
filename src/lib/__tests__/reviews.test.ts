import { describe, expect, it } from "vitest";
import {
  REVIEW_TOKEN_PATROON,
  isTestbestelling,
  leesReviewDagen,
  magKlantBewerken,
  naamSuggestie,
  reviewSamenvatting,
  reviewVenster,
  selecteerUitTeNodigen,
  valideerBeheerBewerking,
  valideerReview,
  voornaamVoorAanhef,
  type KandidaatOrder,
} from "../reviews/regels";
import { reviewUitnodigingMail } from "../email-html";
import { standaardWaarden } from "../inhoud/schema";
import { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import { REVIEWS_UITNODIGING } from "../inhoud/groepen/reviews";
import { evalueerLivegang, type LivegangGegevens } from "../livegang";

const NU = new Date("2026-10-04T03:00:00Z");
const dagenGeleden = (n: number) => new Date(NU.getTime() - n * 24 * 60 * 60 * 1000).toISOString();

function order(o: Partial<KandidaatOrder> = {}): KandidaatOrder {
  return {
    id: "o1",
    email: "anna@gmail.com",
    klantnaam: "Anna de Vries",
    status: "advies_verzonden",
    afgerond_op: dagenGeleden(10),
    bedrag_cent: 2995,
    kortingscode: null,
    ...o,
  };
}

describe("reviews: wie wordt uitgenodigd", () => {
  it("nodigt een betaalde bestelling met verzonden advies binnen de termijn uit", () => {
    expect(selecteerUitTeNodigen([order()], new Set(), NU, 7).map((o) => o.id)).toEqual(["o1"]);
  });

  it("wacht tot het aantal dagen voorbij is en stopt na 60 dagen", () => {
    const lijst = [
      order({ id: "te-vroeg", afgerond_op: dagenGeleden(6) }),
      order({ id: "precies", email: "b@x.nl", afgerond_op: dagenGeleden(7) }),
      order({ id: "laatste", email: "c@x.nl", afgerond_op: dagenGeleden(59.9) }),
      order({ id: "te-oud", email: "d@x.nl", afgerond_op: dagenGeleden(61) }),
      order({ id: "geen-datum", email: "e@x.nl", afgerond_op: null }),
    ];
    expect(selecteerUitTeNodigen(lijst, new Set(), NU, 7).map((o) => o.id)).toEqual(["precies", "laatste"]);
  });

  it("slaat bestellingen met een review, een andere status of een testbestelling over", () => {
    const lijst = [
      order({ id: "heeft-review" }),
      order({ id: "nog-bezig", email: "b@x.nl", status: "test_afgerond" }),
      order({ id: "gratis", email: "c@x.nl", bedrag_cent: 0 }),
      order({ id: "voorbeeld", email: "test+123@voorbeeld.nl" }),
      order({ id: "met-code", email: "d@x.nl", bedrag_cent: 0, kortingscode: "GRATIS100" }),
    ];
    expect(selecteerUitTeNodigen(lijst, new Set(["heeft-review"]), NU, 7).map((o) => o.id)).toEqual(["met-code"]);
  });

  it("mailt elk e-mailadres maar één keer per ronde", () => {
    const lijst = [order({ id: "a" }), order({ id: "b", email: " ANNA@gmail.com " })];
    expect(selecteerUitTeNodigen(lijst, new Set(), NU, 7).map((o) => o.id)).toEqual(["a"]);
  });

  it("herkent testbestellingen", () => {
    expect(isTestbestelling({ email: "x@y.nl", bedrag_cent: 0, kortingscode: null })).toBe(true);
    expect(isTestbestelling({ email: "x@y.nl", bedrag_cent: null, kortingscode: null })).toBe(true);
    expect(isTestbestelling({ email: "test+1@voorbeeld.nl", bedrag_cent: 2995, kortingscode: null })).toBe(true);
    expect(isTestbestelling({ email: "iemand@example.com", bedrag_cent: 2995, kortingscode: null })).toBe(true);
    expect(isTestbestelling({ email: "x@y.nl", bedrag_cent: 0, kortingscode: "VRIENDIN" })).toBe(false);
    expect(isTestbestelling({ email: "x@y.nl", bedrag_cent: 2995, kortingscode: null })).toBe(false);
  });

  it("leest de instelling review_na_dagen", () => {
    expect(leesReviewDagen("14")).toBe(14);
    expect(leesReviewDagen(null)).toBe(7);
    expect(leesReviewDagen("")).toBe(7);
    expect(leesReviewDagen("abc")).toBe(7);
    expect(leesReviewDagen("-3")).toBe(7);
    expect(leesReviewDagen("9999")).toBe(180);
  });

  it("houdt het venster open als het aantal dagen dicht bij 60 ligt", () => {
    const { van, tot } = reviewVenster(NU, 55);
    expect(tot.toISOString()).toBe(dagenGeleden(55));
    expect(van.toISOString()).toBe(dagenGeleden(69));
  });
});

describe("reviews: formulier", () => {
  const goed = { sterren: "5", tekst: "  Heel fijn advies,\r\n\r\n\r\nik draag nu andere broeken!  ", naam: "  Anna ,  Utrecht ", toestemming: "on" };

  it("accepteert en schoont geldige invoer", () => {
    expect(valideerReview(goed)).toEqual({
      ok: true,
      waarde: { sterren: 5, tekst: "Heel fijn advies,\n\nik draag nu andere broeken!", naam: "Anna , Utrecht", toestemming: true },
    });
    const zonder = valideerReview({ ...goed, toestemming: undefined });
    expect(zonder.ok && zonder.waarde.toestemming).toBe(false);
  });

  it("controleert sterren, lengte van de tekst en de naam", () => {
    const v = valideerReview({ sterren: 0, tekst: "Te kort", naam: "   ", toestemming: false });
    expect(v.ok).toBe(false);
    if (!v.ok) expect(Object.keys(v.fouten).sort()).toEqual(["naam", "sterren", "tekst"]);
    expect(valideerReview({ ...goed, sterren: 6 }).ok).toBe(false);
    expect(valideerReview({ ...goed, sterren: 2.5 }).ok).toBe(false);
    expect(valideerReview({ ...goed, tekst: "x".repeat(19) }).ok).toBe(false);
    expect(valideerReview({ ...goed, tekst: "x".repeat(20) }).ok).toBe(true);
    expect(valideerReview({ ...goed, tekst: "x".repeat(1000) }).ok).toBe(true);
    expect(valideerReview({ ...goed, tekst: "x".repeat(1001) }).ok).toBe(false);
    expect(valideerReview({ ...goed, naam: "n".repeat(81) }).ok).toBe(false);
  });

  it("telt emoji als één teken", () => {
    expect(valideerReview({ ...goed, tekst: "😀".repeat(1000) }).ok).toBe(true);
  });

  it("laat de beheerder alleen licht corrigeren (niet leeg, niet te lang)", () => {
    expect(valideerBeheerBewerking({ naam: " Anna ", tekst: "Kort" })).toEqual({ ok: true, naam: "Anna", tekst: "Kort" });
    expect(valideerBeheerBewerking({ naam: "", tekst: "Tekst" }).ok).toBe(false);
    expect(valideerBeheerBewerking({ naam: "Anna", tekst: " " }).ok).toBe(false);
    expect(valideerBeheerBewerking({ naam: "Anna", tekst: "x".repeat(1001) }).ok).toBe(false);
  });

  it("laat aanpassen toe tot de review is beoordeeld", () => {
    expect(magKlantBewerken("uitgenodigd")).toBe(true);
    expect(magKlantBewerken("ingevuld")).toBe(true);
    expect(magKlantBewerken("goedgekeurd")).toBe(false);
    expect(magKlantBewerken("afgewezen")).toBe(false);
  });

  it("herkent geldige tokens", () => {
    expect(REVIEW_TOKEN_PATROON.test("a".repeat(64))).toBe(true);
    expect(REVIEW_TOKEN_PATROON.test("a".repeat(63))).toBe(false);
    expect(REVIEW_TOKEN_PATROON.test("A".repeat(64))).toBe(false);
  });
});

describe("reviews: naamsuggestie", () => {
  it("maakt ‘Voornaam, plaats’", () => {
    expect(naamSuggestie({ voornaam: "Anna", klantnaam: "Anna de Vries", plaats: "Utrecht" })).toBe("Anna, Utrecht");
  });

  it("valt terug op het eerste woord van de klantnaam en laat de plaats weg als die ontbreekt", () => {
    expect(naamSuggestie({ klantnaam: "  Marieke  Jansen " })).toBe("Marieke");
    expect(naamSuggestie({ voornaam: null, klantnaam: "Els", plaats: "  " })).toBe("Els");
  });

  it("zet hoofdletters goed bij alleen kleine of alleen hoofdletters", () => {
    expect(naamSuggestie({ voornaam: "anna", plaats: "DEN HAAG" })).toBe("Anna, Den Haag");
    expect(naamSuggestie({ voornaam: "anne-marie", plaats: "'s-hertogenbosch" })).toBe("Anne-Marie, 's-Hertogenbosch");
    expect(naamSuggestie({ voornaam: "McKenzie", plaats: "IJsselstein" })).toBe("McKenzie, IJsselstein");
  });

  it("geeft lege tekst zonder voornaam", () => {
    expect(naamSuggestie({ klantnaam: "", plaats: "Utrecht" })).toBe("");
  });

  it("gebruikt de voornaam in de aanhef", () => {
    expect(voornaamVoorAanhef("anna de vries")).toBe("Anna");
    expect(voornaamVoorAanhef("Anna de Vries", "Annemiek")).toBe("Annemiek");
    expect(voornaamVoorAanhef("")).toBe("daar");
  });
});

describe("reviews: samenvatting", () => {
  it("berekent gemiddelde op één decimaal en aantal", () => {
    expect(reviewSamenvatting([5, 4, 4])).toEqual({ gemiddelde: 4.3, aantal: 3 });
    expect(reviewSamenvatting([5, null, 0, 6])).toEqual({ gemiddelde: 5, aantal: 1 });
    expect(reviewSamenvatting([])).toEqual({ gemiddelde: 0, aantal: 0 });
  });
});

describe("reviews: uitnodigingsmail", () => {
  const mail = reviewUitnodigingMail(standaardWaarden(REVIEWS_UITNODIGING), standaardWaarden(EMAILS_ALGEMEEN), {
    naam: "Anna <b>",
    link: "https://example.com/review/abc",
  });

  it("vult de naam in (met escaping) en bevat de link", () => {
    expect(mail.onderwerp).toBe("Hoe bevalt je kledingadvies?");
    expect(mail.html).toContain("<p>Beste Anna &lt;b&gt;,</p>");
    expect(mail.html).toContain('href="https://example.com/review/abc"');
    expect(mail.html).toContain("Werkt de knop niet? Kopieer deze link:<br>https://example.com/review/abc");
    expect(mail.html).not.toMatch(/\{[a-z_]+\}/);
  });

  it("gebruikt ‘daar’ zonder naam", () => {
    const zonder = reviewUitnodigingMail(standaardWaarden(REVIEWS_UITNODIGING), standaardWaarden(EMAILS_ALGEMEEN), {
      naam: " ",
      link: "https://example.com/review/abc",
    });
    expect(zonder.html).toContain("<p>Beste daar,</p>");
  });
});

describe("reviews: livegang", () => {
  const basis: LivegangGegevens = {
    prijsCent: 2995,
    instellingen: {},
    tekstgroepen: [],
    opgeslagenTeksten: new Map(),
    lichaamstypes: [],
    adviestypes: [],
    ontbrekendeKoppelingen: [],
    omgeving: {},
  };
  const vind = (g: LivegangGegevens) => evalueerLivegang(g).find((i) => i.id === "reviews");

  it("raadt minstens 3 goedgekeurde reviews aan", () => {
    expect(vind({ ...basis, goedgekeurdeReviews: 1 })).toMatchObject({
      ok: false,
      niveau: "aanbevolen",
      links: [{ href: "/admin/reviews" }],
    });
    expect(vind({ ...basis, goedgekeurdeReviews: 3 })?.ok).toBe(true);
  });

  it("toont het punt niet als het aantal onbekend is", () => {
    expect(vind(basis)).toBeUndefined();
  });
});
