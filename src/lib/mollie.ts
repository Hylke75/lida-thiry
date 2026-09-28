import "server-only";
import { createMollieClient } from "@mollie/api-client";

/** Mollie-client (testmodus zolang de sleutel met test_ begint). */
export function mollie() {
  const apiKey = process.env.MOLLIE_API_KEY;
  if (!apiKey) throw new Error("MOLLIE_API_KEY ontbreekt (server).");
  return createMollieClient({ apiKey });
}

/** Formatteert centen naar het Mollie-bedragformaat (bijv. "24.95"). */
export function centenNaarBedrag(cent: number): string {
  return (cent / 100).toFixed(2);
}
