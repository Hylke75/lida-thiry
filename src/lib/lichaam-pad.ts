// Pure geometrie van de getekende vrouwenfiguur (vooraanzicht, viewBox 0 0 200 410).
// Gedeeld door de web-illustraties (Lichaam.tsx) en de advies-PDF, zodat beide
// exact dezelfde vorm tekenen.

import type { Lichaamsvorm } from "./test-config";

export const VIEWBOX = { breedte: 200, hoogte: 410 } as const;

/** Horizontaal midden van de figuur. */
export const CX = 100;

/** Middelpunt en straal van het hoofd. */
export const HOOFD = { cx: CX, cy: 42, r: 22 } as const;

export const STANDAARD_VORM: Lichaamsvorm = {
  schouder: 38,
  borst: 34,
  taille: 26,
  hogeHeup: 31,
  heup: 37,
};

/** Hoogtes (y) van de meetpunten in de illustratie. */
export const Y = {
  hoofdBoven: 20,
  schouder: 92,
  borst: 128,
  taille: 172,
  hogeHeup: 198,
  heup: 232,
  kruis: 270,
  vloer: 398,
} as const;

/** Catmull-Rom door de punten -> gesloten, vloeiend SVG-pad. */
function vloeiendPad(p: [number, number][]): string {
  const n = p.length;
  let d = `M${p[0][0]},${p[0][1]}`;
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [
      p[(i - 1 + n) % n],
      p[i],
      p[(i + 1) % n],
      p[(i + 2) % n],
    ];
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C${c1[0].toFixed(1)},${c1[1].toFixed(1)} ${c2[0].toFixed(1)},${c2[1].toFixed(1)} ${p2[0]},${p2[1]}`;
  }
  return d + "Z";
}

/** Omtrek van romp en benen (zonder hoofd en armen) als gesloten SVG-pad. */
export function lichaamsPad(v: Lichaamsvorm): string {
  // Linkerhelft van boven naar beneden als [afstand tot midden, y].
  const links: [number, number][] = [
    [9, 66],
    [10, 78],
    [v.schouder, Y.schouder],
    [v.borst + 1, 112],
    [v.borst, Y.borst],
    [v.taille, Y.taille],
    [v.hogeHeup, Y.hogeHeup],
    [v.heup, Y.heup],
    [v.heup - 3, 262],
    [Math.round(v.heup * 0.45 + 10), 330],
    [15, 386],
    [17, Y.vloer],
    [5, Y.vloer],
    [6, 386],
    [7, 330],
    [4, 285],
  ];
  const punten: [number, number][] = [
    ...links.map(([dx, y]) => [CX - dx, y] as [number, number]),
    [CX, Y.kruis],
    ...[...links].reverse().map(([dx, y]) => [CX + dx, y] as [number, number]),
  ];
  return vloeiendPad(punten);
}

/** Lijn van een arm (links: -1, rechts: 1); wordt als dikke stroke getekend. */
export function armPad(v: Lichaamsvorm, kant: -1 | 1): string {
  const x0 = CX + kant * (v.schouder - 4);
  const xc = CX + kant * (v.schouder + 12);
  const x1 = CX + kant * (v.heup + 10);
  return `M${x0},${Y.schouder + 4} Q${xc},160 ${x1},240`;
}

export interface OmtrekMaten {
  borst: number;
  taille: number;
  hogeHeup: number;
  heup: number;
  schouder?: number | null;
}

/**
 * Zet gemeten omtrekken (cm) om naar halve breedtes in de illustratie. De
 * verschillen rond het gemiddelde worden iets aangezet, zodat de eigen vorm
 * herkenbaar is; uitersten worden begrensd zodat de tekening netjes blijft.
 */
export function vormUitMaten(m: OmtrekMaten): Lichaamsvorm {
  const gemiddeld = (m.borst + m.taille + m.hogeHeup + m.heup) / 4;
  const basis = gemiddeld * 0.37;
  const half = (cm: number) =>
    Math.round(Math.min(56, Math.max(14, basis + (cm - gemiddeld) * 0.55)));
  const borst = half(m.borst);
  // Schouderomvang (over de armen gemeten) is groter dan de borstomvang; zonder
  // meting nemen we een schouder iets breder dan de borst.
  const schouder = m.schouder
    ? Math.round(Math.min(58, Math.max(borst, half(m.schouder * 0.88))))
    : borst + 4;
  return {
    schouder,
    borst,
    taille: half(m.taille),
    hogeHeup: half(m.hogeHeup),
    heup: half(m.heup),
  };
}
