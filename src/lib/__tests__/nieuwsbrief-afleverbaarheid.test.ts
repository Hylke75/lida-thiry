import { describe, expect, it } from "vitest";
import {
  adresUitAfzender,
  afzenderDomein,
  beoordeel,
  beoordeelDkim,
  beoordeelDmarc,
  beoordeelMx,
  beoordeelSpf,
  dmarcPolicy,
  plakTxt,
  totaal,
} from "../nieuwsbrief/afleverbaarheid";

describe("afleverbaarheid: afzender", () => {
  it("haalt het adres uit RESEND_VAN", () => {
    expect(adresUitAfzender("Lida Thiry <Info@Lida.nl>")).toBe("info@lida.nl");
    expect(adresUitAfzender("info@lida.nl")).toBe("info@lida.nl");
    expect(adresUitAfzender("Lida")).toBeNull();
    expect(adresUitAfzender("")).toBeNull();
  });

  it("herkent het standaardadres van Resend en een eigen domein", () => {
    expect(afzenderDomein(undefined)).toEqual({ soort: "standaard", adres: "onboarding@resend.dev" });
    expect(afzenderDomein("Lida <onboarding@resend.dev>").soort).toBe("standaard");
    expect(afzenderDomein("Lida <info@mail.lida.nl>")).toEqual({
      soort: "eigen",
      adres: "info@mail.lida.nl",
      domein: "mail.lida.nl",
    });
    expect(afzenderDomein("onzin")).toEqual({ soort: "geen" });
  });

  it("plakt TXT-stukjes aan elkaar", () => {
    expect(plakTxt([["v=spf1 include:", "amazonses.com ~all"], ["x"]])).toEqual(["v=spf1 include:amazonses.com ~all", "x"]);
  });
});

describe("afleverbaarheid: SPF", () => {
  it("goed op send.<domein>", () => {
    expect(beoordeelSpf("lida.nl", ["v=spf1 include:amazonses.com ~all"], []).oordeel).toBe("goed");
  });
  it("goed op het domein zelf", () => {
    expect(beoordeelSpf("lida.nl", [], ["v=spf1 include:_spf.google.com include:amazonses.com -all"]).oordeel).toBe("goed");
  });
  it("let op zonder Amazon SES of bij dubbele records", () => {
    const zonder = beoordeelSpf("lida.nl", ["v=spf1 include:_spf.google.com ~all"], []);
    expect(zonder.oordeel).toBe("let-op");
    expect(zonder.actie?.naam).toBe("send.lida.nl");
    expect(beoordeelSpf("lida.nl", [], ["v=spf1 a ~all", "v=spf1 mx ~all"]).oordeel).toBe("let-op");
  });
  it("ontbreekt", () => {
    const c = beoordeelSpf("lida.nl", ["google-site-verification=x"], []);
    expect(c.oordeel).toBe("ontbreekt");
    expect(c.actie?.waarde).toBe("v=spf1 include:amazonses.com ~all");
  });
});

describe("afleverbaarheid: DKIM", () => {
  it("goed met een sleutel of een CNAME", () => {
    expect(beoordeelDkim("lida.nl", ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC"], []).oordeel).toBe("goed");
    expect(beoordeelDkim("lida.nl", [], ["resend.domainkey.example.com"]).oordeel).toBe("goed");
  });
  it("ontbreekt", () => {
    const c = beoordeelDkim("lida.nl", [], []);
    expect(c.oordeel).toBe("ontbreekt");
    expect(c.actie?.naam).toBe("resend._domainkey.lida.nl");
    expect(beoordeelDkim("lida.nl", ["p="], []).oordeel).toBe("ontbreekt");
  });
});

describe("afleverbaarheid: DMARC", () => {
  it("leest de policy", () => {
    expect(dmarcPolicy("v=DMARC1; p=Quarantine; rua=mailto:x@y.nl")).toBe("quarantine");
    expect(dmarcPolicy("v=DMARC1; sp=none")).toBeNull();
  });
  it("beoordeelt records", () => {
    expect(beoordeelDmarc("lida.nl", ["v=DMARC1; p=none;"]).oordeel).toBe("goed");
    expect(beoordeelDmarc("lida.nl", ["v=DMARC1; p=reject"]).uitleg).toContain("p=reject");
    expect(beoordeelDmarc("lida.nl", ["v=DMARC1; rua=mailto:a@b.nl"]).oordeel).toBe("let-op");
    expect(beoordeelDmarc("lida.nl", ["v=DMARC1; p=none", "v=DMARC1; p=reject"]).oordeel).toBe("let-op");
    const leeg = beoordeelDmarc("lida.nl", ["iets anders"]);
    expect(leeg.oordeel).toBe("ontbreekt");
    expect(leeg.actie?.naam).toBe("_dmarc.lida.nl");
  });
});

describe("afleverbaarheid: MX en totaal", () => {
  it("MX naar Amazon SES", () => {
    expect(beoordeelMx("lida.nl", [{ exchange: "feedback-smtp.eu-west-1.amazonses.com", priority: 10 }]).oordeel).toBe("goed");
    expect(beoordeelMx("lida.nl", [{ exchange: "mx.transip.email", priority: 10 }]).oordeel).toBe("let-op");
    expect(beoordeelMx("lida.nl", []).oordeel).toBe("ontbreekt");
  });
  it("totaaloordeel is het slechtste", () => {
    const goed = beoordeel("lida.nl", {
      spfSubdomein: ["v=spf1 include:amazonses.com ~all"],
      spfDomein: [],
      dkimTxt: ["p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC"],
      dkimCname: [],
      dmarc: ["v=DMARC1; p=none"],
      mx: [{ exchange: "feedback-smtp.eu-west-1.amazonses.com", priority: 10 }],
    });
    expect(goed.map((c) => c.id)).toEqual(["spf", "dkim", "dmarc", "mx"]);
    expect(totaal(goed)).toBe("goed");
    expect(totaal([...goed, { ...goed[0], oordeel: "let-op" }])).toBe("let-op");
    expect(totaal([...goed, { ...goed[0], oordeel: "ontbreekt" }])).toBe("ontbreekt");
  });
});
