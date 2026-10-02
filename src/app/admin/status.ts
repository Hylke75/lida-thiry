// Gedeelde statusinformatie voor de beheerpagina's.

export const STATUS_LABEL: Record<string, string> = {
  aangemaakt: "Aangemaakt (nog niet betaald)",
  betaald: "Betaald, test nog niet gedaan",
  test_afgerond: "Test afgerond",
  advies_verzonden: "Advies verzonden",
  betaling_mislukt: "Betaling mislukt",
  verlopen: "Betaling verlopen",
  // Oude status: handmatige beoordeling bestaat niet meer, maar oude bestellingen
  // kunnen deze status nog hebben.
  handmatige_beoordeling: "Handmatige beoordeling (oud)",
};

/** Statussen waarbij er betaald is. */
export const BETAALDE_STATUSSEN = [
  "betaald",
  "test_afgerond",
  "advies_verzonden",
  "handmatige_beoordeling",
];

/** Statussen waarbij de test is ingevuld. */
export const AFGERONDE_STATUSSEN = ["test_afgerond", "advies_verzonden", "handmatige_beoordeling"];

/** Statussen die meetellen voor de omzet. */
export const OMZET_STATUSSEN = ["betaald", "test_afgerond", "advies_verzonden"];

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
