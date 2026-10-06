import type { Dispatch, SetStateAction } from "react";
import { Lichaam } from "@/components/Lichaam";
import type { Silhouet } from "@/lib/lichaamstype-regels";
import type { Antwoorden } from "../wizard-regels";
import { keuzeTegel } from "@/components/site/FormulierStijl";
import { KLANT_INTRO } from "@/components/site/KlantPagina";

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
    <fieldset className="min-w-0">
      <legend className={`${KLANT_INTRO} mb-5 whitespace-pre-line text-[17px]`}>{intro}</legend>
      <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3 tablet:gap-4">
        {silhouetten.map((s) => {
          const gekozen = a.silhouet === s.letter;
          return (
            <label
              key={s.letter}
              className={`flex flex-col items-center gap-2 rounded-ontwerp-md p-4 text-center text-[14px] ${keuzeTegel(gekozen)}`}
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
              <strong className="font-serif text-[22px] leading-[1.1] font-normal">{s.naam}</strong>
              <span className="text-[13px] leading-[1.5] text-ink-soft">{s.omschrijving}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
