import type { Dispatch, SetStateAction } from "react";
import { Lichaam } from "@/components/Lichaam";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { Antwoorden } from "../wizard-regels";

/** Stap "Silhouet": kies het lichaamstype dat het meest op het jouwe lijkt. */
export function StapSilhouet({
  a,
  setA,
  silhouetten,
  intro,
}: {
  a: Antwoorden;
  setA: Dispatch<SetStateAction<Antwoorden>>;
  silhouetten: Silhouet[];
  intro: string;
}) {
  return (
    <fieldset>
      <legend className="mb-3 whitespace-pre-line text-sm text-black/60 dark:text-white/60">{intro}</legend>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {silhouetten.map((s) => {
          const gekozen = a.silhouet === s.letter;
          return (
            <label
              key={s.letter}
              className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                gekozen
                  ? "border-accent bg-accent-zacht"
                  : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
              }`}
            >
              <input
                type="radio"
                name="silhouet"
                value={s.letter}
                checked={gekozen}
                onChange={() => setA((x) => ({ ...x, silhouet: s.letter }))}
                className="sr-only"
              />
              {s.beeldUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- tijdelijke (signed) URL uit de beeldbank
                <img src={s.beeldUrl} alt={s.naam} className="h-40 w-auto object-contain" />
              ) : (
                <Lichaam vorm={s.vorm} armen={false} titel={s.naam} className="h-40" />
              )}
              <strong>{s.naam}</strong>
              <span className="text-xs text-black/50 dark:text-white/50">{s.omschrijving}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
