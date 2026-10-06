// Indeling van de homepage: volgorde en zichtbaarheid van de blokken. Opgeslagen
// als JSON in de instelling homepage_indeling, bijvoorbeeld
// [{ "blok": "stappen", "zichtbaar": true }, ...]. Puur, zodat het te testen is.

/**
 * Alle blokken in de standaardvolgorde. De eerste acht volgen het ontwerp
 * (docs/ontwerp, StoryBrand: resultaat → routes → probleem → plan → gids →
 * bewijs → zelf ontdekken → nieuwsbrief). Daarna de veelgestelde vragen
 * (zichtbaar: goed voor bezoekers en zoekmachines) en drie oudere blokken die
 * standaard uit staan maar in het beheer aan te zetten zijn.
 */
export const HOMEPAGE_BLOKKEN = [
  "hero",
  "diensten",
  "probleem",
  "stappen",
  "over",
  "ervaringen",
  "blog",
  "nieuwsbrief",
  "vragen",
  "figuurtypes",
  "advies",
  "afsluiting",
] as const;

export type HomepageBlok = (typeof HOMEPAGE_BLOKKEN)[number];

/** Blokken die standaard verborgen zijn (niet in het ontwerp, wel beschikbaar). */
const STANDAARD_VERBORGEN: ReadonlySet<HomepageBlok> = new Set(["figuurtypes", "advies", "afsluiting"]);

/** Of een blok zichtbaar is zolang er niets is opgeslagen. */
export function standaardZichtbaar(blok: HomepageBlok): boolean {
  return !STANDAARD_VERBORGEN.has(blok);
}

export interface IndelingItem {
  blok: HomepageBlok;
  zichtbaar: boolean;
}

export interface BlokInfo {
  naam: string;
  uitleg?: string;
  /** Waar de teksten van dit blok te bewerken zijn. */
  tekstenHref: string;
}

/** Link naar een tekstsectie (anker zoals in admin/teksten/[groep]/page.tsx). */
const tekst = (groep: string, sectie: string) => `/admin/teksten/${groep}#${sectie.replace(/\./g, "-")}`;

export const BLOK_INFO: Readonly<Record<HomepageBlok, BlokInfo>> = {
  hero: {
    naam: "Bovenaan (introductie met knop)",
    uitleg: "Staat altijd bovenaan en is altijd zichtbaar.",
    tekstenHref: tekst("website", "website.hero"),
  },
  diensten: {
    naam: "Adviesroutes (drie kaarten)",
    uitleg: "Figuurtest, persoonlijk advies en cadeaubon, met prijs en link.",
    tekstenHref: tekst("website", "website.diensten"),
  },
  probleem: { naam: "Herken je dit? (probleem en oplossing)", tekstenHref: tekst("website", "website.probleem") },
  stappen: { naam: "Zo werkt het", tekstenHref: tekst("website", "website.stappen") },
  figuurtypes: {
    naam: "Figuurtypes (algemene uitleg)",
    uitleg: "Zonder de types zelf: namen, tekeningen en uitleg zijn alleen voor klanten (achter de testlink).",
    tekstenHref: tekst("website", "website.figuurtypes"),
  },
  advies: { naam: "Wat zit er in je advies", tekstenHref: tekst("website", "website.advies") },
  over: { naam: "Over Lida", tekstenHref: tekst("website", "website.over") },
  ervaringen: {
    naam: "Ervaringen van klanten",
    uitleg: "Goedgekeurde reviews (Beheer → Reviews) en ingevulde ervaringen als citaat; zolang die er niet zijn een korte plaatshouder uit de teksten.",
    tekstenHref: tekst("website", "website.ervaringen"),
  },
  blog: {
    naam: "Laatste blogberichten",
    uitleg: "Wordt alleen getoond als er gepubliceerde berichten zijn.",
    tekstenHref: tekst("website", "website.blog"),
  },
  nieuwsbrief: { naam: "Aanmelden voor de nieuwsbrief", tekstenHref: tekst("nieuwsbrief", "nieuwsbrief.aanmelden") },
  vragen: {
    naam: "Veelgestelde vragen",
    uitleg: "Zichtbaar? Dan staan de vragen ook als gestructureerde gegevens voor zoekmachines in de pagina.",
    tekstenHref: tekst("website", "website.vragen"),
  },
  afsluiting: { naam: "Afsluiting onderaan (met knop)", tekstenHref: tekst("website", "website.afsluiting") },
};

function isHomepageBlok(w: unknown): w is HomepageBlok {
  return typeof w === "string" && (HOMEPAGE_BLOKKEN as readonly string[]).includes(w);
}

/** De standaardindeling: de vaste volgorde, met de oudere extra blokken verborgen. */
export function standaardIndeling(): IndelingItem[] {
  return HOMEPAGE_BLOKKEN.map((blok) => ({ blok, zichtbaar: standaardZichtbaar(blok) }));
}

/**
 * Maakt van een opgeslagen (of ingestuurde) indeling altijd een volledige lijst:
 * onbekende en dubbele blokken vallen weg en de hero staat altijd zichtbaar
 * bovenaan. Ontbrekende blokken (bijv. nieuwe blokken na een update) komen op
 * hun plek uit de standaardvolgorde: direct na het dichtstbijzijnde blok dat er
 * in de standaard vóór staat, met hun standaardzichtbaarheid. Accepteert de
 * JSON-tekst of een al geparste lijst; alles wat niet klopt geeft de standaard.
 */
export function normaliseerIndeling(ruw: unknown): IndelingItem[] {
  let lijst: unknown = ruw;
  if (typeof ruw === "string") {
    try {
      lijst = JSON.parse(ruw);
    } catch {
      lijst = null;
    }
  }
  if (!Array.isArray(lijst)) return standaardIndeling();

  const gezien = new Set<HomepageBlok>(["hero"]);
  const uit: IndelingItem[] = [{ blok: "hero", zichtbaar: true }];
  for (const item of lijst) {
    const blok = typeof item === "string" ? item : (item as { blok?: unknown } | null)?.blok;
    if (!isHomepageBlok(blok) || gezien.has(blok)) continue;
    gezien.add(blok);
    const zichtbaar = typeof item === "object" && item !== null && (item as { zichtbaar?: unknown }).zichtbaar === false ? false : true;
    uit.push({ blok, zichtbaar });
  }
  HOMEPAGE_BLOKKEN.forEach((blok, n) => {
    if (gezien.has(blok)) return;
    // Het dichtstbijzijnde eerdere blok uit de standaard (de hero is er altijd).
    const voorganger = HOMEPAGE_BLOKKEN.slice(0, n).findLast((b) => gezien.has(b)) ?? "hero";
    const plek = uit.findIndex((i) => i.blok === voorganger) + 1;
    uit.splice(plek, 0, { blok, zichtbaar: standaardZichtbaar(blok) });
    gezien.add(blok);
  });
  return uit;
}

/** Of de indeling gelijk is aan de standaard (dan hoeft er niets opgeslagen te worden). */
export function isStandaardIndeling(indeling: readonly IndelingItem[]): boolean {
  const std = standaardIndeling();
  return indeling.length === std.length && indeling.every((i, n) => i.blok === std[n].blok && i.zichtbaar === std[n].zichtbaar);
}

/** Schuift een blok één plek omhoog of omlaag; de hero blijft bovenaan. */
export function verschuifBlok(indeling: readonly IndelingItem[], blok: HomepageBlok, richting: "omhoog" | "omlaag"): IndelingItem[] {
  const lijst = normaliseerIndeling(indeling);
  const i = lijst.findIndex((x) => x.blok === blok);
  const j = richting === "omhoog" ? i - 1 : i + 1;
  if (i <= 0 || j <= 0 || j >= lijst.length) return lijst;
  [lijst[i], lijst[j]] = [lijst[j], lijst[i]];
  return lijst;
}

/** Zet een blok aan of uit; de hero blijft altijd zichtbaar. */
export function zetZichtbaar(indeling: readonly IndelingItem[], blok: HomepageBlok, zichtbaar: boolean): IndelingItem[] {
  return normaliseerIndeling(indeling.map((x) => (x.blok === blok ? { ...x, zichtbaar } : x)));
}
