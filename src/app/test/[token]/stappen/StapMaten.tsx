import type { Dispatch, SetStateAction } from "react";
import type { MaatVeld } from "@/lib/test-config";
import { maatFout, type Antwoorden } from "../wizard-regels";
import { MaatKaart } from "./MaatKaart";

/** Een meetstap: de maatkaarten van één groep, met de meettip boven de eerste meetstap. */
export function StapMaten({
  velden,
  a,
  setA,
  toonFouten,
  meetBeelden,
  tip,
  tweeKeerHint,
}: {
  velden: MaatVeld[];
  a: Antwoorden;
  setA: Dispatch<SetStateAction<Antwoorden>>;
  toonFouten: boolean;
  meetBeelden: Record<string, string>;
  /** Meettip; alleen meegeven op de eerste meetstap. */
  tip: string | null;
  tweeKeerHint: string;
}) {
  const zet = (veld: "maten" | "controle", sleutel: string, w: string) =>
    setA((s) => ({ ...s, [veld]: { ...s[veld], [sleutel]: w } }));

  return (
    <div className="flex flex-col gap-5">
      {tip && (
        <p className="whitespace-pre-line rounded-lg bg-black/5 px-4 py-3 text-sm text-black/70 dark:bg-white/10 dark:text-white/70">
          💡 {tip}
        </p>
      )}
      {velden.map((v) => (
        <MaatKaart
          key={v.sleutel}
          veld={v}
          beeld={meetBeelden[v.sleutel]}
          waarde={a.maten[v.sleutel] ?? ""}
          controle={a.controle[v.sleutel] ?? ""}
          zetWaarde={(w) => zet("maten", v.sleutel, w)}
          zetControle={(w) => zet("controle", v.sleutel, w)}
          fout={toonFouten ? maatFout(v, a) : null}
          tweeKeerHint={tweeKeerHint}
        />
      ))}
    </div>
  );
}
