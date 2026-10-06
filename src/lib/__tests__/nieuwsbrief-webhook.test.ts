import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { bepaalWebhookActie, controleerWebhook, webhookHandtekening } from "../nieuwsbrief/webhook";

const SLEUTEL = Buffer.from("een-geheime-sleutel-van-32-bytes!");
const GEHEIM = `whsec_${SLEUTEL.toString("base64")}`;
const NU = 1_790_000_000_000; // ms
const TS = String(NU / 1000);
const ID = "msg_2abc";
const BODY = JSON.stringify({ type: "email.bounced", data: { email_id: "e-1" } });

/** Onafhankelijk van de module berekend, zoals Svix het doet. */
function sig(body = BODY, ts = TS, id = ID, sleutel = SLEUTEL): string {
  return createHmac("sha256", sleutel).update(`${id}.${ts}.${body}`).digest("base64");
}

describe("controleerWebhook", () => {
  it("accepteert een geldige handtekening", () => {
    expect(webhookHandtekening(GEHEIM, ID, TS, BODY)).toBe(sig());
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: TS, handtekening: `v1,${sig()}` }, BODY, NU)).toBe(true);
  });

  it("accepteert als één van meerdere handtekeningen klopt", () => {
    const h = `v1,${sig(BODY, TS, ID, Buffer.from("oud"))} v2,iets v1,${sig()}`;
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: TS, handtekening: h }, BODY, NU)).toBe(true);
  });

  it("weigert een gewijzigde body, ander id of verkeerd geheim", () => {
    const koppen = { id: ID, tijdstempel: TS, handtekening: `v1,${sig()}` };
    expect(controleerWebhook(GEHEIM, koppen, BODY + " ", NU)).toBe(false);
    expect(controleerWebhook(GEHEIM, { ...koppen, id: "msg_ander" }, BODY, NU)).toBe(false);
    expect(controleerWebhook(`whsec_${Buffer.from("anders").toString("base64")}`, koppen, BODY, NU)).toBe(false);
  });

  it("weigert een andere versie dan v1", () => {
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: TS, handtekening: `v2,${sig()}` }, BODY, NU)).toBe(false);
  });

  it("weigert te oude of te nieuwe tijdstempels (meer dan 5 minuten)", () => {
    const oud = String(NU / 1000 - 301);
    const toekomst = String(NU / 1000 + 301);
    const net = String(NU / 1000 - 299);
    expect(
      controleerWebhook(GEHEIM, { id: ID, tijdstempel: oud, handtekening: `v1,${sig(BODY, oud)}` }, BODY, NU),
    ).toBe(false);
    expect(
      controleerWebhook(GEHEIM, { id: ID, tijdstempel: toekomst, handtekening: `v1,${sig(BODY, toekomst)}` }, BODY, NU),
    ).toBe(false);
    expect(
      controleerWebhook(GEHEIM, { id: ID, tijdstempel: net, handtekening: `v1,${sig(BODY, net)}` }, BODY, NU),
    ).toBe(true);
  });

  it("weigert ontbrekende of rare koppen", () => {
    expect(controleerWebhook(GEHEIM, { id: null, tijdstempel: TS, handtekening: `v1,${sig()}` }, BODY, NU)).toBe(false);
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: "abc", handtekening: `v1,${sig()}` }, BODY, NU)).toBe(
      false,
    );
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: TS, handtekening: "" }, BODY, NU)).toBe(false);
    expect(controleerWebhook(GEHEIM, { id: ID, tijdstempel: TS, handtekening: "zomaar" }, BODY, NU)).toBe(false);
    expect(controleerWebhook("", { id: ID, tijdstempel: TS, handtekening: `v1,${sig()}` }, BODY, NU)).toBe(false);
  });
});

describe("bepaalWebhookActie", () => {
  it("harde bounce", () => {
    expect(bepaalWebhookActie({ type: "email.bounced", data: { email_id: "e1" } })).toEqual({
      soort: "bounce",
      emailId: "e1",
    });
    expect(
      bepaalWebhookActie({ type: "email.bounced", data: { email_id: "e1", bounce: { type: "Permanent" } } }),
    ).toEqual({ soort: "bounce", emailId: "e1" });
  });

  it("tijdelijke bounce wordt genegeerd", () => {
    expect(
      bepaalWebhookActie({ type: "email.bounced", data: { email_id: "e1", bounce: { type: "Transient" } } }).soort,
    ).toBe("negeer");
  });

  it("klacht", () => {
    expect(bepaalWebhookActie({ type: "email.complained", data: { email_id: "e2" } })).toEqual({
      soort: "klacht",
      emailId: "e2",
    });
  });

  it("negeert opens, kliks, bezorging en rommel", () => {
    for (const type of ["email.opened", "email.clicked", "email.delivered", "email.sent"]) {
      expect(bepaalWebhookActie({ type, data: { email_id: "e" } }).soort).toBe("negeer");
    }
    expect(bepaalWebhookActie(null).soort).toBe("negeer");
    expect(bepaalWebhookActie({ type: "email.bounced", data: {} }).soort).toBe("negeer");
  });
});
