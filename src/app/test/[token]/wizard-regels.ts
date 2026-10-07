// Pure regels van de testwizard (/test/[token]): de stappen, de controles per
// stap en wat er naar /api/test/[token] gaat. Geen React, zodat dit los te testen is.

import { MAAT_GROEPEN, type MaatVeld } from "@/lib/test-config";
import { MAAT_GRENZEN } from "@/rekenkern/config/grenzen";
import { BANDMAAT_GRENZEN } from "@/rekenkern/config/verfijning";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import { meetStapTitel, type PasvormVraag, type TestTeksten } from "@/lib/inhoud/groepen/test";

export interface Bevinding {
  code: string;
  ernst: string;
  bericht: string;
}
export type Resultaat = { soort: "type"; sleutel: string; titel: string | null };

export interface Antwoorden {
  lengte: string;
  gewicht: string;
  maten: Record<string, string>;
  controle: Record<string, string>;
  silhouet: string;
  pasvorm: Record<string, string>;
  /** Bandmaat van de bh (optioneel; alleen gevraagd als de extra figuurtypes aan staan). */
  bandmaat: string;
}

export const LEEG: Antwoorden = {
  lengte: "",
  gewicht: "",
  maten: {},
  controle: {},
  silhouet: "",
  pasvorm: {},
  bandmaat: "",
};

/** De keuzes voor de bandmaat van de bh (Europese maten, per 5). */
export const BANDMATEN: number[] = Array.from(
  { length: (BANDMAAT_GRENZEN.max - BANDMAAT_GRENZEN.min) / 5 + 1 },
  (_, i) => BANDMAAT_GRENZEN.min + i * 5,
);

export type Stap =
  | { soort: "jij"; titel: string }
  | { soort: "maten"; titel: string; velden: MaatVeld[] }
  | { soort: "silhouet"; titel: string }
  | { soort: "vragen"; titel: string; vragen: PasvormVraag[] }
  | { soort: "controle"; titel: string };

/** De stappen van de test, met de (beheerbare) titels. */
export function maakStappen(t: TestTeksten, maatVelden: MaatVeld[], vragen: PasvormVraag[]): Stap[] {
  return [
    { soort: "jij", titel: t.overJou.titel },
    ...MAAT_GROEPEN.map((g) => ({
      soort: "maten" as const,
      titel: meetStapTitel(t.meten, g.sleutel),
      velden: g.velden.map((s) => maatVelden.find((v) => v.sleutel === s)!),
    })),
    { soort: "silhouet", titel: t.silhouet.titel },
    { soort: "vragen", titel: t.vragen.titel, vragen },
    { soort: "controle", titel: t.afronden.titel },
  ];
}
// Stap 1 is "Over jou"; daarna volgen de meetstappen.
export const EERSTE_MATEN_STAP = 1;

export const getal = (v: string | undefined) => (v ? Number(v) : NaN);

/** Het label van een maat zonder de toevoeging " (optioneel)". */
export const kaalLabel = (label: string) => label.replace(" (optioneel)", "");

/** Maakt getypte invoer schoon: een komma wordt een punt, alleen cijfers en punten blijven over. */
export const schoonGetal = (invoer: string) => invoer.replace(",", ".").replace(/[^0-9.]/g, "");

/** Liggen de eerste meting en de controlemeting dicht genoeg bij elkaar? */
export const metingenKomenOvereen = (eerste: string, tweede: string) =>
  Math.abs(Number(eerste) - Number(tweede)) <= MAAT_GRENZEN.controleVerschilMax;

/** Foutmelding voor één maatveld, of null als het in orde is. */
export function maatFout(v: MaatVeld, a: Antwoorden): string | null {
  const waarde = getal(a.maten[v.sleutel]);
  if (Number.isNaN(waarde)) return v.verplicht ? "Vul deze maat in." : null;
  const [min, max] =
    v.sleutel === "binnenbeen"
      ? [MAAT_GRENZEN.binnenbeenMin, MAAT_GRENZEN.binnenbeenMax]
      : [MAAT_GRENZEN.omtrekMin, MAAT_GRENZEN.omtrekMax];
  if (waarde < min || waarde > max) return `Deze maat ligt normaal tussen ${min} en ${max} cm. Meet nog eens.`;
  if (v.controle) {
    const tweede = getal(a.controle[v.sleutel]);
    if (Number.isNaN(tweede)) return "Meet nog een keer en vul de tweede meting in.";
    if (Math.abs(waarde - tweede) > MAAT_GRENZEN.controleVerschilMax)
      return `Je twee metingen verschillen meer dan ${MAAT_GRENZEN.controleVerschilMax} cm. Meet nog een keer goed.`;
  }
  return null;
}

/** Foutmelding voor een hele stap, of null als je verder mag. */
export function stapFout(stap: Stap, a: Antwoorden): string | null {
  switch (stap.soort) {
    case "jij": {
      const l = getal(a.lengte);
      const g = getal(a.gewicht);
      if (Number.isNaN(l) || Number.isNaN(g)) return "Vul je lengte en gewicht in.";
      if (l < 120 || l > 220) return "Vul je lengte in centimeters in (bijvoorbeeld 168).";
      if (g < 30 || g > 250) return "Vul je gewicht in kilo's in (bijvoorbeeld 65).";
      if (a.bandmaat) {
        const b = getal(a.bandmaat);
        if (Number.isNaN(b) || b < BANDMAAT_GRENZEN.min || b > BANDMAAT_GRENZEN.max)
          return "Kies je bandmaat uit de lijst of laat het veld leeg.";
      }
      return null;
    }
    case "maten":
      return stap.velden.some((v) => maatFout(v, a)) ? "Niet alle maten zijn goed ingevuld; zie hierboven." : null;
    case "silhouet":
      return a.silhouet ? null : "Kies het silhouet dat het meest op het jouwe lijkt.";
    case "vragen":
      return stap.vragen.some((q) => !a.pasvorm[q.sleutel] || !q.opties.includes(a.pasvorm[q.sleutel]))
        ? "Beantwoord alle vragen."
        : null;
    case "controle":
      return null;
  }
}

/** Mag de bezoeker via de tabbladen naar stap i springen? */
export function isBereikbaar(i: number, bereikt: number, stappen: Stap[], a: Antwoorden): boolean {
  if (i > bereikt) return false;
  return stappen.slice(0, i).every((s) => stapFout(s, a) === null);
}

/** Wat er naar POST /api/test/[token] gaat. */
export function maakPayload(
  a: Antwoorden,
  maatVelden: MaatVeld[],
  vragen: PasvormVraag[],
  hermeting: boolean,
  vraagBandmaat = false,
) {
  const num = (v: string | undefined) => (v ? Number(v) : undefined);
  return {
    lengte_cm: Number(a.lengte),
    gewicht_kg: Number(a.gewicht),
    maten: Object.fromEntries(maatVelden.map((v) => [v.sleutel, num(a.maten[v.sleutel])])),
    controlemetingen: Object.fromEntries(
      maatVelden.filter((v) => v.controle).map((v) => [v.sleutel, num(a.controle[v.sleutel])]),
    ),
    gekozen_silhouet: a.silhouet,
    // Alleen antwoorden op de huidige vragen meesturen.
    pasvormantwoorden: Object.fromEntries(
      vragen.filter((q) => a.pasvorm[q.sleutel]).map((q) => [q.sleutel, a.pasvorm[q.sleutel]]),
    ),
    hermeting,
    // Alleen als erom gevraagd is (extra figuurtypes aan) en ingevuld.
    ...(vraagBandmaat && a.bandmaat ? { behamaat_band: Number(a.bandmaat) } : {}),
  };
}

/** De melding als het gekozen silhouet volgens de server niet bij de maten past. */
export function silhouetVerschilMelding(
  silhouetten: Silhouet[],
  gekozenLetter: string,
  berekendeLetter: string | null | undefined,
  reden: string | null | undefined,
): string {
  // Bijv. "Je heupen zijn duidelijk breder dan je borst (12 cm verschil).
  // Dat past meer bij Peer / driehoek dan bij Zandloper."
  const gekozen = silhouetten.find((x) => x.letter === gekozenLetter)?.naam;
  const berekend = silhouetten.find((x) => x.letter === berekendeLetter)?.naam;
  const r: string =
    reden ??
    (gekozen && berekend
      ? `Je koos ${gekozen}, maar je maten passen meer bij ${berekend}.`
      : "Het silhouet dat je koos past niet helemaal bij je maten.");
  return `${r} Loop je maten nog één keer na (en eventueel je silhouetkeuze) en rond daarna opnieuw af. Blijft het verschil bestaan, dan gaan we uit van je maten.`;
}

export interface OverzichtRij {
  label: string;
  waarde: string;
  /** De stap waar de bezoeker deze waarde kan wijzigen. */
  stap: number;
}

/** De rijen van het overzicht op de laatste stap. */
export function overzichtRijen(
  a: Antwoorden,
  stappen: Stap[],
  maatVelden: MaatVeld[],
  vragen: PasvormVraag[],
  silhouetten: Silhouet[],
  /** Label van de bandmaat; alleen meegegeven als het veld getoond wordt. */
  bandmaatLabel?: string,
): OverzichtRij[] {
  const stapVan = (sleutel: string) =>
    stappen.findIndex((s) => s.soort === "maten" && s.velden.some((v) => v.sleutel === sleutel));
  const silhouet = silhouetten.find((s) => s.letter === a.silhouet);
  return [
    { label: "Lengte", waarde: `${a.lengte} cm`, stap: 0 },
    { label: "Gewicht", waarde: `${a.gewicht} kg`, stap: 0 },
    ...(bandmaatLabel && a.bandmaat ? [{ label: kaalLabel(bandmaatLabel), waarde: a.bandmaat, stap: 0 }] : []),
    ...maatVelden.map((v) => ({
      label: kaalLabel(v.label),
      waarde: a.maten[v.sleutel] ? `${a.maten[v.sleutel]} cm` : "—",
      stap: stapVan(v.sleutel),
    })),
    { label: "Silhouet", waarde: silhouet?.naam ?? "—", stap: stappen.findIndex((s) => s.soort === "silhouet") },
    ...vragen.map((q) => ({
      label: q.vraag,
      waarde: a.pasvorm[q.sleutel] ?? "—",
      stap: stappen.findIndex((s) => s.soort === "vragen"),
    })),
  ];
}
