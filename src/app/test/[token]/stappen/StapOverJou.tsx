import type { Dispatch, SetStateAction } from "react";
import { Lichaam } from "@/components/Lichaam";
import { getal, type Antwoorden } from "../wizard-regels";
import { Invoer } from "./Invoer";

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
    <div className="grid items-center gap-6 sm:grid-cols-[140px_1fr]">
      <Lichaam meet="lengte" titel="Lengte meten" className="mx-auto h-56 sm:h-64" />
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-line text-sm text-black/60 dark:text-white/60">{intro}</p>
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
