// Getekende vrouwenfiguur (vooraanzicht) voor de meetinstructies en silhouetkeuze.
// Alles is inline SVG: geen externe beelden nodig, scherp op elk scherm.

import type { Lichaamsvorm, MaatSleutel } from "@/lib/test-config";
import { CX, HOOFD, STANDAARD_VORM, Y, armPad, lichaamsPad } from "@/lib/lichaam-pad";

const LINT = "var(--accent)";

export { STANDAARD_VORM };

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
  const arm = (kant: -1 | 1) => armPad(vorm, kant);

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
          <circle cx={HOOFD.cx} cy={HOOFD.cy} r={HOOFD.r} />
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
