// Getekende vrouwenfiguur (vooraanzicht) voor de meetinstructies en silhouetkeuze.
// Alles is inline SVG: geen externe beelden nodig, scherp op elk scherm.

import type { Lichaamsvorm, MaatSleutel } from "@/lib/test-config";

const CX = 100;
const LINT = "#e11d48";

export const STANDAARD_VORM: Lichaamsvorm = {
  schouder: 38,
  borst: 34,
  taille: 26,
  hogeHeup: 31,
  heup: 37,
};

// Hoogtes (y) van de meetpunten in de illustratie.
const Y = {
  hoofdBoven: 20,
  schouder: 92,
  borst: 128,
  taille: 172,
  hogeHeup: 198,
  heup: 232,
  kruis: 270,
  vloer: 398,
};

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

function lichaamsPad(v: Lichaamsvorm): string {
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

/** Meetlint rond het lichaam: voorkant doorgetrokken, achterkant gestippeld. */
function Lint({ y, r }: { y: number; r: number }) {
  const ry = 6;
  return (
    <g stroke={LINT} strokeWidth={3} fill="none" strokeLinecap="round">
      <path
        d={`M${CX - r},${y} A${r},${ry} 0 0 1 ${CX + r},${y}`}
        strokeDasharray="4 4"
        opacity={0.55}
      />
      <path d={`M${CX - r},${y} A${r},${ry} 0 0 0 ${CX + r},${y}`} />
    </g>
  );
}

/** Verticale maatlijn met eindstreepjes. */
function Maatlijn({ x, y1, y2 }: { x: number; y1: number; y2: number }) {
  return (
    <g stroke={LINT} strokeWidth={3} strokeLinecap="round">
      <line x1={x} y1={y1} x2={x} y2={y2} />
      <line x1={x - 7} y1={y1} x2={x + 7} y2={y1} />
      <line x1={x - 7} y1={y2} x2={x + 7} y2={y2} />
    </g>
  );
}

export type Meetpunt = MaatSleutel | "lengte";

export function Lichaam({
  vorm = STANDAARD_VORM,
  meet,
  armen = true,
  className,
  titel,
}: {
  vorm?: Lichaamsvorm;
  meet?: Meetpunt;
  /** Zonder armen is de lichaamsvorm beter te zien (silhouetkeuze). */
  armen?: boolean;
  className?: string;
  titel: string;
}) {
  const arm = (kant: -1 | 1) => {
    const x0 = CX + kant * (vorm.schouder - 4);
    const xc = CX + kant * (vorm.schouder + 12);
    const x1 = CX + kant * (vorm.heup + 10);
    return `M${x0},${Y.schouder + 4} Q${xc},160 ${x1},240`;
  };

  return (
    <svg
      viewBox="0 0 200 410"
      role="img"
      aria-label={titel}
      className={className}
    >
      <g className="text-foreground">
        <g
          fill="currentColor"
          fillOpacity={0.1}
          stroke="currentColor"
          strokeOpacity={0.4}
          strokeWidth={1.5}
        >
          <path d={lichaamsPad(vorm)} />
          <circle cx={CX} cy={42} r={22} />
        </g>
        {armen && (
          <>
            <g
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.4}
              strokeWidth={13}
              strokeLinecap="round"
            >
              <path d={arm(-1)} />
              <path d={arm(1)} />
            </g>
            <g
              fill="none"
              stroke="var(--background)"
              strokeWidth={10}
              strokeLinecap="round"
            >
              <path d={arm(-1)} />
              <path d={arm(1)} />
            </g>
            <g
              fill="none"
              stroke="currentColor"
              strokeOpacity={0.1}
              strokeWidth={10}
              strokeLinecap="round"
            >
              <path d={arm(-1)} />
              <path d={arm(1)} />
            </g>
          </>
        )}
      </g>

      {meet === "schouder" && (
        <Lint y={Y.schouder + 2} r={vorm.schouder + 11} />
      )}
      {meet === "borst" && <Lint y={Y.borst} r={vorm.borst + 4} />}
      {meet === "taille" && <Lint y={Y.taille} r={vorm.taille + 4} />}
      {meet === "hoge_heup" && <Lint y={Y.hogeHeup} r={vorm.hogeHeup + 4} />}
      {meet === "heup" && <Lint y={Y.heup} r={vorm.heup + 4} />}
      {meet === "binnenbeen" && (
        <Maatlijn x={CX - 9} y1={Y.kruis + 4} y2={Y.vloer} />
      )}
      {meet === "lengte" && (
        <>
          <line
            x1={150}
            y1={Y.vloer + 1}
            x2={196}
            y2={Y.vloer + 1}
            stroke="currentColor"
            strokeOpacity={0.3}
          />
          <Maatlijn x={178} y1={Y.hoofdBoven} y2={Y.vloer} />
        </>
      )}
    </svg>
  );
}
