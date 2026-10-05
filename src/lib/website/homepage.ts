// Indeling van de homepage: volgorde en zichtbaarheid van de blokken. Opgeslagen
// als JSON in de instelling homepage_indeling, bijvoorbeeld
// [{ "blok": "stappen", "zichtbaar": true }, ...]. Puur, zodat het te testen is.

export const HOMEPAGE_BLOKKEN = [
  "hero",
  "stappen",
  "figuurtypes",
  "advies",
  "over",
  "ervaringen",
  "blog",
  "nieuwsbrief",
  "vragen",
  "afsluiting",
] as const;

export type HomepageBlok = (typeof HOMEPAGE_BLOKKEN)[number];

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
  stappen: { naam: "Zo werkt het", tekstenHref: tekst("website", "website.stappen") },
  figuurtypes: { naam: "De figuurtypes", tekstenHref: tekst("website", "website.figuurtypes") },
  advies: { naam: "Wat zit er in je advies", tekstenHref: tekst("website", "website.advies") },
  over: { naam: "Over Lida", tekstenHref: tekst("website", "website.over") },
  ervaringen: {
    naam: "Ervaringen van klanten",
    uitleg: "Wordt alleen getoond als er goedgekeurde reviews (Beheer → Reviews) of ingevulde ervaringen zijn.",
    tekstenHref: tekst("website", "website.ervaringen"),
  },
  blog: {
    naam: "Laatste blogberichten",
    uitleg: "Wordt alleen getoond als er gepubliceerde berichten zijn.",
    tekstenHref: tekst("website", "website.blog"),
  },
  nieuwsbrief: { naam: "Aanmelden voor de nieuwsbrief", tekstenHref: tekst("nieuwsbrief", "nieuwsbrief.aanmelden") },
  vragen: { naam: "Veelgestelde vragen", tekstenHref: tekst("website", "website.vragen") },
  afsluiting: { naam: "Afsluiting onderaan (met knop)", tekstenHref: tekst("website", "website.afsluiting") },
};

function isHomepageBlok(w: unknown): w is HomepageBlok {
  return typeof w === "string" && (HOMEPAGE_BLOKKEN as readonly string[]).includes(w);
}

/** De standaardindeling: alle blokken zichtbaar, in de vaste volgorde. */
export function standaardIndeling(): IndelingItem[] {
  return HOMEPAGE_BLOKKEN.map((blok) => ({ blok, zichtbaar: true }));
}

/**
 * Maakt van een opgeslagen (of ingestuurde) indeling altijd een volledige lijst:
 * onbekende en dubbele blokken vallen weg, ontbrekende blokken komen achteraan
 * (zichtbaar), en de hero staat altijd zichtbaar bovenaan. Accepteert de
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
  for (const blok of HOMEPAGE_BLOKKEN) {
    if (!gezien.has(blok)) uit.push({ blok, zichtbaar: true });
  }
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
