import type { Dispatch, SetStateAction } from "react";
import type { PasvormVraag } from "@/lib/inhoud/groepen/test";
import type { Antwoorden } from "../wizard-regels";
import { keuzeTegel } from "@/components/site/FormulierStijl";

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
    <div className="flex flex-col gap-5">
      {vragen.map((q) => (
        <fieldset key={q.sleutel} className="min-w-0 rounded-ontwerp-md border border-line bg-white p-5 tablet:p-6">
          <legend className="float-left mb-4 w-full text-[17px] font-bold text-ink">{q.vraag}</legend>
          <div className="clear-left flex flex-wrap gap-2.5">
            {q.opties.map((optie) => {
              const gekozen = a.pasvorm[q.sleutel] === optie;
              return (
                <label
                  key={optie}
                  className={`inline-flex min-h-11 items-center rounded-ontwerp-sm px-4 py-2 text-[15px] font-semibold ${keuzeTegel(gekozen)}`}
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
