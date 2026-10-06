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
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${((stap + 1) / STAPPEN.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
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
                className={`flex items-center gap-2 rounded-full px-2 py-1.5 text-xs ${
                  actief
                    ? "bg-foreground px-3 font-medium text-background"
                    : bereikbaar(i)
                      ? "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                      : "text-black/30 dark:text-white/30"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    actief
                      ? "bg-background text-foreground"
                      : klaar
                        ? "bg-accent text-background"
                        : "border border-current"
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
