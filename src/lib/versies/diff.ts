// Eenvoudige regel-voor-regel-vergelijking van twee teksten (zoals "git diff"),
// met binnen gewijzigde regels een woord-voor-woord-markering. Puur: geen
// database of netwerk, bruikbaar in de browser, op de server en in tests.

export type DiffSoort = "gelijk" | "weg" | "erbij";

/** Een stukje van een regel; `gewijzigd` = dit woord is anders dan in de andere versie. */
export interface DiffDeel {
  tekst: string;
  gewijzigd: boolean;
}

export interface DiffRegel {
  soort: DiffSoort;
  tekst: string;
  /** Alleen bij gewijzigde regels die een tegenhanger hebben: woordmarkering. */
  delen?: DiffDeel[];
}

/** Een ingeklapt stuk ongewijzigde regels. */
export interface DiffOverslag {
  soort: "overslag";
  aantal: number;
}

/** Boven deze omvang (regels × regels) geen LCS meer, maar alles weg/erbij. */
const MAX_CELLEN = 9_000_000;

type Stap<T> = { soort: DiffSoort; waarde: T };

/** Langste gemeenschappelijke deelreeks; geeft de bewerkingsstappen van `a` naar `b`. */
export function vergelijkReeksen<T>(a: readonly T[], b: readonly T[], gelijk: (x: T, y: T) => boolean = Object.is): Stap<T>[] {
  // Gemeenschappelijk begin en eind apart: dat houdt de tabel klein.
  let begin = 0;
  while (begin < a.length && begin < b.length && gelijk(a[begin], b[begin])) begin++;
  let eind = 0;
  while (eind < a.length - begin && eind < b.length - begin && gelijk(a[a.length - 1 - eind], b[b.length - 1 - eind])) eind++;

  const kopA = a.slice(begin, a.length - eind);
  const kopB = b.slice(begin, b.length - eind);
  const n = kopA.length;
  const m = kopB.length;
  const midden: Stap<T>[] = [];

  if (n === 0 || m === 0 || n * m > MAX_CELLEN) {
    for (const x of kopA) midden.push({ soort: "weg", waarde: x });
    for (const y of kopB) midden.push({ soort: "erbij", waarde: y });
  } else {
    // lengte[i][j] = LCS van kopA[i..] en kopB[j..]
    const breed = m + 1;
    const lengte = new Uint32Array((n + 1) * breed);
    for (let i = n - 1; i >= 0; i--) {
      for (let j = m - 1; j >= 0; j--) {
        lengte[i * breed + j] = gelijk(kopA[i], kopB[j])
          ? lengte[(i + 1) * breed + j + 1] + 1
          : Math.max(lengte[(i + 1) * breed + j], lengte[i * breed + j + 1]);
      }
    }
    let i = 0;
    let j = 0;
    while (i < n && j < m) {
      if (gelijk(kopA[i], kopB[j])) {
        midden.push({ soort: "gelijk", waarde: kopA[i] });
        i++;
        j++;
      } else if (lengte[(i + 1) * breed + j] >= lengte[i * breed + j + 1]) {
        midden.push({ soort: "weg", waarde: kopA[i++] });
      } else {
        midden.push({ soort: "erbij", waarde: kopB[j++] });
      }
    }
    while (i < n) midden.push({ soort: "weg", waarde: kopA[i++] });
    while (j < m) midden.push({ soort: "erbij", waarde: kopB[j++] });
  }

  return [
    ...a.slice(0, begin).map((waarde) => ({ soort: "gelijk" as const, waarde })),
    ...midden,
    ...a.slice(a.length - eind).map((waarde) => ({ soort: "gelijk" as const, waarde })),
  ];
}

/** Splitst een tekst in regels (Windows-regeleinden worden gewone). Lege tekst = geen regels. */
export function splitsRegels(tekst: string): string[] {
  if (!tekst) return [];
  return tekst.replace(/\r\n?/g, "\n").split("\n");
}

/** Woorden en de witruimte ertussen, zodat samenvoegen de oorspronkelijke regel geeft. */
function woordenVan(regel: string): string[] {
  return regel.split(/(\s+)/).filter((w) => w !== "");
}

function voegSamen(delen: DiffDeel[]): DiffDeel[] {
  const uit: DiffDeel[] = [];
  for (const d of delen) {
    const vorige = uit[uit.length - 1];
    if (vorige && vorige.gewijzigd === d.gewijzigd) vorige.tekst += d.tekst;
    else uit.push({ ...d });
  }
  return uit;
}

/** Woordmarkering voor een oude en een nieuwe regel. */
export function woordDiff(oud: string, nieuw: string): { oud: DiffDeel[]; nieuw: DiffDeel[] } {
  const stappen = vergelijkReeksen(woordenVan(oud), woordenVan(nieuw));
  const o: DiffDeel[] = [];
  const n: DiffDeel[] = [];
  for (const s of stappen) {
    // Gewijzigde witruimte niet markeren: dat leest onrustig.
    const leeg = /^\s+$/.test(s.waarde);
    if (s.soort === "gelijk") {
      o.push({ tekst: s.waarde, gewijzigd: false });
      n.push({ tekst: s.waarde, gewijzigd: false });
    } else if (s.soort === "weg") {
      o.push({ tekst: s.waarde, gewijzigd: !leeg });
    } else {
      n.push({ tekst: s.waarde, gewijzigd: !leeg });
    }
  }
  return { oud: voegSamen(o), nieuw: voegSamen(n) };
}

/**
 * Vergelijkt `oud` met `nieuw` per regel. Een blok verwijderde regels direct
 * gevolgd door toegevoegde regels wordt paarsgewijs als "gewijzigd" gezien en
 * krijgt een woord-voor-woord-markering.
 */
export function regelDiff(oud: string, nieuw: string): DiffRegel[] {
  const stappen = vergelijkReeksen(splitsRegels(oud), splitsRegels(nieuw));
  const uit: DiffRegel[] = [];
  let k = 0;
  while (k < stappen.length) {
    if (stappen[k].soort === "gelijk") {
      uit.push({ soort: "gelijk", tekst: stappen[k].waarde });
      k++;
      continue;
    }
    const weg: string[] = [];
    const erbij: string[] = [];
    while (k < stappen.length && stappen[k].soort !== "gelijk") {
      (stappen[k].soort === "weg" ? weg : erbij).push(stappen[k].waarde);
      k++;
    }
    const paren = Math.min(weg.length, erbij.length);
    const wegRegels: DiffRegel[] = weg.map((tekst) => ({ soort: "weg", tekst }));
    const erbijRegels: DiffRegel[] = erbij.map((tekst) => ({ soort: "erbij", tekst }));
    for (let p = 0; p < paren; p++) {
      const w = woordDiff(weg[p], erbij[p]);
      // Alleen markeren als de regels nog op elkaar lijken.
      if (w.oud.some((d) => !d.gewijzigd && d.tekst.trim())) {
        wegRegels[p].delen = w.oud;
        erbijRegels[p].delen = w.nieuw;
      }
    }
    uit.push(...wegRegels, ...erbijRegels);
  }
  return uit;
}

/** Zijn er verschillen? */
export function heeftVerschil(regels: readonly DiffRegel[]): boolean {
  return regels.some((r) => r.soort !== "gelijk");
}

/** Telt toegevoegde en verwijderde regels. */
export function telVerschil(regels: readonly DiffRegel[]): { erbij: number; weg: number } {
  let erbij = 0;
  let weg = 0;
  for (const r of regels) {
    if (r.soort === "erbij") erbij++;
    else if (r.soort === "weg") weg++;
  }
  return { erbij, weg };
}

/** Klapt lange stukken ongewijzigde regels in; `context` regels rond elke wijziging blijven staan. */
export function compacteer(regels: readonly DiffRegel[], context = 2): (DiffRegel | DiffOverslag)[] {
  const tonen = new Array<boolean>(regels.length).fill(false);
  regels.forEach((r, i) => {
    if (r.soort === "gelijk") return;
    for (let j = Math.max(0, i - context); j <= Math.min(regels.length - 1, i + context); j++) tonen[j] = true;
  });
  const uit: (DiffRegel | DiffOverslag)[] = [];
  let overgeslagen = 0;
  regels.forEach((r, i) => {
    if (tonen[i]) {
      if (overgeslagen) uit.push({ soort: "overslag", aantal: overgeslagen });
      overgeslagen = 0;
      uit.push(r);
    } else {
      overgeslagen++;
    }
  });
  if (overgeslagen) uit.push({ soort: "overslag", aantal: overgeslagen });
  return uit;
}
