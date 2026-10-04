import { describe, expect, it } from "vitest";
import {
  apparaatNaam,
  base64UrlNaarBytes,
  bouwPayload,
  isPushDienst,
  isPushSoort,
  isVerlopen,
  MAX_TEKST,
  schoneSoorten,
  vapidCompleet,
  valideerAbonnement,
  veiligPad,
} from "../push/regels";

// Echte vormen: p256dh = 65 bytes (87 tekens base64url), auth = 16 bytes (22 tekens).
const P256DH = "BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQtUbVlUls0VJXg7A8u-Ts1XbjhazAkj7I99e8QcYP7DkM";
const AUTH = "tBHItJI5svbpez7KI4CCXg";

function abonnement(over: Record<string, unknown> = {}) {
  return {
    endpoint: "https://fcm.googleapis.com/fcm/send/abc123",
    expirationTime: null,
    keys: { p256dh: P256DH, auth: AUTH },
    ...over,
  };
}

describe("valideerAbonnement", () => {
  it("accepteert een abonnement van een bekende pushdienst", () => {
    expect(valideerAbonnement(abonnement())).toEqual({
      ok: true,
      abonnement: { endpoint: "https://fcm.googleapis.com/fcm/send/abc123", p256dh: P256DH, auth: AUTH },
    });
    for (const endpoint of [
      "https://updates.push.services.mozilla.com/wpush/v2/x",
      "https://web.push.apple.com/QGx",
      "https://wns2-par02p.notify.windows.com/w/?token=x",
    ]) {
      expect(valideerAbonnement(abonnement({ endpoint })).ok).toBe(true);
    }
  });

  it("weigert onbekende adressen en http", () => {
    expect(valideerAbonnement(abonnement({ endpoint: "https://evil.example/fcm.googleapis.com" })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ endpoint: "https://fcm.googleapis.com.evil.example/x" })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ endpoint: "http://fcm.googleapis.com/x" })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ endpoint: "geen url" })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ endpoint: `https://fcm.googleapis.com/${"x".repeat(2000)}` })).ok).toBe(false);
  });

  it("controleert de sleutels", () => {
    expect(valideerAbonnement(abonnement({ keys: { p256dh: P256DH } })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ keys: { p256dh: "kort", auth: AUTH } })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ keys: { p256dh: P256DH, auth: "a+b/" } })).ok).toBe(false);
    expect(valideerAbonnement(abonnement({ keys: { p256dh: `${P256DH}=`, auth: `${AUTH}==` } })).ok).toBe(true);
    expect(valideerAbonnement(null).ok).toBe(false);
    expect(valideerAbonnement("x").ok).toBe(false);
  });
});

describe("pushdiensten", () => {
  it("herkent hosts en subdomeinen", () => {
    expect(isPushDienst("fcm.googleapis.com")).toBe(true);
    expect(isPushDienst("web.push.apple.com")).toBe(true);
    expect(isPushDienst("FCM.googleapis.com.")).toBe(true);
    expect(isPushDienst("notpush.apple.com")).toBe(false);
    expect(isPushDienst("example.com")).toBe(false);
  });
});

describe("soorten", () => {
  it("houdt alleen geldige soorten over in vaste volgorde", () => {
    expect(schoneSoorten(["review", "x", "bestelling", "review"])).toEqual(["bestelling", "review"]);
    expect(schoneSoorten("bestelling")).toEqual([]);
    expect(isPushSoort("afspraak")).toBe(true);
    expect(isPushSoort("test")).toBe(false);
  });
});

describe("bouwPayload", () => {
  it("bouwt de inhoud voor de service worker", () => {
    expect(bouwPayload("bestelling", { titel: "Nieuwe bestelling", tekst: "Anna · € 29,95", url: "/admin/order/1" }, 1000)).toEqual({
      titel: "Nieuwe bestelling",
      tekst: "Anna · € 29,95",
      url: "/admin/order/1",
      tag: "bestelling:/admin/order/1",
      soort: "bestelling",
      tijd: 1000,
    });
  });

  it("valt terug op een standaardtitel en het beheer", () => {
    const p = bouwPayload("bericht", { titel: "" });
    expect(p.titel).toBe("Nieuw contactbericht");
    expect(p.tekst).toBe("");
    expect(p.url).toBe("/admin");
    expect(bouwPayload("test", { titel: "" }).titel).toBe("Testmelding");
  });

  it("kort lange tekst in en voegt witruimte samen", () => {
    const p = bouwPayload("bericht", { titel: "Hoi", tekst: `regel\n\n${"x".repeat(1000)}` });
    expect(p.tekst.length).toBe(MAX_TEKST);
    expect(p.tekst.endsWith("…")).toBe(true);
    expect(p.tekst.startsWith("regel x")).toBe(true);
  });

  it("staat alleen paden binnen de site toe", () => {
    expect(veiligPad("/admin/berichten/1?x=1#a")).toBe("/admin/berichten/1?x=1#a");
    expect(veiligPad("https://evil.example")).toBe("/admin");
    expect(veiligPad("//evil.example")).toBe("/admin");
    expect(veiligPad("/\\evil.example")).toBe("/admin");
    expect(veiligPad("javascript:alert(1)")).toBe("/admin");
    expect(veiligPad(undefined)).toBe("/admin");
  });
});

describe("overig", () => {
  it("herkent verlopen abonnementen", () => {
    expect(isVerlopen(404)).toBe(true);
    expect(isVerlopen(410)).toBe(true);
    expect(isVerlopen(429)).toBe(false);
    expect(isVerlopen(undefined)).toBe(false);
  });

  it("controleert de VAPID-instellingen", () => {
    const env = { VAPID_PUBLIC_KEY: "B", VAPID_PRIVATE_KEY: "p", VAPID_SUBJECT: "mailto:a@b.nl" };
    expect(vapidCompleet(env)).toBe(true);
    expect(vapidCompleet({ ...env, VAPID_SUBJECT: "https://lidathiry.nl" })).toBe(true);
    expect(vapidCompleet({ ...env, VAPID_SUBJECT: "mailto:" })).toBe(false);
    expect(vapidCompleet({ ...env, VAPID_PRIVATE_KEY: " " })).toBe(false);
    expect(vapidCompleet({})).toBe(false);
  });

  it("zet base64url om naar bytes", () => {
    expect([...base64UrlNaarBytes("AQID_-8")]).toEqual([1, 2, 3, 255, 239]);
    expect(base64UrlNaarBytes(P256DH)).toHaveLength(65);
  });

  it("geeft een leesbare apparaatnaam", () => {
    expect(
      apparaatNaam("Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1"),
    ).toBe("Safari op iPhone");
    expect(
      apparaatNaam("Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Mobile Safari/537.36"),
    ).toBe("Chrome op Android");
    expect(
      apparaatNaam("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36 Edg/129.0"),
    ).toBe("Edge op Windows");
    expect(apparaatNaam("Mozilla/5.0 (Macintosh; Intel Mac OS X 14.4; rv:130.0) Gecko/20100101 Firefox/130.0")).toBe("Firefox op Mac");
    expect(apparaatNaam(null)).toBe("Onbekend apparaat");
  });
});
