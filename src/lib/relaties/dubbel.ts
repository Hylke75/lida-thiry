// Pure regels voor dubbele relaties: waarschijnlijke dubbelen vinden en het
// samenvoegen van twee relaties plannen (zonder database, zodat het te testen is).

import { volledigeNaam, type Relatie } from "./regels";
import { normaliseerZoektekst, telefoonCijfers } from "./zoeken";

export type DubbelReden = "naam_postcode" | "telefoon" | "naam_ander_email";

export const DUBBEL_REDEN_LABEL: Record<DubbelReden, string> = {
  naam_postcode: "Zelfde naam en postcode",
  telefoon: "Zelfde telefoonnummer",
  naam_ander_email: "Zelfde naam, ander e-mailadres",
};

/** Hoe sterk een reden is (hoger = waarschijnlijker dezelfde persoon). */
const GEWICHT: Record<DubbelReden, number> = { naam_postcode: 3, telefoon: 3, naam_ander_email: 1 };

export interface DubbelPaar {
  a: Relatie;
  b: Relatie;
  redenen: DubbelReden[];
  score: number;
}

/** Naam om op te vergelijken: zonder accenten, kleine letters. Leeg als voor- of achternaam ontbreekt. */
export function naamSleutel(r: Pick<Relatie, "voornaam" | "achternaam">): string {
  if (!r.voornaam?.trim() || !r.achternaam?.trim()) return "";
  return normaliseerZoektekst(volledigeNaam(r)).replace(/[^a-z0-9 ]/g, "");
}

function postcodeSleutel(p: string | null | undefined): string {
  return (p ?? "").replace(/\s/g, "").toUpperCase();
}

/** Een groep met dezelfde sleutel; te grote groepen (bijv. een gedeeld kantoornummer) slaan we over. */
const MAX_GROEP = 10;

/**
 * Vindt paren relaties die waarschijnlijk dezelfde persoon zijn: dezelfde naam
 * en postcode, hetzelfde telefoonnummer, of dezelfde volledige naam met een
 * ander e-mailadres. Sterkste kandidaten eerst.
 */
export function vindDubbelen(relaties: readonly Relatie[], max = 200): DubbelPaar[] {
  const groepen = new Map<string, Relatie[]>();
  const voegToe = (sleutel: string, r: Relatie) => {
    const g = groepen.get(sleutel);
    if (g) g.push(r);
    else groepen.set(sleutel, [r]);
  };
  for (const r of relaties) {
    const naam = naamSleutel(r);
    const postcode = postcodeSleutel(r.postcode);
    if (naam && postcode) voegToe(`naam_postcode:${naam}|${postcode}`, r);
    const tel = telefoonCijfers(r.telefoon);
    if (tel.length >= 8) voegToe(`telefoon:${tel}`, r);
    if (naam) voegToe(`naam_ander_email:${naam}`, r);
  }

  const paren = new Map<string, DubbelPaar>();
  for (const [sleutel, groep] of groepen) {
    if (groep.length < 2 || groep.length > MAX_GROEP) continue;
    const reden = sleutel.slice(0, sleutel.indexOf(":")) as DubbelReden;
    for (let i = 0; i < groep.length; i++) {
      for (let j = i + 1; j < groep.length; j++) {
        // Oudste eerst, zodat dezelfde twee relaties altijd hetzelfde paar vormen.
        const [a, b] = [groep[i], groep[j]].sort((x, y) => Date.parse(x.aangemaakt_op) - Date.parse(y.aangemaakt_op) || x.id.localeCompare(y.id));
        if (reden === "naam_ander_email" && (!a.email || !b.email || a.email === b.email)) continue;
        const id = `${a.id}|${b.id}`;
        const paar = paren.get(id) ?? { a, b, redenen: [], score: 0 };
        if (!paar.redenen.includes(reden)) {
          paar.redenen.push(reden);
          paar.score += GEWICHT[reden];
        }
        paren.set(id, paar);
      }
    }
  }
  return [...paren.values()]
    .sort((x, y) => y.score - x.score || naamSleutel(x.a).localeCompare(naamSleutel(y.a), "nl"))
    .slice(0, max);
}

// Samenvoegen ------------------------------------------------------------------------

/** Velden waarvoor de beheerder kiest welke waarde blijft. */
export const SAMENVOEG_VELDEN = [
  "voornaam",
  "achternaam",
  "email",
  "telefoon",
  "bedrijf",
  "straat",
  "postcode",
  "plaats",
  "land",
  "geboortedatum",
] as const;
export type SamenvoegVeld = (typeof SAMENVOEG_VELDEN)[number];

export const VELD_LABEL: Record<SamenvoegVeld, string> = {
  voornaam: "Voornaam",
  achternaam: "Achternaam",
  email: "E-mailadres",
  telefoon: "Telefoon",
  bedrijf: "Bedrijf",
  straat: "Straat en huisnummer",
  postcode: "Postcode",
  plaats: "Plaats",
  land: "Land",
  geboortedatum: "Geboortedatum",
};

export type Keuzes = Record<SamenvoegVeld, "blijft" | "weg">;

/** Standaardkeuze: de waarde van de blijvende relatie, of die van de andere als die leeg is. */
export function standaardKeuzes(blijft: Relatie, weg: Relatie): Keuzes {
  return Object.fromEntries(
    SAMENVOEG_VELDEN.map((v) => [v, !blijft[v] && weg[v] ? "weg" : "blijft"]),
  ) as Keuzes;
}

/** Twee notitieteksten samen: de notitie over het samenvoegen bovenaan, dan beide (nieuwste eerst). */
function voegNotitiesSamen(blijft: string, weg: string, kop: string): string {
  return [kop, blijft.trim(), weg.trim()].filter(Boolean).join("\n\n");
}

export interface SamenvoegPlan {
  blijftId: string;
  wegId: string;
  /** Wijziging voor de blijvende relatie. */
  wijziging: Partial<Record<SamenvoegVeld, string | null>> & { tags: string[]; notities: string; aangemaakt_op: string };
  /** Het e-mailadres van de verdwijnende relatie moet eerst vrijgemaakt worden (unieke index). */
  emailOvernemen: boolean;
}

/**
 * Plant het samenvoegen van `weg` in `blijft`: per veld de gekozen waarde, de
 * tags samen, de notities achter elkaar en de oudste aanmaakdatum.
 */
export function planSamenvoeging(blijft: Relatie, weg: Relatie, keuzes: Partial<Keuzes>, moment: string): SamenvoegPlan {
  const k = { ...standaardKeuzes(blijft, weg), ...keuzes };
  const wijziging: SamenvoegPlan["wijziging"] = {
    tags: [...new Set([...blijft.tags, ...weg.tags])],
    notities: voegNotitiesSamen(
      blijft.notities,
      weg.notities,
      `[${moment}] Samengevoegd met ${[volledigeNaam(weg), weg.email && `<${weg.email}>`].filter(Boolean).join(" ") || "een andere relatie"}.`,
    ),
    aangemaakt_op: Date.parse(blijft.aangemaakt_op) <= Date.parse(weg.aangemaakt_op) ? blijft.aangemaakt_op : weg.aangemaakt_op,
  };
  for (const v of SAMENVOEG_VELDEN) {
    if (k[v] === "weg" && weg[v] !== blijft[v]) wijziging[v] = weg[v] ?? null;
  }
  if (wijziging.land === null) wijziging.land = blijft.land || "Nederland";
  return {
    blijftId: blijft.id,
    wegId: weg.id,
    wijziging,
    emailOvernemen: k.email === "weg" && Boolean(weg.email) && weg.email !== blijft.email,
  };
}

// Notities -------------------------------------------------------------------------

/** Zet een nieuwe notitie met datum (en wie) bovenaan de bestaande notities. */
export function voegNotitieToe(bestaand: string, tekst: string, moment: string, door?: string | null): string {
  const t = tekst.trim();
  if (!t) return bestaand;
  const kop = `[${moment}${door ? ` · ${door}` : ""}]`;
  return [`${kop}\n${t}`, bestaand.trim()].filter(Boolean).join("\n\n").slice(0, 50_000);
}
