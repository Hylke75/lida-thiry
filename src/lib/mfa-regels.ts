// Regels voor tweestapsverificatie (Supabase MFA, TOTP). Puur (testbaar).

export type MfaNiveau = "aal1" | "aal2" | null;

export interface FactorLike {
  id: string;
  status: string;
  factor_type: string;
  friendly_name?: string | null;
}

/** Alleen geverifieerde factoren tellen (een niet-afgeronde koppeling niet). */
export function geverifieerdeFactoren<T extends FactorLike>(factoren: readonly T[] | null | undefined): T[] {
  return (factoren ?? []).filter((f) => f.status === "verified" && f.factor_type !== "recovery_code");
}

/**
 * - "ok": door.
 * - "code_nodig": de gebruiker heeft tweestapsverificatie, maar deze sessie is
 *   nog niet met een code bevestigd (aal1) → eerst de code invullen.
 * - "instellen_nodig": tweestapsverificatie is verplicht en de gebruiker heeft
 *   nog geen factor → eerst instellen op /admin/beveiliging.
 */
export type MfaUitkomst = "ok" | "code_nodig" | "instellen_nodig";

export function mfaUitkomst(opts: { heeftFactor: boolean; niveau: MfaNiveau; verplicht: boolean }): MfaUitkomst {
  if (opts.heeftFactor) return opts.niveau === "aal2" ? "ok" : "code_nodig";
  return opts.verplicht ? "instellen_nodig" : "ok";
}

/** De instelling `mfa_verplicht`: alleen "ja" (hoofdletterongevoelig) zet het aan. */
export function mfaVerplicht(waarde: string | null | undefined): boolean {
  return (waarde ?? "").trim().toLowerCase() === "ja";
}

/** Een ingevulde code: 6 cijfers (spaties en streepjes mogen). Anders null. */
export function normaliseerCode(invoer: unknown): string | null {
  if (typeof invoer !== "string") return null;
  const v = invoer.replace(/[\s-]/g, "");
  return /^\d{6}$/.test(v) ? v : null;
}

/** Een herkenbare naam voor een nieuwe authenticator-app (uniek per gebruiker). */
export function factorNaam(bestaand: readonly { friendly_name?: string | null }[], gewenst?: string | null): string {
  const basis = (gewenst ?? "").trim().slice(0, 40) || "Authenticator-app";
  const namen = new Set(bestaand.map((f) => f.friendly_name ?? ""));
  if (!namen.has(basis)) return basis;
  for (let i = 2; i < 100; i++) {
    const kandidaat = `${basis} ${i}`;
    if (!namen.has(kandidaat)) return kandidaat;
  }
  return `${basis} ${Date.now()}`;
}
