// Pure CSV-regels voor het adresboek: een importbestand op kolomnamen lezen, plannen
// wat er nieuw is en wat aangevuld wordt, en de exportregels opbouwen. Werkt in de
// browser (voorbeeld) en op de server (controle).

import { MAX_IMPORT_BYTES, MAX_IMPORT_RIJEN, parseerCsvRijen } from "../nieuwsbrief/csv";
import { ontleedTags } from "../nieuwsbrief/contactregels";
import { aanvulling, RELATIE_BRON_LABEL, schoonGegevens, splitsNaam, type Relatie, type RelatieGegevens } from "./regels";
import { kenmerken, type Koppelingen } from "./zoeken";

export { MAX_IMPORT_BYTES, MAX_IMPORT_RIJEN };

const IMPORT_KOLOMMEN = [
  "voornaam",
  "achternaam",
  "naam",
  "email",
  "telefoon",
  "bedrijf",
  "straat",
  "huisnummer",
  "postcode",
  "plaats",
  "land",
  "tags",
] as const;
type ImportKolom = (typeof IMPORT_KOLOMMEN)[number];

/** Herkende kolomkoppen (kleine letters, _ en - als spatie). */
const KOPPEN: Record<ImportKolom, RegExp> = {
  voornaam: /^(voornaam|roepnaam|first ?name|given ?name)$/,
  achternaam: /^(achternaam|familienaam|last ?name|surname|family ?name)$/,
  naam: /^(naam|name|volledige naam|full ?name|klantnaam|contactpersoon)$/,
  email: /^(e ?mail(adres)?|email ?address|mail)$/,
  telefoon: /^(telefoon(nummer)?|tel(efoonnr)?|tel ?nr|phone( ?number)?|mobiel(e nummer)?|gsm|mobile)$/,
  bedrijf: /^(bedrijf(snaam)?|company|organisatie|organization|firma)$/,
  straat: /^(straat|adres|address|straat en huisnummer|straat ?\+ ?huisnummer|street|straatnaam)$/,
  huisnummer: /^(huisnummer|huisnr|nr|nummer|house ?number)$/,
  postcode: /^(postcode|zip( ?code)?|postal ?code)$/,
  plaats: /^(plaats|woonplaats|stad|city|town)$/,
  land: /^(land|country)$/,
  tags: /^(tags?|labels?|groep(en)?)$/,
};

const kop = (c: string) => c.trim().toLowerCase().replace(/[_-]/g, " ").replace(/\s+/g, " ");

/** Maakt de bescherming tegen formules uit onze eigen export ongedaan: "'+31 6…" → "+31 6…". */
export function ontsnapCel(c: string): string {
  const t = c.trim();
  return /^'[=+\-@]/.test(t) ? t.slice(1) : t;
}

export type KolomIndex = Partial<Record<ImportKolom, number>>;

/** Zoekt de kolommen in de koprij. */
export function herkenKolommen(koprij: readonly string[]): KolomIndex {
  const uit: KolomIndex = {};
  koprij.forEach((c, i) => {
    const k = kop(c);
    for (const naam of IMPORT_KOLOMMEN) {
      if (uit[naam] === undefined && KOPPEN[naam].test(k)) {
        uit[naam] = i;
        break;
      }
    }
  });
  return uit;
}

export interface RelatieImportRij {
  regel: number;
  gegevens: Partial<RelatieGegevens> & { email: string };
  tags: string[];
}

export interface RelatieImportAnalyse {
  rijen: RelatieImportRij[];
  ongeldig: { regel: number; waarde: string; reden: string }[];
  dubbel: number;
  teVeel: boolean;
  /** Er is geen koprij met een e-mailkolom gevonden. */
  geenKoprij: boolean;
  kolommen: KolomIndex;
}

/** Eén rij uit het bestand naar schone gegevens (null als er geen geldig e-mailadres in staat). */
function rijNaarGegevens(cellen: readonly string[], kolommen: KolomIndex): { gegevens: Partial<RelatieGegevens>; tags: string[]; ruwEmail: string } {
  const cel = (k: ImportKolom) => (kolommen[k] === undefined ? "" : ontsnapCel(cellen[kolommen[k]!] ?? ""));
  let voornaam = cel("voornaam");
  let achternaam = cel("achternaam");
  if (!voornaam && !achternaam) {
    const naam = splitsNaam(cel("naam"));
    voornaam = naam.voornaam ?? "";
    achternaam = naam.achternaam ?? "";
  }
  const straat = [cel("straat"), cel("huisnummer")].filter(Boolean).join(" ");
  const gegevens = schoonGegevens({
    email: cel("email"),
    voornaam,
    achternaam,
    telefoon: cel("telefoon"),
    bedrijf: cel("bedrijf"),
    straat,
    postcode: cel("postcode"),
    plaats: cel("plaats"),
    land: cel("land"),
  });
  return { gegevens, tags: ontleedTags(cel("tags")), ruwEmail: cel("email") };
}

/**
 * Leest relaties uit CSV-tekst. Een koprij met minstens een e-mailkolom is
 * verplicht; de andere kolommen worden op naam herkend. Een kolom ‘naam’ wordt
 * gesplitst als er geen voor- en achternaam zijn. Tags scheid je met ; of |.
 */
export function analyseerRelatieImport(invoer: string, max = MAX_IMPORT_RIJEN): RelatieImportAnalyse {
  const alle = parseerCsvRijen(invoer);
  const kolommen = herkenKolommen(alle[0]?.cellen ?? []);
  const uit: RelatieImportAnalyse = { rijen: [], ongeldig: [], dubbel: 0, teVeel: false, geenKoprij: kolommen.email === undefined, kolommen };
  if (uit.geenKoprij) return uit;
  const data = alle.slice(1);
  uit.teVeel = data.length > max;
  const gezien = new Set<string>();
  for (const { regel, cellen } of data.slice(0, max)) {
    const { gegevens, tags, ruwEmail } = rijNaarGegevens(cellen, kolommen);
    if (!gegevens.email) {
      uit.ongeldig.push({ regel, waarde: ruwEmail.slice(0, 120), reden: ruwEmail ? "Geen geldig e-mailadres" : "Geen e-mailadres" });
      continue;
    }
    if (gezien.has(gegevens.email)) {
      uit.dubbel++;
      continue;
    }
    gezien.add(gegevens.email);
    uit.rijen.push({ regel, gegevens: gegevens as RelatieImportRij["gegevens"], tags });
  }
  return uit;
}

export type BestaandVoorImport = Pick<Relatie, "id" | "tags"> & Partial<RelatieGegevens>;

export interface ImportPlan {
  nieuw: { gegevens: Partial<RelatieGegevens> & { email: string }; tags: string[] }[];
  bijwerken: { id: string; email: string; wijziging: Partial<RelatieGegevens> & { tags?: string[] } }[];
  /** Bestaat al en er valt niets aan te vullen. */
  ongewijzigd: number;
}

/**
 * Wat een import doet: nieuwe relaties aanmaken, en bij bestaande alleen lege
 * velden aanvullen en tags toevoegen. Ingevulde gegevens worden nooit overschreven.
 */
export function planImport(
  rijen: readonly Pick<RelatieImportRij, "gegevens" | "tags">[],
  bestaand: ReadonlyMap<string, BestaandVoorImport>,
  extraTag?: string | null,
): ImportPlan {
  const extra = extraTag ? ontleedTags(extraTag) : [];
  const plan: ImportPlan = { nieuw: [], bijwerken: [], ongewijzigd: 0 };
  for (const r of rijen) {
    const tags = [...new Set([...r.tags, ...extra])];
    const b = bestaand.get(r.gegevens.email);
    if (!b) {
      plan.nieuw.push({ gegevens: r.gegevens, tags });
      continue;
    }
    const wijziging: ImportPlan["bijwerken"][number]["wijziging"] = aanvulling(b, r.gegevens);
    const nieuweTags = [...new Set([...b.tags, ...tags])];
    if (nieuweTags.length !== b.tags.length) wijziging.tags = nieuweTags;
    if (Object.keys(wijziging).length) plan.bijwerken.push({ id: b.id, email: r.gegevens.email, wijziging });
    else plan.ongewijzigd++;
  }
  return plan;
}

// Export ---------------------------------------------------------------------------

const EXPORT_KOP = [
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
  "tags",
  "bron",
  "klant",
  "nieuwsbrief",
  "bericht",
  "notities",
  "aangemaakt_op",
] as const;

/** Exportregels (met koprij) die ook weer te importeren zijn. */
export function exportRijen(relaties: readonly Relatie[], k: Koppelingen): (string | null)[][] {
  return [
    [...EXPORT_KOP],
    ...relaties.map((r) => {
      const m = kenmerken(r, k);
      return [
        r.voornaam,
        r.achternaam,
        r.email,
        r.telefoon,
        r.bedrijf,
        r.straat,
        r.postcode,
        r.plaats,
        r.land,
        r.geboortedatum,
        r.tags.join("|"),
        RELATIE_BRON_LABEL[r.bron] ?? r.bron,
        m.klant ? "ja" : "nee",
        m.nieuwsbrief ? "ja" : "nee",
        m.bericht ? "ja" : "nee",
        r.notities,
        r.aangemaakt_op,
      ];
    }),
  ];
}
