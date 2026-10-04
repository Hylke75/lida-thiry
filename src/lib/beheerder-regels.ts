// Regels voor het beheer van beheerders en wachtwoorden. Puur (testbaar).

export const MIN_WACHTWOORD = 10;
const MAX_WACHTWOORD = 72; // bcrypt (Supabase) gebruikt niet meer dan 72 bytes.

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Genormaliseerd e-mailadres (kleine letters, zonder spaties), of null als het ongeldig is. */
export function normaliseerEmail(invoer: unknown): string | null {
  if (typeof invoer !== "string") return null;
  const v = invoer.trim().toLowerCase();
  return v.length <= 254 && EMAIL.test(v) ? v : null;
}

/** Waarom een beheerder niet verwijderd mag worden, of null als het mag. */
export function verwijderBezwaar(opts: { mijnId: string; doelId: string; aantalBeheerders: number }): string | null {
  if (opts.doelId === opts.mijnId) return "Je kunt jezelf niet verwijderen. Laat dat een andere beheerder doen.";
  if (opts.aantalBeheerders <= 1) return "Dit is de laatste beheerder; die kan niet verwijderd worden.";
  return null;
}

/** Foutmelding bij een nieuw wachtwoord (twee keer ingevuld), of null als het goed is. */
export function wachtwoordBezwaar(wachtwoord: unknown, herhaling: unknown): string | null {
  if (typeof wachtwoord !== "string" || wachtwoord.length === 0) return "Vul een nieuw wachtwoord in.";
  if (wachtwoord.length < MIN_WACHTWOORD) return `Kies een wachtwoord van minstens ${MIN_WACHTWOORD} tekens.`;
  if (new TextEncoder().encode(wachtwoord).length > MAX_WACHTWOORD) return `Kies een wachtwoord van hoogstens ${MAX_WACHTWOORD} tekens.`;
  if (wachtwoord.trim() !== wachtwoord) return "Begin of eindig het wachtwoord niet met een spatie.";
  if (wachtwoord !== herhaling) return "De twee wachtwoorden zijn niet gelijk.";
  return null;
}

/** Alleen een pad binnen de site (geen //andere-site.nl), anders de standaard. */
export function veiligVervolg(pad: unknown, standaard = "/admin"): string {
  if (typeof pad !== "string" || !pad.startsWith("/") || pad.startsWith("//") || pad.includes("\\")) return standaard;
  return pad;
}
