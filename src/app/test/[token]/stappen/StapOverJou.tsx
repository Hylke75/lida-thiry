import type { Dispatch, SetStateAction } from "react";
import { Lichaam } from "@/components/Lichaam";
import { getal, type Antwoorden } from "../wizard-regels";
import { Invoer } from "./Invoer";
import { KLANT_INTRO } from "@/components/site/KlantPagina";

/** Stap "Over jou": lengte en gewicht. */
export function StapOverJou({
  a,
  setA,
  toonFouten,
  intro,
}: {
  a: Antwoorden;
  setA: Dispatch<SetStateAction<Antwoorden>>;
  toonFouten: boolean;
  intro: string;
}) {
  return (
    <div className="grid items-center gap-6 rounded-ontwerp-md border border-line bg-white p-5 tablet:grid-cols-[170px_1fr] tablet:gap-8 tablet:p-[30px]">
      <div className="mx-auto flex items-center justify-center rounded-[46%_54%_46%_54%/52%_42%_58%_48%] bg-cream px-5 py-6 [--lichaam-vulling:var(--white)]">
        <Lichaam meet="lengte" titel="Lengte meten" className="h-56 tablet:h-64" />
      </div>
      <div className="flex flex-col gap-5">
        <p className={`${KLANT_INTRO} m-0 whitespace-pre-line text-[17px]`}>{intro}</p>
        <Invoer
          label="Lengte"
          eenheid="cm"
          voorbeeld="bijv. 168"
          waarde={a.lengte}
          zet={(w) => setA((s) => ({ ...s, lengte: w }))}
          fout={toonFouten && Number.isNaN(getal(a.lengte)) ? "Vul je lengte in." : null}
        />
        <Invoer
          label="Gewicht"
          eenheid="kg"
          voorbeeld="bijv. 65"
          waarde={a.gewicht}
          zet={(w) => setA((s) => ({ ...s, gewicht: w }))}
          fout={toonFouten && Number.isNaN(getal(a.gewicht)) ? "Vul je gewicht in." : null}
        />
      </div>
    </div>
  );
}
