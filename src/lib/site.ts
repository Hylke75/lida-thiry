/**
 * Naam van het bedrijf als er (nog) geen eigen bedrijfsnaam is ingesteld: in mails,
 * facturen, PDF's en gestructureerde gegevens.
 */
export const BEDRIJFSNAAM_STANDAARD = "Lida Thiry Imago & Kledingadvies";

/**
 * Bepaalt de publieke basis-URL van de site. Nodig voor Mollie redirect/webhook
 * (moeten absoluut en https zijn) en voor de testlink in de mail.
 */
export function siteUrl(): string {
  const expliciet = process.env.NEXT_PUBLIC_SITE_URL;
  if (expliciet) return expliciet.replace(/\/$/, "");
  const vercel = process.env.VERCEL_URL;
  if (vercel) return `https://${vercel}`;
  return "http://localhost:3000";
}
