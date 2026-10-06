// Canonieke statuslijsten van een bestelling (orders.status). Puur, zodat het
// overal (ook client-side en in tests) te gebruiken is.

/** Betaling (nog) niet afgerond. */
export const OPEN_STATUSSEN = ["aangemaakt", "verlopen", "betaling_mislukt"] as const;

/** Er is betaald (ook de oude status handmatige_beoordeling). */
export const BETAALDE_STATUSSEN = ["betaald", "test_afgerond", "handmatige_beoordeling", "advies_verzonden"] as const;

/** De test is ingevuld. */
export const AFGERONDE_STATUSSEN = ["test_afgerond", "advies_verzonden", "handmatige_beoordeling"] as const;

/** Tellen mee voor de omzet. */
export const OMZET_STATUSSEN = ["betaald", "test_afgerond", "advies_verzonden"] as const;

/** Test afgerond met een (automatisch) advies: de PDF kan bestaan. */
export const ADVIES_STATUSSEN = ["test_afgerond", "advies_verzonden"] as const;

export function isBetaald(status: string | null | undefined): boolean {
  return (BETAALDE_STATUSSEN as readonly string[]).includes(status ?? "");
}

export function isOpen(status: string | null | undefined): boolean {
  return (OPEN_STATUSSEN as readonly string[]).includes(status ?? "");
}

/** Gratis testmodus (env GRATIS_TEST) staat alleen aan met precies "1". */
export function gratisTestAan(waarde: string | undefined = process.env.GRATIS_TEST): boolean {
  return waarde === "1";
}

/**
 * Volledig terugbetaald en de toegang tot de test ingetrokken. Hoort bewust in
 * géén van de lijsten hierboven: geen toegang tot de test of het advies, telt
 * niet mee voor de omzet en wordt niet opnieuw afgehandeld.
 */
export const TERUGBETAALD_STATUS = "terugbetaald";

/** Standaard: zo lang na betalen toont de bedankpagina de startknop (met testlink). */
export const TESTLINK_ZICHTBAAR_UREN = 2;

/**
 * Is de bestelling zo recent betaald dat de bedankpagina de testlink nog toont?
 * `uren` komt uit de instelling testlink_zichtbaar_uren.
 */
export function testlinkNogTonen(
  betaaldOp: string | null,
  nu: Date = new Date(),
  uren: number = TESTLINK_ZICHTBAAR_UREN,
): boolean {
  if (!betaaldOp) return false;
  const t = new Date(betaaldOp).getTime();
  return Number.isFinite(t) && nu.getTime() - t < uren * 60 * 60 * 1000;
}
