// Pure hulpfuncties voor de beheerpagina's van de beeldbank: filteren,
// pagineren, groeperen en het controleren van de invoer. Geen server- of
// browserafhankelijkheden, zodat ze los te testen zijn.

import {
  ADVIEZEN,
  NAAM_PATROON,
  isTeKlein,
  minFormaat,
} from "./beeldbank-regels";
import { CODE_PATROON } from "./lichaamstype-regels";

export const PER_PAGINA = 48;

export const STATUSSEN = ["origineel", "vervangen", "goedgekeurd"] as const;
export type BeeldStatus = (typeof STATUSSEN)[number];

export const STATUS_LABELS: Record<BeeldStatus, string> = {
  origineel: "Origineel",
  vervangen: "Vervangen",
  goedgekeurd: "Goedgekeurd",
};

export interface Filters {
  zoek: string;
  onderdeel: string;
  status: string;
  teKlein: boolean;
  ongebruikt: boolean;
  pagina: number;
}

type Param = string | string[] | undefined;

function eerste(p: Param): string {
  return (Array.isArray(p) ? p[0] : p) ?? "";
}

/** Leest de filters uit de zoekparameters van de lijstpagina. */
export function leesFilters(sp: Record<string, Param>): Filters {
  const status = eerste(sp.status);
  const pagina = Number.parseInt(eerste(sp.pagina), 10);
  return {
    zoek: eerste(sp.zoek).trim().slice(0, 100),
    onderdeel: eerste(sp.onderdeel).trim(),
    status: (STATUSSEN as readonly string[]).includes(status) ? status : "",
    teKlein: eerste(sp.teklein) === "1",
    ongebruikt: eerste(sp.ongebruikt) === "1",
    pagina: Number.isFinite(pagina) && pagina > 1 ? pagina : 1,
  };
}

/** Bouwt de URL van de lijstpagina met (gewijzigde) filters. */
export function filterHref(f: Filters, wijziging: Partial<Filters> = {}): string {
  const n = { ...f, ...wijziging };
  const q = new URLSearchParams();
  if (n.zoek) q.set("zoek", n.zoek);
  if (n.onderdeel) q.set("onderdeel", n.onderdeel);
  if (n.status) q.set("status", n.status);
  if (n.teKlein) q.set("teklein", "1");
  if (n.ongebruikt) q.set("ongebruikt", "1");
  if (n.pagina > 1) q.set("pagina", String(n.pagina));
  const s = q.toString();
  return s ? `/admin/beeldbank?${s}` : "/admin/beeldbank";
}

export interface LijstBeeld {
  id: string;
  code: string;
  naam: string | null;
  onderdeel: string | null;
  omschrijving: string | null;
  bijschrift: string | null;
  status: string;
  breedte: number | null;
  hoogte: number | null;
  min_breedte: number | null;
  min_hoogte: number | null;
}

/** Sorteert beeldcodes op nummer (B0002 vóór B0010). */
export function vergelijkCode(a: string, b: string): number {
  return a.localeCompare(b, "nl", { numeric: true });
}

/** Filtert en sorteert (op code) de beelden volgens de filters. */
export function filterBeelden<T extends LijstBeeld>(
  rijen: T[],
  f: Filters,
  gebruik: Record<string, number>,
): T[] {
  const zoek = f.zoek.toLowerCase();
  return rijen
    .filter((b) => {
      if (zoek) {
        const velden = [b.code, b.naam, b.omschrijving, b.bijschrift];
        if (!velden.some((v) => v && v.toLowerCase().includes(zoek))) return false;
      }
      if (f.onderdeel === "-") {
        if (b.onderdeel) return false;
      } else if (f.onderdeel && b.onderdeel !== f.onderdeel) return false;
      if (f.status && b.status !== f.status) return false;
      if (f.teKlein && !isTeKlein(b)) return false;
      if (f.ongebruikt && (gebruik[b.id] ?? 0) > 0) return false;
      return true;
    })
    .sort((a, b) => vergelijkCode(a.code, b.code));
}

/** Knipt de juiste pagina uit een lijst; de paginanummer wordt begrensd. */
export function pagineer<T>(rijen: T[], pagina: number, perPagina = PER_PAGINA) {
  const aantalPaginas = Math.max(1, Math.ceil(rijen.length / perPagina));
  const huidig = Math.min(Math.max(1, pagina), aantalPaginas);
  const start = (huidig - 1) * perPagina;
  return { items: rijen.slice(start, start + perPagina), pagina: huidig, aantalPaginas };
}

/** Tellers bovenaan de lijstpagina. */
export function tellers(rijen: LijstBeeld[]) {
  return {
    totaal: rijen.length,
    teKlein: rijen.filter((b) => isTeKlein(b)).length,
    zonderNaam: rijen.filter((b) => !b.naam).length,
    goedgekeurd: rijen.filter((b) => b.status === "goedgekeurd").length,
    zonderAfmetingen: rijen.filter((b) => b.breedte == null).length,
  };
}

export function afmetingTekst(breedte: number | null, hoogte: number | null): string {
  return breedte && hoogte ? `${breedte} × ${hoogte} px` : "nog onbekend";
}

export interface GebruikRij {
  sectie_id: string;
  type_sleutel: string;
  type_titel: string;
  kop: string;
}

/** Groepeert het gebruik per adviestype (volgorde blijft behouden). */
export function groepeerGebruik(gebruik: GebruikRij[]) {
  const groepen: { type_sleutel: string; type_titel: string; secties: GebruikRij[] }[] = [];
  for (const g of gebruik) {
    let groep = groepen.find((x) => x.type_sleutel === g.type_sleutel);
    if (!groep) {
      groep = { type_sleutel: g.type_sleutel, type_titel: g.type_titel, secties: [] };
      groepen.push(groep);
    }
    groep.secties.push(g);
  }
  return groepen;
}

/** "in 12 secties van 9 adviestypes" (of "nergens"). */
export function gebruikZin(aantalSecties: number, aantalTypes: number): string {
  if (aantalSecties === 0) return "nergens";
  const s = aantalSecties === 1 ? "1 sectie" : `${aantalSecties} secties`;
  const t = aantalTypes === 1 ? "1 adviestype" : `${aantalTypes} adviestypes`;
  return `in ${s} van ${t}`;
}

/** Leest een verhouding als "3:4", "3 x 4" of "3/4". */
export function leesVerhouding(tekst: string): [number, number] | null {
  const m = tekst.trim().match(/^(\d{1,3})\s*[:x×/]\s*(\d{1,3})$/i);
  if (!m) return null;
  const b = Number(m[1]);
  const h = Number(m[2]);
  if (b < 1 || h < 1) return null;
  return [b, h];
}

export interface Metadata {
  naam: string | null;
  onderdeel: string | null;
  omschrijving: string | null;
  figuur: string | null;
  advies: string | null;
  bijschrift: string | null;
  status: BeeldStatus;
}

function tekstOfNull(v: FormDataEntryValue | null, max = 2000): string | null {
  const s = typeof v === "string" ? v.trim().slice(0, max) : "";
  return s ? s : null;
}

/**
 * Controleert de gegevens uit het formulier. Geeft de schone waarden en een
 * lijst met begrijpelijke fouten terug (de uniciteit van de naam controleert de
 * server apart).
 */
export function controleerMetadata(fd: FormData): { waarden: Metadata; fouten: string[] } {
  const fouten: string[] = [];
  const naamInvoer = tekstOfNull(fd.get("naam"), 120);
  const naam = naamInvoer ? naamInvoer.toLowerCase() : null;
  if (naam && !NAAM_PATROON.test(naam)) {
    fouten.push(
      "De naam mag alleen kleine letters, cijfers en losse streepjes bevatten (geen spaties), bijvoorbeeld tops-v-hals-goed. Tip: gebruik de knop ‘Naam voorstellen’.",
    );
  }
  const figuur = tekstOfNull(fd.get("figuur"));
  if (figuur && !CODE_PATROON.test(figuur)) fouten.push("Kies een geldig lichaamstype.");
  const advies = tekstOfNull(fd.get("advies"));
  if (advies && !(ADVIEZEN as readonly string[]).includes(advies)) fouten.push("Kies een geldig advies.");
  const status = String(fd.get("status") ?? "");
  if (!(STATUSSEN as readonly string[]).includes(status)) fouten.push("Kies een geldige status.");
  return {
    waarden: {
      naam,
      onderdeel: tekstOfNull(fd.get("onderdeel"), 60),
      omschrijving: tekstOfNull(fd.get("omschrijving"), 300),
      figuur,
      advies,
      bijschrift: tekstOfNull(fd.get("bijschrift"), 1000),
      status: ((STATUSSEN as readonly string[]).includes(status) ? status : "origineel") as BeeldStatus,
    },
    fouten,
  };
}

export interface EisenInvoer {
  verhouding_b: number;
  verhouding_h: number;
  min_breedte: number;
  min_hoogte: number;
}

/** Controleert de aangepaste eisen (verhouding + minimaal formaat). */
export function controleerEisen(fd: FormData): { eisen: EisenInvoer | null; fouten: string[] } {
  const keuze = String(fd.get("verhouding") ?? "");
  const tekst = keuze === "eigen" ? String(fd.get("eigen_verhouding") ?? "") : keuze;
  const v = leesVerhouding(tekst);
  if (!v) return { eisen: null, fouten: ["Vul een geldige verhouding in, bijvoorbeeld 3:4."] };
  const standaard = minFormaat(v[0], v[1]);
  const getal = (naam: string, terugval: number) => {
    const s = String(fd.get(naam) ?? "").trim();
    return s === "" ? terugval : Number(s);
  };
  const min_breedte = getal("min_breedte", standaard.min_breedte);
  const min_hoogte = getal("min_hoogte", standaard.min_hoogte);
  const fouten: string[] = [];
  for (const [label, w] of [
    ["breedte", min_breedte],
    ["hoogte", min_hoogte],
  ] as const) {
    if (!Number.isInteger(w) || w < 50 || w > 10000) {
      fouten.push(`De minimale ${label} moet een heel getal tussen 50 en 10000 px zijn.`);
    }
  }
  if (fouten.length) return { eisen: null, fouten };
  return { eisen: { verhouding_b: v[0], verhouding_h: v[1], min_breedte, min_hoogte }, fouten };
}
