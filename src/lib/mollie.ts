import "server-only";
import { createMollieClient } from "@mollie/api-client";
import { siteUrl } from "./site";

/** Mollie-client (testmodus zolang de sleutel met test_ begint). */
export function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt (server).");
  return createMollieClient({ apiKey });
}

/** Formatteert centen naar het Mollie-bedragformaat (bijv. "24.95"). */
function centenNaarBedrag(cent: number): string {
  return (cent / 100).toFixed(2);
}

/**
 * Maakt een Mollie-betaling met redirect naar `redirectPad` (op deze site) en de
 * gedeelde webhook. Lokaal (localhost) zonder webhook: Mollie weigert een
 * onbereikbare webhook. Gooit bij fouten.
 */
export async function startBetaling(opts: {
  bedragCent: number;
  valuta?: string | null;
  omschrijving: string;
  redirectPad: string;
  metadata: Record<string, string>;
}): Promise<{ id: string; checkoutUrl: string | null }> {
  const basis = siteUrl();
  const lokaal = basis.startsWith("http://localhost");
  const betaling = await mollie().payments.create({
    amount: { currency: opts.valuta || "EUR", value: centenNaarBedrag(opts.bedragCent) },
    description: opts.omschrijving,
    redirectUrl: `${basis}${opts.redirectPad}`,
    ...(lokaal ? {} : { webhookUrl: `${basis}/api/mollie/webhook` }),
    metadata: opts.metadata,
  });
  return { id: betaling.id, checkoutUrl: betaling.getCheckoutUrl() };
}

/** Annuleert een (open) betaling als dat nog kan. Gooit nooit. */
export async function annuleerBetaling(id: string): Promise<void> {
  try {
    await mollie().payments.cancel(id);
  } catch (e) {
    console.error("Betaling annuleren mislukt", id, e);
  }
}

/**
 * Betaalt (een deel van) een Mollie-betaling terug. De Mollie-client herhaalt
 * een mislukt verzoek zelf met dezelfde idempotentiesleutel (geen dubbele
 * terugbetaling); dubbelklikken vangt de aanroeper af. Gooit bij fouten (bijv.
 * onvoldoende saldo bij Mollie).
 */
export async function terugbetalen(opts: {
  betaalId: string;
  bedragCent: number;
  valuta?: string | null;
  omschrijving: string;
  metadata?: Record<string, string>;
}): Promise<{ id: string; status: string }> {
  const refund = await mollie().paymentRefunds.create({
    paymentId: opts.betaalId,
    amount: { currency: opts.valuta || "EUR", value: centenNaarBedrag(opts.bedragCent) },
    description: opts.omschrijving,
    ...(opts.metadata ? { metadata: opts.metadata } : {}),
  });
  return { id: refund.id, status: String(refund.status) };
}
