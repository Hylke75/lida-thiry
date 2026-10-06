// Gedeelde statusinformatie voor de beheerpagina's. De lijsten zelf staan in
// src/lib/order-status.ts.
import * as S from "@/lib/order-status";

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
  // Volledig terugbetaald en de toegang ingetrokken (zie order-status.ts).
  terugbetaald: "Terugbetaald (geen toegang meer)",
};

/** Statussen waarbij er betaald is. */
export const BETAALDE_STATUSSEN: string[] = [...S.BETAALDE_STATUSSEN];

/** Statussen waarbij de test is ingevuld. */
export const AFGERONDE_STATUSSEN: string[] = [...S.AFGERONDE_STATUSSEN];

/** Statussen die meetellen voor de omzet. */
export const OMZET_STATUSSEN: string[] = [...S.OMZET_STATUSSEN];

export function statusLabel(status: string): string {
  return STATUS_LABEL[status] ?? status;
}
