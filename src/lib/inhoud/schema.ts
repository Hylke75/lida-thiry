// Beschrijving van de beheerbare teksten. Elke groep (website, test, e-mails,
// juridisch) bestaat uit secties; een sectie heeft velden met een standaardtekst.
// De beheerder kan elke sectie aanpassen in Beheer → Teksten; zonder aanpassing
// gebruikt de site de standaardtekst die hier in de code staat.

interface VeldBasis {
  label: string;
  uitleg?: string;
  /** Maximale lengte in tekens. */
  max?: number;
}

/** Eén regel tekst. */
export interface TekstVeld extends VeldBasis {
  soort: "tekst";
  standaard: string;
}

/** Meerdere regels platte tekst. */
export interface TekstvakVeld extends VeldBasis {
  soort: "tekstvak";
  standaard: string;
  regels?: number;
}

/** Tekst met eenvoudige opmaak (## kop, - opsomming, **vet**, [link](url)). */
interface OpmaakVeld extends VeldBasis {
  soort: "opmaak";
  standaard: string;
  regels?: number;
}

/**
 * Een afbeelding: adres uit de mediabibliotheek (https) of een eigen pad ("/foto.jpg").
 * Leeg = geen afbeelding (de site toont dan een rustig kleurvlak). Zet de
 * beschrijving (alt-tekst) in een apart tekstveld.
 */
export interface AfbeeldingVeld extends VeldBasis {
  soort: "afbeelding";
  standaard: string;
}

export type EnkelVeld = TekstVeld | TekstvakVeld | OpmaakVeld | AfbeeldingVeld;

/** Herhaalbare lijst (bijv. veelgestelde vragen); items kunnen worden toegevoegd en verschoven. */
export interface LijstVeld {
  soort: "lijst";
  label: string;
  uitleg?: string;
  /** Naam van één item, bijv. "vraag" (voor knoppen als "Vraag toevoegen"). */
  itemNaam: string;
  velden: Readonly<Record<string, EnkelVeld>>;
  /** Standaarditems; een optionele `_id` geeft een item een vaste sleutel. */
  standaard: readonly Readonly<Record<string, string>>[];
  min?: number;
  max?: number;
}

type Veld = EnkelVeld | LijstVeld;

export interface Sectie {
  /** Unieke sleutel, bijv. "website.hero" (ook de rij in de tabel inhoud). */
  sleutel: string;
  titel: string;
  uitleg?: string;
  /** Invulwaarden die in de teksten gebruikt kunnen worden, bijv. { naam: "voornaam van de klant" }. */
  variabelen?: Readonly<Record<string, string>>;
  velden: Readonly<Record<string, Veld>>;
}

export interface Groep {
  sleutel: string;
  titel: string;
  omschrijving: string;
  /** Waar de teksten op de site te zien zijn. */
  bekijkUrl?: string;
  secties: readonly Sectie[];
}

/** Helper die de letterlijke vorm van een sectie bewaart (voor de typen van de waarden). */
export function sectie<const S extends Sectie>(s: S): S {
  return s;
}

type LijstItem<V extends LijstVeld> = { _id: string } & { [K in keyof V["velden"]]: string };

type WaardeVan<V> = V extends LijstVeld ? LijstItem<V>[] : string;

/** De waarden van een sectie, met per veld het juiste type. */
export type SectieWaarden<S extends Sectie> = {
  -readonly [K in keyof S["velden"]]: WaardeVan<S["velden"][K]>;
};

const STANDAARD_MAX = { tekst: 300, tekstvak: 5_000, opmaak: 60_000, afbeelding: 1_000 } as const;
const STANDAARD_LIJST_MAX = 50;

const ID_PATROON = /^[A-Za-z0-9_-]{1,40}$/;

function geldigeId(id: unknown): id is string {
  return typeof id === "string" && ID_PATROON.test(id);
}

/** Nieuwe willekeurige id voor een lijstitem. */
export function nieuweId(): string {
  return Math.random().toString(36).slice(2, 10);
}

function standaardItems(v: LijstVeld): Record<string, string>[] {
  return v.standaard.map((item, i) => {
    const uit: Record<string, string> = { _id: geldigeId(item._id) ? item._id : `std${i + 1}` };
    for (const k of Object.keys(v.velden)) uit[k] = item[k] ?? "";
    return uit;
  });
}

/** De standaardwaarden van een sectie (zoals in de code). */
export function standaardWaarden<S extends Sectie>(s: S): SectieWaarden<S> {
  const uit: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(s.velden)) {
    uit[k] = v.soort === "lijst" ? standaardItems(v) : v.standaard;
  }
  return uit as SectieWaarden<S>;
}

/**
 * Combineert opgeslagen waarden met de standaard: velden die ontbreken of een
 * verkeerde vorm hebben, krijgen de standaardtekst.
 */
export function combineer<S extends Sectie>(s: S, opgeslagen: unknown): SectieWaarden<S> {
  const basis = standaardWaarden(s) as Record<string, unknown>;
  if (!opgeslagen || typeof opgeslagen !== "object" || Array.isArray(opgeslagen)) {
    return basis as SectieWaarden<S>;
  }
  const bron = opgeslagen as Record<string, unknown>;
  for (const [k, v] of Object.entries(s.velden)) {
    const w = bron[k];
    if (v.soort === "lijst") {
      if (!Array.isArray(w)) continue;
      basis[k] = w
        .filter((item): item is Record<string, unknown> => !!item && typeof item === "object")
        .map((item, i) => {
          const uit: Record<string, string> = { _id: geldigeId(item._id) ? item._id : `item${i + 1}` };
          for (const veld of Object.keys(v.velden)) {
            uit[veld] = typeof item[veld] === "string" ? (item[veld] as string) : "";
          }
          return uit;
        });
    } else if (typeof w === "string") {
      basis[k] = w;
    }
  }
  return basis as SectieWaarden<S>;
}

type Validatie = { ok: true; waarde: Record<string, unknown> } | { ok: false; fouten: string[] };

function maxVoor(v: EnkelVeld): number {
  return v.max ?? STANDAARD_MAX[v.soort];
}

function schoon(s: string, v: EnkelVeld): string {
  const genormaliseerd = s.replace(/\r\n?/g, "\n");
  if (v.soort === "afbeelding") return genormaliseerd.replace(/\s+/g, "");
  return v.soort === "tekst" ? genormaliseerd.replace(/\n+/g, " ").trim() : genormaliseerd.trim();
}

/**
 * Een afbeeldingsadres: https of een eigen pad ("/…", niet "//…"). Leeg is goed.
 * (Gelijk aan valideerAfbeeldingUrl in lib/website/instellingen.ts.)
 */
export function isGeldigAfbeeldingAdres(w: string): boolean {
  if (w === "") return true;
  if (/^\/(?!\/)\S*$/.test(w)) return true;
  try {
    const u = new URL(w);
    return u.protocol === "https:" && u.hostname.includes(".") && !u.username && !u.password;
  } catch {
    return false;
  }
}

function controleerAfbeelding(tekst: string, def: EnkelVeld, label: string, fouten: string[]) {
  if (def.soort === "afbeelding" && !isGeldigAfbeeldingAdres(tekst)) {
    fouten.push(`${label}: kies een afbeelding uit de mediabibliotheek of vul een adres in dat met https:// begint.`);
  }
}

/** Controleert de invoer uit het beheerscherm tegen de beschrijving van de sectie. */
export function valideer(s: Sectie, ruw: unknown): Validatie {
  if (!ruw || typeof ruw !== "object" || Array.isArray(ruw)) {
    return { ok: false, fouten: ["De invoer kon niet gelezen worden."] };
  }
  const bron = ruw as Record<string, unknown>;
  const fouten: string[] = [];
  const uit: Record<string, unknown> = {};

  for (const [k, v] of Object.entries(s.velden)) {
    const w = bron[k];
    if (v.soort === "lijst") {
      const items = Array.isArray(w) ? w : [];
      const max = v.max ?? STANDAARD_LIJST_MAX;
      if (items.length > max) fouten.push(`${v.label}: maximaal ${max} items.`);
      if (v.min && items.length < v.min) fouten.push(`${v.label}: minimaal ${v.min} item(s).`);
      const gezien = new Set<string>();
      uit[k] = items.slice(0, max).map((item, i) => {
        const bronItem = item && typeof item === "object" ? (item as Record<string, unknown>) : {};
        let id = geldigeId(bronItem._id) ? bronItem._id : nieuweId();
        while (gezien.has(id)) id = nieuweId();
        gezien.add(id);
        const schoonItem: Record<string, string> = { _id: id };
        for (const [veld, def] of Object.entries(v.velden)) {
          const tekst = typeof bronItem[veld] === "string" ? schoon(bronItem[veld] as string, def) : "";
          if (tekst.length > maxVoor(def)) {
            fouten.push(`${v.label}, ${v.itemNaam} ${i + 1}, ${def.label}: maximaal ${maxVoor(def)} tekens.`);
          }
          controleerAfbeelding(tekst, def, `${v.label}, ${v.itemNaam} ${i + 1}, ${def.label}`, fouten);
          schoonItem[veld] = tekst;
        }
        return schoonItem;
      });
    } else {
      const tekst = typeof w === "string" ? schoon(w, v) : "";
      if (tekst.length > maxVoor(v)) fouten.push(`${v.label}: maximaal ${maxVoor(v)} tekens.`);
      controleerAfbeelding(tekst, v, v.label, fouten);
      uit[k] = tekst;
    }
  }
  return fouten.length ? { ok: false, fouten } : { ok: true, waarde: uit };
}

/** Vervangt {variabele} door de waarde; onbekende variabelen blijven staan. */
export function vulIn(tekst: string, waarden: Readonly<Record<string, string | number>>): string {
  return tekst.replace(/\{([a-z_]+)\}/g, (heel, naam: string) =>
    naam in waarden ? String(waarden[naam]) : heel,
  );
}

/** Of een tekst nog een invulplek tussen blokhaken bevat, zoals "[datum]" of "[aan te vullen: …]". */
export function bevatPlaceholder(waarden: Readonly<Record<string, unknown>>): boolean {
  const teksten = Object.values(waarden).flatMap((v) =>
    typeof v === "string"
      ? [v]
      : Array.isArray(v)
        ? v.flatMap((i) => (i && typeof i === "object" ? Object.values(i as Record<string, unknown>) : []))
        : [],
  );
  // Tekst tussen [blokhaken] die geen link is, zoals [datum] of [aan te vullen: …].
  return teksten.some((t) => typeof t === "string" && /\[[^\]\n]{2,}\](?!\()/.test(t));
}
