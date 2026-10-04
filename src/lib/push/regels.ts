// Pushmeldingen voor beheerders: pure regels (soorten, abonnement controleren,
// inhoud van een melding opbouwen). Geen database of web-push hier; zie versturen.ts.

export const PUSH_SOORTEN = ["bestelling", "bericht", "afspraak", "review"] as const;
export type PushSoort = (typeof PUSH_SOORTEN)[number];

export const PUSH_SOORT_LABEL: Record<PushSoort, string> = {
  bestelling: "Nieuwe bestelling betaald",
  bericht: "Nieuw contactbericht",
  afspraak: "Nieuwe afspraak",
  review: "Nieuwe review",
};

/** Wat een nieuw apparaat standaard krijgt (gelijk aan de standaard in de database). */
export const STANDAARD_SOORTEN: readonly PushSoort[] = ["bestelling", "bericht", "afspraak"];

export function isPushSoort(v: unknown): v is PushSoort {
  return typeof v === "string" && (PUSH_SOORTEN as readonly string[]).includes(v);
}

/** Alleen geldige soorten, zonder dubbelen, in vaste volgorde. */
export function schoneSoorten(v: unknown): PushSoort[] {
  const lijst = Array.isArray(v) ? v : [];
  return PUSH_SOORTEN.filter((s) => lijst.includes(s));
}

// Abonnement -----------------------------------------------------------------

export interface PushAbonnement {
  endpoint: string;
  p256dh: string;
  auth: string;
}

/**
 * Pushdiensten van de browsers. Alleen naar deze adressen sturen we iets, zodat
 * een vervalst abonnement de server niet naar willekeurige adressen laat posten.
 */
const PUSH_DIENSTEN = [
  "fcm.googleapis.com", // Chrome, Edge (deels), Opera, Samsung, Brave
  "android.googleapis.com",
  "push.services.mozilla.com", // Firefox
  "push.apple.com", // Safari (web.push.apple.com)
  "notify.windows.com", // Edge (wns2-*.notify.windows.com)
] as const;

export function isPushDienst(host: string): boolean {
  const h = host.toLowerCase().replace(/\.$/, "");
  return PUSH_DIENSTEN.some((d) => h === d || h.endsWith(`.${d}`));
}

const BASE64URL = /^[A-Za-z0-9_-]+={0,2}$/;

function sleutelLengte(s: string): number {
  // Aantal bytes van een base64(url)-tekst.
  const zonder = s.replace(/=+$/, "");
  return Math.floor((zonder.length * 3) / 4);
}

/**
 * Controleert een abonnement zoals de browser het geeft (`PushSubscription.toJSON()`):
 * https-adres bij een bekende pushdienst, p256dh = 65 bytes, auth = 16 bytes.
 */
export function valideerAbonnement(v: unknown): { ok: true; abonnement: PushAbonnement } | { ok: false; fout: string } {
  if (!v || typeof v !== "object") return { ok: false, fout: "Geen abonnement ontvangen." };
  const o = v as { endpoint?: unknown; keys?: unknown };
  if (typeof o.endpoint !== "string" || o.endpoint.length > 2000) return { ok: false, fout: "Ongeldig adres." };
  let url: URL;
  try {
    url = new URL(o.endpoint);
  } catch {
    return { ok: false, fout: "Ongeldig adres." };
  }
  if (url.protocol !== "https:") return { ok: false, fout: "Het adres moet https zijn." };
  if (!isPushDienst(url.hostname)) return { ok: false, fout: "Onbekende pushdienst." };
  const keys = (o.keys && typeof o.keys === "object" ? o.keys : {}) as { p256dh?: unknown; auth?: unknown };
  const { p256dh, auth } = keys;
  if (typeof p256dh !== "string" || !BASE64URL.test(p256dh) || sleutelLengte(p256dh) !== 65) {
    return { ok: false, fout: "Ongeldige sleutel (p256dh)." };
  }
  if (typeof auth !== "string" || !BASE64URL.test(auth) || sleutelLengte(auth) !== 16) {
    return { ok: false, fout: "Ongeldige sleutel (auth)." };
  }
  // Het adres letterlijk bewaren: de pagina herkent "dit apparaat" aan precies deze tekst.
  return { ok: true, abonnement: { endpoint: o.endpoint, p256dh, auth } };
}

/** base64url (zoals de VAPID-sleutel) naar bytes, voor `pushManager.subscribe`. */
export function base64UrlNaarBytes(tekst: string): Uint8Array<ArrayBuffer> {
  const schoon = tekst.trim().replace(/=+$/, "");
  const b64 = (schoon + "=".repeat((4 - (schoon.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const ruw = atob(b64);
  const uit = new Uint8Array(ruw.length);
  for (let i = 0; i < ruw.length; i++) uit[i] = ruw.charCodeAt(i);
  return uit;
}

/** Een korte naam voor het apparaat uit de user-agent ("Chrome op Android"). */
export function apparaatNaam(userAgent: string | null | undefined): string {
  const ua = userAgent ?? "";
  const systeem = /iPhone/.test(ua)
    ? "iPhone"
    : /iPad/.test(ua)
      ? "iPad"
      : /Android/.test(ua)
        ? "Android"
        : /Macintosh|Mac OS X/.test(ua)
          ? "Mac"
          : /Windows/.test(ua)
            ? "Windows"
            : /Linux|CrOS/.test(ua)
              ? "Linux"
              : "";
  const browser = /Edg\//.test(ua)
    ? "Edge"
    : /OPR\//.test(ua)
      ? "Opera"
      : /SamsungBrowser/.test(ua)
        ? "Samsung Internet"
        : /Firefox\/|FxiOS/.test(ua)
          ? "Firefox"
          : /Chrome\/|CriOS/.test(ua)
            ? "Chrome"
            : /Safari\//.test(ua)
              ? "Safari"
              : "";
  if (browser && systeem) return `${browser} op ${systeem}`;
  return browser || systeem || "Onbekend apparaat";
}

// Melding --------------------------------------------------------------------

export interface PushBericht {
  titel: string;
  tekst?: string;
  /** Pad binnen de site dat opent bij een klik (bijv. "/admin/order/…"). */
  url?: string;
}

export interface PushPayload {
  titel: string;
  tekst: string;
  url: string;
  /** Meldingen met dezelfde tag vervangen elkaar (bijv. een testmelding). */
  tag: string;
  soort: PushSoort | "test";
  tijd: number;
}

export const MAX_TITEL = 80;
export const MAX_TEKST = 240;

function kort(s: string, max: number): string {
  const plat = s.replace(/\s+/g, " ").trim();
  return plat.length > max ? `${plat.slice(0, max - 1).trimEnd()}…` : plat;
}

/** Alleen een relatief pad binnen de site ("/…", niet "//…"); anders /admin. */
export function veiligPad(url: unknown): string {
  if (typeof url !== "string") return "/admin";
  const u = url.trim();
  if (!u.startsWith("/") || u.startsWith("//") || u.startsWith("/\\") || /[\u0000-\u001f]/.test(u)) return "/admin";
  return u.slice(0, 500);
}

/** De inhoud zoals de service worker (public/sw.js) die verwacht. */
export function bouwPayload(soort: PushSoort | "test", bericht: PushBericht, nu = Date.now()): PushPayload {
  const url = veiligPad(bericht.url);
  return {
    titel: kort(bericht.titel || (soort === "test" ? "Testmelding" : PUSH_SOORT_LABEL[soort]), MAX_TITEL),
    tekst: kort(bericht.tekst ?? "", MAX_TEKST),
    url,
    // Per soort en pagina: twee meldingen over hetzelfde stapelen niet op.
    tag: `${soort}:${url}`,
    soort,
    tijd: nu,
  };
}

/** Of een antwoord van de pushdienst betekent dat het abonnement niet meer bestaat. */
export function isVerlopen(statusCode: unknown): boolean {
  return statusCode === 404 || statusCode === 410;
}

/** Of de VAPID-instellingen compleet zijn. */
export function vapidCompleet(env: { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string }): boolean {
  const pub = (env.VAPID_PUBLIC_KEY ?? "").trim();
  const priv = (env.VAPID_PRIVATE_KEY ?? "").trim();
  const sub = (env.VAPID_SUBJECT ?? "").trim();
  return Boolean(pub && priv && /^(mailto:\S+@\S+|https:\/\/\S+)$/.test(sub));
}
