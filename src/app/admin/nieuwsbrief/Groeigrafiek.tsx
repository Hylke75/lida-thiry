import type { GroeiDag } from "@/lib/nieuwsbrief/statistiek";

const B = 600;
const H = 160;
const PAD_BOVEN = 8;
const BALK_H = 28;

const datumKort = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
function kort(datum: string): string {
  return datumKort.format(new Date(`${datum}T12:00:00Z`));
}

/**
 * Aantal aangemelde contacten per dag (lijn) met de nieuwe aanmeldingen per dag
 * (balkjes onderaan). Pure SVG in de accentkleur (werkt in licht en donker); per
 * dag een tooltip, en de cijfers staan ook in een uitklapbare tabel.
 */
export function Groeigrafiek({ reeks }: { reeks: readonly GroeiDag[] }) {
  if (reeks.length < 2) return null;
  const totalen = reeks.map((d) => d.totaal);
  const min = Math.min(...totalen);
  const max = Math.max(...totalen);
  // Wat ruimte onder en boven de lijn; bij een vlakke lijn toch een zichtbaar bereik.
  const onder = Math.max(0, min - Math.max(1, Math.ceil((max - min) * 0.1)));
  const boven = max + Math.max(1, Math.ceil((max - min) * 0.1));
  const lijnH = H - BALK_H - PAD_BOVEN - 6;
  const x = (i: number) => (i / (reeks.length - 1)) * B;
  const y = (v: number) => PAD_BOVEN + lijnH - ((v - onder) / (boven - onder)) * lijnH;
  const maxNieuw = Math.max(1, ...reeks.map((d) => d.nieuw));
  const stap = B / reeks.length;

  const punten = reeks.map((d, i) => `${x(i).toFixed(1)},${y(d.totaal).toFixed(1)}`).join(" ");
  const vlak = `0,${y(onder)} ${punten} ${B},${y(onder)}`;
  const eerste = reeks[0];
  const laatste = reeks[reeks.length - 1];
  const verschil = laatste.totaal - eerste.totaal;

  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">Aangemelde contacten, laatste {reeks.length} dagen</span>
        <span className="text-foreground/70">
          {eerste.totaal} → {laatste.totaal} ({verschil >= 0 ? "+" : "−"}
          {Math.abs(verschil)})
        </span>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div
          aria-hidden="true"
          className="flex flex-col justify-between pb-9 text-right text-xs tabular-nums text-foreground/70"
        >
          <span>{boven}</span>
          <span>{onder}</span>
        </div>
        <div className="flex flex-col gap-1">
          <svg
            viewBox={`0 0 ${B} ${H}`}
            preserveAspectRatio="none"
            className="h-40 w-full text-accent"
            role="img"
            aria-label={`Van ${eerste.totaal} aangemelde contacten op ${kort(eerste.datum)} naar ${laatste.totaal} op ${kort(laatste.datum)}.`}
          >
            {/* Rasterlijnen: onder- en bovengrens. */}
            <line
              x1="0"
              x2={B}
              y1={y(boven)}
              y2={y(boven)}
              className="stroke-black/10 dark:stroke-white/10"
              vectorEffect="non-scaling-stroke"
            />
            <line
              x1="0"
              x2={B}
              y1={y(onder)}
              y2={y(onder)}
              className="stroke-black/20 dark:stroke-white/20"
              vectorEffect="non-scaling-stroke"
            />
            <polygon points={vlak} fill="currentColor" opacity="0.12" />
            <polyline
              points={punten}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
            {reeks.map((d, i) => {
              const h = d.nieuw ? Math.max(2, (d.nieuw / maxNieuw) * (BALK_H - 4)) : 0;
              return (
                <g key={d.datum} className="group">
                  {h > 0 && (
                    <rect
                      x={i * stap + stap * 0.15}
                      width={stap * 0.7}
                      y={H - h}
                      height={h}
                      rx="1"
                      fill="currentColor"
                      opacity="0.55"
                    />
                  )}
                  {/* Groot raakvlak per dag voor de tooltip. */}
                  <rect
                    x={i * stap}
                    width={stap}
                    y="0"
                    height={H}
                    fill="transparent"
                    className="group-hover:fill-black/5 dark:group-hover:fill-white/5"
                  >
                    <title>
                      {`${kort(d.datum)}: ${d.totaal} aangemeld` +
                        (d.nieuw || d.weg ? ` (+${d.nieuw} nieuw, −${d.weg} vertrokken)` : "")}
                    </title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div aria-hidden="true" className="flex justify-between text-xs text-foreground/70">
            <span>{kort(eerste.datum)}</span>
            <span>balkjes: nieuwe aanmeldingen per dag</span>
            <span>{kort(laatste.datum)}</span>
          </div>
        </div>
      </div>
      <details className="text-sm">
        <summary className="cursor-pointer text-foreground/70">Cijfers per dag als tabel</summary>
        <div className="mt-2 max-h-64 overflow-auto">
          <table className="w-full text-left tabular-nums">
            <thead className="text-xs text-foreground/70">
              <tr>
                <th className="py-1 font-normal">Datum</th>
                <th className="py-1 text-right font-normal">Aangemeld</th>
                <th className="py-1 text-right font-normal">Nieuw</th>
                <th className="py-1 text-right font-normal">Vertrokken</th>
              </tr>
            </thead>
            <tbody>
              {[...reeks].reverse().map((d) => (
                <tr key={d.datum} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-1">{kort(d.datum)}</td>
                  <td className="py-1 text-right">{d.totaal}</td>
                  <td className="py-1 text-right">{d.nieuw || ""}</td>
                  <td className="py-1 text-right">{d.weg || ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
      <p className="text-xs text-foreground/70">
        Teruggerekend vanaf het huidige aantal; verwijderde contacten tellen niet mee. Vertrokken = afgemeld,
        onbestelbaar (bounce) of spamklacht.
      </p>
    </figure>
  );
}
