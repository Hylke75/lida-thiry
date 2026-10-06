import { useEffect, useRef } from "react";
import type { Stap } from "./wizard-regels";

/** Voortgangsbalk met klikbare stappen boven de test. */
export function Voortgang({
  stappen: STAPPEN,
  stap,
  bereikbaar,
  gaNaar,
}: {
  stappen: Stap[];
  stap: number;
  bereikbaar: (i: number) => boolean;
  gaNaar: (i: number) => void;
}) {
  const actiefRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    actiefRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [stap]);

  return (
    <nav aria-label="Voortgang" className="mt-4">
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-coral transition-[width] duration-500"
          style={{ width: `${((stap + 1) / STAPPEN.length) * 100}%` }}
        />
      </div>
      <ol className="m-0 mt-3 flex list-none flex-wrap items-center gap-0.5 p-0 py-1 tablet:gap-1">
        {STAPPEN.map((s, i) => {
          const klaar = i < stap;
          const actief = i === stap;
          return (
            <li key={i} ref={actief ? actiefRef : undefined} className="shrink-0">
              <button
                type="button"
                onClick={() => gaNaar(i)}
                disabled={!bereikbaar(i) || actief}
                aria-current={actief ? "step" : undefined}
                aria-label={`Stap ${i + 1}: ${s.titel}`}
                title={s.titel}
                className={`flex min-h-11 items-center gap-2 rounded-full px-0.5 text-[13px] font-bold tablet:px-1.5 ${
                  actief
                    ? "bg-berry pr-4 text-white"
                    : bereikbaar(i)
                      ? "text-ink hover:bg-cream"
                      : "text-ink-soft"
                }`}
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] tablet:h-8 tablet:w-8 ${
                    actief
                      ? "bg-white text-berry"
                      : klaar
                        ? "bg-coral-soft text-ink"
                        : "border border-[rgba(47,36,65,.3)]"
                  }`}
                >
                  {klaar ? "✓" : i + 1}
                </span>
                {actief && <span>{s.titel}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
