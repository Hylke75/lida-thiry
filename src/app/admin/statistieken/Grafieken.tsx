import type { TrechterStap } from "@/lib/statistiek/trechter";

// Lichte grafieken voor Beheer → Statistieken: pure SVG/HTML in de accentkleur
// (werkt in licht en donker), met tooltips per balk en de cijfers ook als tabel.

const datumKort = new Intl.DateTimeFormat("nl-NL", { day: "numeric", month: "short", timeZone: "UTC" });
export function kortDatum(datum: string): string {
  return datumKort.format(new Date(`${datum}T12:00:00Z`));
}

function pct(w: number | null): string {
  return w == null ? "–" : `${w.toLocaleString("nl-NL")}%`;
}

/** De conversietrechter als horizontale balken, met het percentage t.o.v. de vorige stap. */
export function Trechter({ stappen }: { stappen: readonly TrechterStap[] }) {
  const max = Math.max(1, stappen[0]?.aantal ?? 0);
  return (
    <figure className="flex flex-col gap-3">
      <figcaption className="sr-only">
        Conversietrechter: {stappen.map((s) => `${s.label} ${s.aantal}`).join(", ")}.
      </figcaption>
      <ol className="flex flex-col gap-2.5">
        {stappen.map((s, i) => (
          <li key={s.sleutel} className="grid grid-cols-[minmax(7.5rem,10rem)_1fr_auto] items-center gap-3 text-sm">
            <span>{s.label}</span>
            <span className="h-5 overflow-hidden rounded-r-md bg-black/5 dark:bg-white/10" aria-hidden="true">
              <span
                className="block h-full rounded-r-md bg-accent"
                style={{ width: `${(s.aantal / max) * 100}%`, opacity: 1 - i * 0.12 }}
                title={`${s.label}: ${s.aantal}`}
              />
            </span>
            <span className="min-w-[6.5rem] text-right tabular-nums">
              <span className="font-medium">{s.aantal.toLocaleString("nl-NL")}</span>
              {i > 0 && <span className="ml-1.5 text-xs text-black/55 dark:text-white/55">({pct(s.vanVorige)})</span>}
            </span>
          </li>
        ))}
      </ol>
      <p className="text-xs text-black/55 dark:text-white/55">
        Tussen haakjes: het deel van de vorige stap. Van aangemaakt tot advies verzonden:{" "}
        {pct(stappen[stappen.length - 1]?.vanStart ?? null)}.
      </p>
    </figure>
  );
}

const B = 600;
const H = 140;

/** Eén reeks per dag als staafjes (bijv. bestellingen per dag), met tooltip per dag en een tabel. */
export function DagStaven({
  titel,
  reeks,
  eenheid,
}: {
  titel: string;
  reeks: readonly { datum: string; aantal: number }[];
  /** Bijv. "bestellingen" (voor tooltip en tabel). */
  eenheid: string;
}) {
  if (!reeks.length) return null;
  const max = Math.max(1, ...reeks.map((d) => d.aantal));
  const stap = B / reeks.length;
  const totaal = reeks.reduce((s, d) => s + d.aantal, 0);
  const breedte = Math.max(1, Math.min(stap - 2, stap * 0.8));
  return (
    <figure className="flex flex-col gap-2">
      <figcaption className="flex flex-wrap items-baseline justify-between gap-2 text-sm">
        <span className="font-medium">{titel}</span>
        <span className="text-black/60 dark:text-white/60">
          totaal {totaal.toLocaleString("nl-NL")} · hoogste dag {Math.max(0, ...reeks.map((d) => d.aantal))}
        </span>
      </figcaption>
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <div
          aria-hidden="true"
          className="flex flex-col justify-between pb-5 text-right text-xs tabular-nums text-black/50 dark:text-white/50"
        >
          <span>{max}</span>
          <span>0</span>
        </div>
        <div className="flex flex-col gap-1">
          <svg
            viewBox={`0 0 ${B} ${H}`}
            preserveAspectRatio="none"
            className="h-36 w-full text-accent"
            role="img"
            aria-label={`${titel}: ${totaal} ${eenheid} van ${kortDatum(reeks[0].datum)} tot en met ${kortDatum(reeks[reeks.length - 1].datum)}.`}
          >
            <line x1="0" x2={B} y1={H - 0.5} y2={H - 0.5} className="stroke-black/20 dark:stroke-white/20" vectorEffect="non-scaling-stroke" />
            {reeks.map((d, i) => {
              const h = d.aantal ? Math.max(2, (d.aantal / max) * (H - 6)) : 0;
              return (
                <g key={d.datum} className="group">
                  {h > 0 && (
                    <rect x={i * stap + (stap - breedte) / 2} width={breedte} y={H - h} height={h} rx="1.5" fill="currentColor" />
                  )}
                  <rect
                    x={i * stap}
                    width={stap}
                    y="0"
                    height={H}
                    fill="transparent"
                    className="group-hover:fill-black/5 dark:group-hover:fill-white/5"
                  >
                    <title>{`${kortDatum(d.datum)}: ${d.aantal} ${eenheid}`}</title>
                  </rect>
                </g>
              );
            })}
          </svg>
          <div aria-hidden="true" className="flex justify-between text-xs text-black/50 dark:text-white/50">
            <span>{kortDatum(reeks[0].datum)}</span>
            <span>{kortDatum(reeks[reeks.length - 1].datum)}</span>
          </div>
        </div>
      </div>
      <details className="text-xs text-black/60 dark:text-white/60">
        <summary className="cursor-pointer">Toon als tabel</summary>
        <table className="mt-2 w-full max-w-xs tabular-nums">
          <thead>
            <tr>
              <th className="text-left font-medium">Dag</th>
              <th className="text-right font-medium">Aantal</th>
            </tr>
          </thead>
          <tbody>
            {reeks.map((d) => (
              <tr key={d.datum}>
                <td>{kortDatum(d.datum)}</td>
                <td className="text-right">{d.aantal}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}

/** Eenvoudige horizontale balken (bijv. top figuurtypes). */
export function Balken({ rijen, leeg }: { rijen: readonly { label: string; aantal: number }[]; leeg: string }) {
  if (!rijen.length) return <p className="text-sm text-black/55 dark:text-white/55">{leeg}</p>;
  const max = Math.max(1, ...rijen.map((r) => r.aantal));
  return (
    <ul className="flex flex-col gap-1.5">
      {rijen.map((r) => (
        <li key={r.label} className="grid grid-cols-[minmax(6rem,9rem)_1fr_2.5rem] items-center gap-2 text-sm">
          <span className="truncate">{r.label}</span>
          <span className="h-3 overflow-hidden rounded-r-md bg-black/5 dark:bg-white/10" aria-hidden="true">
            <span className="block h-full rounded-r-md bg-accent" style={{ width: `${(r.aantal / max) * 100}%` }} />
          </span>
          <span className="text-right tabular-nums text-black/70 dark:text-white/70">{r.aantal}</span>
        </li>
      ))}
    </ul>
  );
}
