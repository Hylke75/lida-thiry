// Afzender en antwoordadres van de mails. Puur, zodat het te testen is.
//
// Het adres zelf komt altijd uit RESEND_VAN (een geverifieerd Resend-domein; dat
// kan alleen in Vercel veranderen). De naam die ontvangers zien, is in te stellen
// in Beheer → Website → Instellingen (afzender_naam); antwoorden van klanten gaan
// naar het contact-e-mailadres (Beheer → Instellingen → contact_email).

import { geldigEmail } from "./email";

/** Zolang RESEND_VAN niet is ingesteld (alleen voor testen: Resend stuurt dan alleen naar de eigenaar). */
export const STANDAARD_AFZENDER = "Lida Thiry <onboarding@resend.dev>";

/** Het e-mailadres uit "Naam <adres>" of uit een los adres. */
export function afzenderAdres(van: string): string {
  const m = van.match(/<([^<>]+)>\s*$/);
  return (m ? m[1] : van).trim();
}

/** Een weergavenaam veilig voor de From-kop: geen regeleinden of adrestekens; zo nodig tussen aanhalingstekens. */
export function schoneAfzenderNaam(naam: string | null | undefined): string | null {
  const n = (naam ?? "").replace(/[\r\n<>"@\\]/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (!n) return null;
  return /[(),.:;[\]]/.test(n) ? `"${n}"` : n;
}

/** De From-kop: de ingestelde naam met het adres uit RESEND_VAN; zonder naam RESEND_VAN zoals het is. */
export function afzenderMetNaam(van: string | null | undefined, naam: string | null | undefined): string {
  const basis = van?.trim() || STANDAARD_AFZENDER;
  const n = schoneAfzenderNaam(naam);
  return n ? `${n} <${afzenderAdres(basis)}>` : basis;
}

/** Afzender en (als het contactadres geldig is) het antwoordadres voor klantmails. */
export function afzenderGegevens(
  van: string | null | undefined,
  instellingen: Readonly<Record<string, string | null | undefined>>,
): { from: string; replyTo?: string } {
  const antwoord = instellingen.contact_email?.trim();
  return {
    from: afzenderMetNaam(van, instellingen.afzender_naam),
    ...(antwoord && geldigEmail(antwoord) ? { replyTo: antwoord } : {}),
  };
}
