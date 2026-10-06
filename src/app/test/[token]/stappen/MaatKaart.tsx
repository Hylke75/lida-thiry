import type { MaatVeld } from "@/lib/test-config";
import { Lichaam } from "@/components/Lichaam";
import { kaalLabel, metingenKomenOvereen } from "../wizard-regels";
import { Invoer } from "./Invoer";

/** Eén maat: meetbeeld, instructie, meting (en controlemeting) en terugkoppeling. */
export function MaatKaart({
  veld,
  beeld,
  waarde,
  controle,
  zetWaarde,
  zetControle,
  fout,
  tweeKeerHint,
}: {
  veld: MaatVeld;
  beeld?: string;
  waarde: string;
  controle: string;
  zetWaarde: (w: string) => void;
  zetControle: (w: string) => void;
  fout: string | null;
  tweeKeerHint: string;
}) {
  const label = kaalLabel(veld.label);
  const beideIngevuld = veld.controle && waarde !== "" && controle !== "";
  const komtOvereen = beideIngevuld && metingenKomenOvereen(waarde, controle);

  return (
    <section
      className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[130px_1fr] sm:p-5 ${
        fout ? "border-red-300 dark:border-red-800" : "border-black/10 dark:border-white/15"
      }`}
    >
      {beeld ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={beeld}
          alt={`Zo meet je je ${label.toLowerCase()}`}
          className="mx-auto h-40 w-auto rounded-lg object-contain sm:h-56"
        />
      ) : (
        <Lichaam meet={veld.sleutel} titel={`Zo meet je je ${label.toLowerCase()}`} className="mx-auto h-40 sm:h-56" />
      )}
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">
          {label}
          {!veld.verplicht && (
            <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">optioneel</span>
          )}
        </h2>
        <p className="whitespace-pre-line text-sm leading-relaxed text-black/60 dark:text-white/60">
          {veld.instructie}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <Invoer label={veld.controle ? "1e meting" : "Meting"} eenheid="cm" waarde={waarde} zet={zetWaarde} />
          {veld.controle && <Invoer label="2e meting (controle)" eenheid="cm" waarde={controle} zet={zetControle} />}
        </div>
        {fout ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fout}</p>
        ) : beideIngevuld ? (
          <p className={`text-sm ${komtOvereen ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`}>
            {komtOvereen ? "✓ Je metingen komen overeen." : "Je metingen verschillen te veel. Meet nog een keer."}
          </p>
        ) : veld.controle && tweeKeerHint ? (
          <p className="text-xs text-black/40 dark:text-white/40">{tweeKeerHint}</p>
        ) : null}
      </div>
    </section>
  );
}
