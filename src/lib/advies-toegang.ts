// Wanneer mag een klant haar advies (nog) downloaden? Puur, zodat het los te testen is.

import { ADVIES_STATUSSEN } from "./order-status";

/** Zo lang na het afronden van de test blijft de PDF via de testlink beschikbaar. */
const PDF_BESCHIKBAAR_DAGEN = 365;

const AFGEROND: readonly string[] = ADVIES_STATUSSEN;

export interface AdviesOrder {
  status: string;
  toegekend_type: string | null;
  afgerond_op: string | null;
  token_verloopt_op: string | null;
}

/** Is de testlink zelf verlopen (voor het invullen van de test)? */
export function tokenVerlopen(order: AdviesOrder, nu: Date = new Date()): boolean {
  return Boolean(order.token_verloopt_op && new Date(order.token_verloopt_op) < nu);
}

/**
 * Advies downloadbaar: test afgerond met een type, en de testlink is nog geldig
 * óf de test is minder dan PDF_BESCHIKBAAR_DAGEN geleden afgerond.
 */
export function adviesDownloadbaar(order: AdviesOrder, nu: Date = new Date()): boolean {
  if (!AFGEROND.includes(order.status) || !order.toegekend_type) return false;
  if (!tokenVerlopen(order, nu)) return true;
  if (!order.afgerond_op) return false;
  const grens = new Date(order.afgerond_op).getTime() + PDF_BESCHIKBAAR_DAGEN * 24 * 60 * 60 * 1000;
  return nu.getTime() < grens;
}
