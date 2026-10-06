// Getekende vrouwenfiguur (vooraanzicht) voor de meetinstructies, de silhouetkeuze,
// de uitslag en "Jouw figuurtype". Alles is inline SVG: geen externe beelden
// nodig, scherp op elk scherm.
//
// Kleuren uit de huisstijl (globals.css): de figuur is perzik met een zachte
// inktlijn (≥ 3:1 op papier en wit, WCAG 1.4.11), het meetlint koraal. Een ouder
// kan de kleuren per plek aanpassen met de CSS-variabelen --lichaam-vulling,
// --lichaam-lijn en --lichaam-lint (bijv. [--lichaam-vulling:var(--white)]).

import type { Lichaamsvorm, MaatSleutel } from "@/lib/test-config";
import { CX, HOOFD, STANDAARD_VORM, Y, armPad, lichaamsPad } from "@/lib/lichaam-pad";

const VULLING = "var(--lichaam-vulling, var(--peach))";
const LIJN = "var(--lichaam-lijn, var(--ink-soft))";
const LINT = "var(--lichaam-lint, var(--coral-tekst))";

/** Meetlint rond het lichaam: voorkant doorgetrokken, achterkant gestippeld. */
function Lint({ y, r }: { y: number; r: number }) {
  const ry = 6;
  return (
    <g stroke={LINT} strokeWidth={3} fill="none" strokeLinecap="round">
      <path d={`M${CX - r},${y} A${r},${ry} 0 0 1 ${CX + r},${y}`} strokeDasharray="4 4" opacity={0.55} />
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
  /** Beschrijving voor schermlezers; leeg = decoratief (verborgen voor schermlezers). */
  titel: string;
}) {
  const arm = (kant: -1 | 1) => armPad(vorm, kant);
  const toegankelijk = titel.trim()
    ? ({ role: "img", "aria-label": titel } as const)
    : ({ "aria-hidden": true, focusable: "false" } as const);

  return (
    <svg viewBox="0 0 200 410" className={className} {...toegankelijk}>
      {armen && (
        // Armen achter de romp: eerst de lijn (breed), dan de vulling erover.
        <g fill="none" strokeLinecap="round">
          <g stroke={LIJN} strokeWidth={13}>
            <path d={arm(-1)} />
            <path d={arm(1)} />
          </g>
          <g stroke={VULLING} strokeWidth={10}>
            <path d={arm(-1)} />
            <path d={arm(1)} />
          </g>
        </g>
      )}
      <g fill={VULLING} stroke={LIJN} strokeWidth={1.5} strokeLinejoin="round">
        <path d={lichaamsPad(vorm)} />
        <circle cx={HOOFD.cx} cy={HOOFD.cy} r={HOOFD.r} />
      </g>

      {meet === "schouder" && <Lint y={Y.schouder + 2} r={vorm.schouder + 11} />}
      {meet === "borst" && <Lint y={Y.borst} r={vorm.borst + 4} />}
      {meet === "taille" && <Lint y={Y.taille} r={vorm.taille + 4} />}
      {meet === "hoge_heup" && <Lint y={Y.hogeHeup} r={vorm.hogeHeup + 4} />}
      {meet === "heup" && <Lint y={Y.heup} r={vorm.heup + 4} />}
      {meet === "binnenbeen" && <Maatlijn x={CX - 9} y1={Y.kruis + 4} y2={Y.vloer} />}
      {meet === "lengte" && (
        <>
          <line x1={150} y1={Y.vloer + 1} x2={196} y2={Y.vloer + 1} stroke={LIJN} strokeOpacity={0.5} />
          <Maatlijn x={178} y1={Y.hoofdBoven} y2={Y.vloer} />
        </>
      )}
    </svg>
  );
}
