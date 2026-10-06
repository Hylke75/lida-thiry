import type { Dispatch, SetStateAction } from "react";
import { SilhouetVlak, vlakKleur } from "@/components/figuur/SilhouetVlak";
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
        {silhouetten.map((s, i) => {
          const gekozen = a.silhouet === s.letter;
          return (
            <label
              key={s.letter}
              className={`relative flex flex-col items-center gap-2 rounded-ontwerp-md p-4 text-center text-[14px] ${keuzeTegel(gekozen)}`}
            >
              <input
                type="radio"
                name="silhouet"
                value={s.letter}
                checked={gekozen}
                onChange={() => setA((x) => ({ ...x, silhouet: s.letter }))}
                className="sr-only"
              />
              {/* Vinkje bij de gekozen tegel (de radioknop zelf is voor schermlezers). */}
              <span
                aria-hidden="true"
                className={`absolute top-3 right-3 grid h-7 w-7 place-items-center rounded-full border-2 transition-colors ${
                  gekozen ? "border-berry bg-berry text-white" : "border-[rgba(47,36,65,.24)] bg-white text-transparent"
                }`}
              >
                <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" focusable="false">
                  <path d="M3.5 8.5 6.5 11.5 12.5 4.5" />
                </svg>
              </span>
              <SilhouetVlak
                silhouet={s}
                titel={s.naam}
                kleur={gekozen ? "coral" : vlakKleur(i)}
                variant={i % 2 === 0 ? 0 : 1}
                className="h-44 w-32 tablet:h-48 tablet:w-36"
                figuurKlasse="h-36 tablet:h-40"
              />
              <strong className="font-serif text-[22px] leading-[1.1] font-normal">{s.naam}</strong>
              <span className="text-[13px] leading-[1.5] text-ink-soft">{s.omschrijving}</span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
