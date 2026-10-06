// Pure regels voor de betaalherinnering: welke niet-afgeronde bestellingen krijgen
// (eenmalig) een vriendelijke mail met een link om de betaling af te ronden?

import { BETAALDE_STATUSSEN, OPEN_STATUSSEN } from "./order-status";

/** Statussen van een bestelling waarvan de betaling niet is afgerond (zie order-status.ts). */
export { OPEN_STATUSSEN };
/** Statussen die betekenen dat er betaald is (zie order-status.ts). */
export const BETAALD_STATUSSEN = BETAALDE_STATUSSEN;
/** Standaard: ouder dan dit krijgt geen herinnering meer (instelling betaalherinnering_max_dagen). */
export const MAX_LEEFTIJD_DAGEN = 7;
/** Standaard: zo lang blijft de link in de herinnering geldig (instelling betaalherinnering_link_dagen). */
export const LINK_GELDIG_DAGEN = 7;

export interface OpenBestelling {
  id: string;
  email: string;
  status: string;
  bedrag_cent: number | null;
  aangemaakt_op: string;
  betaalherinnering_op: string | null;
}

export interface BetaaldeBestelling {
  email: string;
  aangemaakt_op: string;
}

/**
 * Leest het aantal uur uit de instelling; standaard 24, minimaal 1, maximaal een
 * dag minder dan de maximale leeftijd (standaard 6 dagen).
 */
export function herinneringNaUren(waarde: string | null | undefined, maxLeeftijdDagen: number = MAX_LEEFTIJD_DAGEN): number {
  const n = Number(waarde);
  if (!waarde || !Number.isFinite(n) || n <= 0) return 24;
  return Math.min(Math.max(Math.round(n), 1), (maxLeeftijdDagen - 1) * 24);
}

/**
 * Kiest de bestellingen die een herinnering krijgen:
 * - betaling niet afgerond, bedrag > 0, nog geen herinnering gehad;
 * - ouder dan `naUren` uur en jonger dan MAX_LEEFTIJD_DAGEN;
 * - hetzelfde e-mailadres heeft sindsdien (of tegelijk) geen betaalde bestelling;
 * - per e-mailadres alleen de nieuwste; de oudere worden ook als 'gehad'
 *   gemarkeerd (`overslaan`), zodat niemand meerdere herinneringen krijgt.
 */
export function selecteerBetaalherinneringen(
  open: readonly OpenBestelling[],
  betaald: readonly BetaaldeBestelling[],
  nu: Date,
  naUren: number,
  maxLeeftijdDagen: number = MAX_LEEFTIJD_DAGEN,
): { versturen: OpenBestelling[]; overslaan: OpenBestelling[] } {
  const bovengrens = nu.getTime() - naUren * 60 * 60 * 1000;
  const ondergrens = nu.getTime() - maxLeeftijdDagen * 24 * 60 * 60 * 1000;
  const laatstBetaald = new Map<string, number>();
  for (const b of betaald) {
    const email = b.email.toLowerCase();
    const t = new Date(b.aangemaakt_op).getTime();
    if (t > (laatstBetaald.get(email) ?? -Infinity)) laatstBetaald.set(email, t);
  }

  const kandidaten = open.filter((o) => {
    const t = new Date(o.aangemaakt_op).getTime();
    return (
      (OPEN_STATUSSEN as readonly string[]).includes(o.status) &&
      !o.betaalherinnering_op &&
      (o.bedrag_cent ?? 0) > 0 &&
      t <= bovengrens &&
      t >= ondergrens
    );
  });

  const versturen: OpenBestelling[] = [];
  const overslaan: OpenBestelling[] = [];
  const perEmail = new Map<string, OpenBestelling[]>();
  for (const o of kandidaten) {
    const email = o.email.toLowerCase();
    perEmail.set(email, [...(perEmail.get(email) ?? []), o]);
  }
  for (const [email, lijst] of perEmail) {
    const gesorteerd = [...lijst].sort(
      (a, b) => new Date(b.aangemaakt_op).getTime() - new Date(a.aangemaakt_op).getTime(),
    );
    const [nieuwste, ...ouder] = gesorteerd;
    overslaan.push(...ouder);
    const betaaldOp = laatstBetaald.get(email);
    if (betaaldOp !== undefined && betaaldOp >= new Date(nieuwste.aangemaakt_op).getTime()) {
      overslaan.push(nieuwste);
    } else {
      versturen.push(nieuwste);
    }
  }
  return { versturen, overslaan };
}
