// Webhooks van Resend: controle van de Svix-handtekening en het uitlezen van de
// gebeurtenis. Puur (geen database), zodat het los te testen is.
//
// Svix ondertekent `${svix-id}.${svix-timestamp}.${ruwe body}` met HMAC-SHA256.
// De sleutel is het base64-deel van het geheim na het voorvoegsel "whsec_". De
// header svix-signature kan meerdere handtekeningen bevatten ("v1,<sig> v1,<sig2>"),
// bijvoorbeeld tijdens het wisselen van het geheim.

import { createHmac, timingSafeEqual } from "node:crypto";

/** Hoe oud (of hoe ver in de toekomst) een tijdstempel mag zijn, in seconden. */
export const WEBHOOK_TOLERANTIE_S = 5 * 60;

function sleutel(geheim: string): Buffer {
  const ruw = geheim.trim().startsWith("whsec_") ? geheim.trim().slice("whsec_".length) : geheim.trim();
  return Buffer.from(ruw, "base64");
}

/** De v1-handtekening (base64) voor dit bericht. */
export function webhookHandtekening(geheim: string, id: string, tijdstempel: string, body: string): string {
  return createHmac("sha256", sleutel(geheim)).update(`${id}.${tijdstempel}.${body}`).digest("base64");
}

export interface WebhookKoppen {
  id: string | null;
  tijdstempel: string | null;
  handtekening: string | null;
}

/**
 * Controleert of het bericht echt van Resend komt en niet te oud is.
 * `nu` in milliseconden (voor tests).
 */
export function controleerWebhook(
  geheim: string,
  koppen: WebhookKoppen,
  body: string,
  nu: number = Date.now(),
): boolean {
  const { id, tijdstempel, handtekening } = koppen;
  if (!geheim || !id || !tijdstempel || !handtekening) return false;
  if (!/^\d{1,12}$/.test(tijdstempel)) return false;
  if (Math.abs(nu / 1000 - Number(tijdstempel)) > WEBHOOK_TOLERANTIE_S) return false;

  let verwacht: Buffer;
  try {
    verwacht = Buffer.from(webhookHandtekening(geheim, id, tijdstempel, body));
  } catch {
    return false;
  }
  let goed = false;
  for (const deel of handtekening.split(" ")) {
    const komma = deel.indexOf(",");
    if (komma < 0 || deel.slice(0, komma) !== "v1") continue;
    const gekregen = Buffer.from(deel.slice(komma + 1));
    // Geen vroege return: alle kandidaten even zwaar controleren.
    if (gekregen.length === verwacht.length && timingSafeEqual(gekregen, verwacht)) goed = true;
  }
  return goed;
}

export type WebhookActie =
  | { soort: "bounce"; emailId: string }
  | { soort: "klacht"; emailId: string }
  | { soort: "negeer"; reden: string };

/**
 * Wat we met een Resend-gebeurtenis doen. Opens en kliks meten we zelf; een
 * tijdelijke bounce (bijv. volle mailbox) laat het contact ongemoeid.
 */
export function bepaalWebhookActie(gebeurtenis: unknown): WebhookActie {
  if (!gebeurtenis || typeof gebeurtenis !== "object") return { soort: "negeer", reden: "geen object" };
  const g = gebeurtenis as { type?: unknown; data?: { email_id?: unknown; bounce?: { type?: unknown } } };
  const type = typeof g.type === "string" ? g.type : "";
  const emailId = typeof g.data?.email_id === "string" ? g.data.email_id : "";
  if (type === "email.bounced") {
    if (!emailId) return { soort: "negeer", reden: "geen email_id" };
    const bounceType = typeof g.data?.bounce?.type === "string" ? g.data.bounce.type : "";
    // Resend meldt harde bounces als "Permanent"; ontbreekt het type, dan is het
    // een (oudere) melding van een permanente bounce.
    if (bounceType && !/permanent/i.test(bounceType))
      return { soort: "negeer", reden: `tijdelijke bounce (${bounceType})` };
    return { soort: "bounce", emailId };
  }
  if (type === "email.complained") {
    if (!emailId) return { soort: "negeer", reden: "geen email_id" };
    return { soort: "klacht", emailId };
  }
  return { soort: "negeer", reden: type ? `gebeurtenis ${type}` : "onbekende gebeurtenis" };
}
