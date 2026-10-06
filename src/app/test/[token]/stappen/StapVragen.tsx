import type { Dispatch, SetStateAction } from "react";
import type { PasvormVraag } from "@/lib/inhoud/groepen/test";
import type { Antwoorden } from "../wizard-regels";

/** Stap "Vragen": de pasvormvragen, elk met keuzeknoppen. */
export function StapVragen({
  vragen,
  a,
  setA,
}: {
  vragen: PasvormVraag[];
  a: Antwoorden;
  setA: Dispatch<SetStateAction<Antwoorden>>;
}) {
  return (
    <div className="flex flex-col gap-6">
      {vragen.map((q) => (
        <fieldset key={q.sleutel}>
          <legend className="mb-2 text-sm font-medium">{q.vraag}</legend>
          <div className="flex flex-wrap gap-2">
            {q.opties.map((optie) => {
              const gekozen = a.pasvorm[q.sleutel] === optie;
              return (
                <label
                  key={optie}
                  className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                    gekozen
                      ? "border-accent bg-accent-zacht"
                      : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
                  }`}
                >
                  <input
                    type="radio"
                    name={q.sleutel}
                    value={optie}
                    checked={gekozen}
                    onChange={() => setA((s) => ({ ...s, pasvorm: { ...s.pasvorm, [q.sleutel]: optie } }))}
                    className="sr-only"
                  />
                  {optie}
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
}
