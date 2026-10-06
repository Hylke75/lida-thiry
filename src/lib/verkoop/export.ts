// Pure regels voor de CSV-exports voor de boekhouding: bestellingen, cadeaubonnen
// en creditnota's binnen een periode. Het veilig maken van de cellen (formules,
// scheidingstekens) doet maakCsv uit nieuwsbrief/csv.ts.

import { btwSplitsing } from "../prijs";
import { datumPlusDagen, leesDatum, naarAmsterdam, vanAmsterdam } from "../datum";

export type ExportSoort = "bestellingen" | "cadeaubonnen" | "creditnotas";

export const EXPORT_SOORTEN: readonly ExportSoort[] = ["bestellingen", "cadeaubonnen", "creditnotas"];

export function isExportSoort(v: unknown): v is ExportSoort {
  return typeof v === "string" && (EXPORT_SOORTEN as readonly string[]).includes(v);
}

/** Grootste periode in één export (dagen). */
export const MAX_EXPORT_DAGEN = 3 * 366;

/**
 * Periode (yyyy-mm-dd, beide inclusief, Nederlandse tijd) naar UTC-grenzen:
 * vanaf het begin van `van` tot (exclusief) het begin van de dag na `tot`.
 */
export function exportPeriode(
  van: string | null | undefined,
  tot: string | null | undefined,
): { ok: true; vanIso: string; totIso: string; van: string; tot: string } | { ok: false; fout: string } {
  const v = (van ?? "").trim();
  const t = (tot ?? "").trim();
  if (!leesDatum(v) || !leesDatum(t)) return { ok: false, fout: "Kies een geldige begin- en einddatum." };
  if (t < v) return { ok: false, fout: "De einddatum ligt vóór de begindatum." };
  const vanD = vanAmsterdam(v, 0);
  const totD = vanAmsterdam(datumPlusDagen(t, 1), 0);
  if (totD.getTime() - vanD.getTime() > MAX_EXPORT_DAGEN * 24 * 60 * 60 * 1000) {
    return { ok: false, fout: "Kies een periode van hooguit drie jaar." };
  }
  return { ok: true, vanIso: vanD.toISOString(), totIso: totD.toISOString(), van: v, tot: t };
}

/** Bedrag in centen als "29,95" (zoals een Nederlandse spreadsheet het verwacht). */
export function csvBedrag(cent: number | null | undefined): string {
  const c = Math.round(cent ?? 0);
  const teken = c < 0 ? "-" : "";
  const abs = Math.abs(c);
  return `${teken}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, "0")}`;
}

/** Moment als "2026-10-06" (Nederlandse datum), of leeg. */
function csvDatum(moment: string | null | undefined): string {
  if (!moment) return "";
  const d = new Date(moment);
  return Number.isNaN(d.getTime()) ? "" : naarAmsterdam(d).datum;
}

function veld(g: unknown, naam: string): string {
  const f = g && typeof g === "object" ? (g as Record<string, unknown>) : {};
  return typeof f[naam] === "string" ? (f[naam] as string) : "";
}

export interface ExportOrder {
  id: string;
  klantnaam: string;
  email: string;
  factuurgegevens: unknown;
  status: string;
  bedrag_cent: number | null;
  korting_cent: number | null;
  kortingscode: string | null;
  valuta: string | null;
  betaald_op: string | null;
  factuurnummer: string | null;
  mollie_payment_id: string | null;
  betaalwijze: string | null;
  btw_procent: number | null;
  terugbetaald_cent: number | null;
}

const BETAALWIJZE_LABEL: Record<string, string> = {
  mollie: "Mollie",
  korting: "Kortingscode/cadeaubon",
  overboeking: "Buiten Mollie (overboeking)",
  gratis: "Gratis (beheer)",
};

/** Betaalwijze voor de export; oude bestellingen zonder waarde: Mollie of korting. */
export function betaalwijzeLabel(o: Pick<ExportOrder, "betaalwijze" | "mollie_payment_id" | "kortingscode" | "bedrag_cent">): string {
  if (o.betaalwijze && BETAALWIJZE_LABEL[o.betaalwijze]) return BETAALWIJZE_LABEL[o.betaalwijze];
  if (o.mollie_payment_id) return BETAALWIJZE_LABEL.mollie;
  if (o.kortingscode) return BETAALWIJZE_LABEL.korting;
  return (o.bedrag_cent ?? 0) > 0 ? "" : BETAALWIJZE_LABEL.gratis;
}

export function orderExportRijen(orders: readonly ExportOrder[], standaardBtw: number): string[][] {
  const kop = [
    "Betaald op",
    "Factuurnummer",
    "Klantnaam",
    "E-mail",
    "Adres",
    "Postcode",
    "Plaats",
    "Land",
    "Status",
    "Betaalwijze",
    "Prijs vóór korting",
    "Korting",
    "Kortingscode",
    "Totaal incl. btw",
    "Btw %",
    "Btw",
    "Totaal excl. btw",
    "Terugbetaald",
    "Valuta",
    "Mollie-betaling",
    "Bestelling",
  ];
  const rijen = orders.map((o) => {
    const totaal = o.bedrag_cent ?? 0;
    const korting = o.korting_cent ?? 0;
    const btw = o.btw_procent ?? standaardBtw;
    const split = btwSplitsing(totaal, btw);
    return [
      csvDatum(o.betaald_op),
      o.factuurnummer ?? "",
      o.klantnaam,
      o.email,
      veld(o.factuurgegevens, "adres"),
      veld(o.factuurgegevens, "postcode"),
      veld(o.factuurgegevens, "plaats"),
      veld(o.factuurgegevens, "land"),
      o.status,
      betaalwijzeLabel(o),
      csvBedrag(totaal + korting),
      csvBedrag(korting),
      o.kortingscode ?? "",
      csvBedrag(split.inclCent),
      String(btw),
      csvBedrag(split.btwCent),
      csvBedrag(split.exclCent),
      csvBedrag(o.terugbetaald_cent ?? 0),
      o.valuta || "EUR",
      o.mollie_payment_id ?? "",
      o.id,
    ];
  });
  return [kop, ...rijen];
}

export interface ExportCadeaubon {
  id: string;
  koper_naam: string;
  koper_email: string;
  ontvanger_naam: string | null;
  bedrag_cent: number;
  valuta: string | null;
  status: string;
  betaald_op: string | null;
  factuurnummer: string | null;
  mollie_payment_id: string | null;
  btw_procent: number | null;
  terugbetaald_cent: number | null;
  /** De code van de bon (alleen de laatste tekens: het is een tegoed). */
  code: string | null;
  code_gebruikt: boolean | null;
}

/** Laat alleen de laatste vier tekens van een cadeauboncode zien. */
export function maskeerCode(code: string | null | undefined): string {
  if (!code) return "";
  return code.length <= 4 ? code : `…${code.slice(-4)}`;
}

export function cadeaubonExportRijen(bonnen: readonly ExportCadeaubon[], standaardBtw: number): string[][] {
  const kop = [
    "Betaald op",
    "Factuurnummer",
    "Koper",
    "E-mail koper",
    "Ontvanger",
    "Status",
    "Bedrag incl. btw",
    "Btw %",
    "Btw",
    "Bedrag excl. btw",
    "Terugbetaald",
    "Valuta",
    "Code",
    "Code gebruikt",
    "Mollie-betaling",
    "Cadeaubon",
  ];
  const rijen = bonnen.map((b) => {
    const btw = b.btw_procent ?? standaardBtw;
    const split = btwSplitsing(b.bedrag_cent, btw);
    return [
      csvDatum(b.betaald_op),
      b.factuurnummer ?? "",
      b.koper_naam,
      b.koper_email,
      b.ontvanger_naam ?? "",
      b.status,
      csvBedrag(split.inclCent),
      String(btw),
      csvBedrag(split.btwCent),
      csvBedrag(split.exclCent),
      csvBedrag(b.terugbetaald_cent ?? 0),
      b.valuta || "EUR",
      maskeerCode(b.code),
      b.code_gebruikt == null ? "" : b.code_gebruikt ? "ja" : "nee",
      b.mollie_payment_id ?? "",
      b.id,
    ];
  });
  return [kop, ...rijen];
}

export interface ExportCreditnota {
  nummer: string;
  origineel_nummer: string | null;
  soort: string;
  naam: string;
  email: string;
  bedrag_cent: number;
  btw_procent: number;
  valuta: string | null;
  reden: string | null;
  mollie_refund_id: string | null;
  aangemaakt_op: string;
}

/** Creditnota's met negatieve bedragen (zoals ze in de boekhouding horen). */
export function creditnotaExportRijen(notas: readonly ExportCreditnota[]): string[][] {
  const kop = [
    "Datum",
    "Creditnotanummer",
    "Betreft factuur",
    "Soort",
    "Naam",
    "E-mail",
    "Bedrag incl. btw",
    "Btw %",
    "Btw",
    "Bedrag excl. btw",
    "Valuta",
    "Reden",
    "Mollie-terugbetaling",
  ];
  const rijen = notas.map((c) => {
    const split = btwSplitsing(c.bedrag_cent, c.btw_procent);
    return [
      csvDatum(c.aangemaakt_op),
      c.nummer,
      c.origineel_nummer ?? "",
      c.soort,
      c.naam,
      c.email,
      csvBedrag(-split.inclCent),
      String(c.btw_procent),
      csvBedrag(-split.btwCent),
      csvBedrag(-split.exclCent),
      c.valuta || "EUR",
      c.reden ?? "",
      c.mollie_refund_id ?? "",
    ];
  });
  return [kop, ...rijen];
}
