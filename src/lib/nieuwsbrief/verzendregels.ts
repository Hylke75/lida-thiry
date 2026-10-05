// Pure regels voor aanmelden en verzenden van de nieuwsbrief (zonder database of
// Resend), zodat ze te testen zijn. Zie contacten.ts en verzenden.ts.

import type { Bron, ContactStatus } from "./doelgroep";

/**
 * Welke status een bestaand (niet-aangemeld) contact krijgt bij een nieuwe
 * aanmelding, of null als er niets mag veranderen.
 *
 * - Een klacht (spammelding) blijft altijd staan.
 * - Via een openbaar formulier wordt een afgemeld of onbestelbaar adres nooit
 *   direct weer actief: dan eerst bevestigen (dubbele opt-in), ongeacht de
 *   instelling van het formulier. Anders kan iedereen een ander weer aanmelden.
 *   Dat geldt ook als zo'n adres al op 'onbevestigd' staat (bevestigd_op is dan
 *   gevuld van de eerdere aanmelding), zodat twee keer insturen niet helpt.
 * - Bij een bestelling (vinkje) of handmatig door de beheerder mag het direct.
 */
export function statusNaAanmelding(
  huidig: { status: ContactStatus; bevestigd_op: string | null },
  bron: Bron,
  dubbeleOptIn: boolean,
): "aangemeld" | "onbevestigd" | null {
  if (huidig.status === "klacht" || huidig.status === "aangemeld") return null;
  if (dubbeleOptIn) return "onbevestigd";
  if (bron === "bestelling" || bron === "handmatig") return "aangemeld";
  // Openbaar formulier zonder dubbele opt-in: alleen een nooit eerder bevestigd adres direct.
  return huidig.status === "onbevestigd" && !huidig.bevestigd_op ? "aangemeld" : "onbevestigd";
}

/** Uitkomst per mail van een batch-aanroep: het Resend-id of de foutmelding. */
export type BatchUitkomst = { id: string | null } | { fout: string };

/**
 * Koppelt het antwoord van Resend (batchValidation 'permissive') terug aan de
 * mails: `errors` noemt de index van elke geweigerde mail; `data` bevat de ids
 * van de geaccepteerde mails, in volgorde.
 */
export function koppelBatchUitkomst(
  aantal: number,
  data: readonly { id: string }[] | null | undefined,
  errors: readonly { index: number; message: string }[] | null | undefined,
): BatchUitkomst[] {
  const fouten = new Map<number, string>();
  for (const e of errors ?? []) {
    if (Number.isInteger(e.index) && e.index >= 0 && e.index < aantal) fouten.set(e.index, e.message || "Geweigerd door Resend.");
  }
  const ids = [...(data ?? [])];
  // Geeft Resend toch voor elke mail een regel terug, dan horen die bij dezelfde index.
  const perIndex = ids.length === aantal && fouten.size > 0;
  if (perIndex) return ids.map((d, i) => (fouten.has(i) ? { fout: fouten.get(i)! } : { id: d?.id ?? null }));
  const uit: BatchUitkomst[] = [];
  let j = 0;
  for (let i = 0; i < aantal; i++) {
    const fout = fouten.get(i);
    if (fout !== undefined) uit.push({ fout });
    else uit.push({ id: ids[j++]?.id ?? null });
  }
  return uit;
}

/**
 * Een fout waarbij later opnieuw proberen zin heeft (limiet of quotum van
 * Resend bereikt): de mails blijven dan in de wachtrij in plaats van 'mislukt'.
 */
export function isTijdelijkeLimiet(
  fout: { statusCode?: number | null; name?: string | null; message?: string } | null | undefined,
): boolean {
  if (!fout) return false;
  if (fout.statusCode === 429) return true;
  return ["rate_limit_exceeded", "daily_quota_exceeded", "monthly_quota_exceeded", "concurrent_idempotent_requests"].includes(
    fout.name ?? "",
  );
}

/** Of de daglimiet de wachtrij tegenhoudt: er staat nog iets klaar en de ruimte is op. */
export function daglimietBereikt(opts: { maxPerDag: number; verbruiktVandaag: number; nogInWachtrij: number }): boolean {
  return opts.nogInWachtrij > 0 && opts.verbruiktVandaag >= opts.maxPerDag;
}
