import type { MaatVeld } from "@/lib/test-config";
import { Lichaam } from "@/components/Lichaam";
import { kaalLabel, metingenKomenOvereen } from "../wizard-regels";
import { Invoer } from "./Invoer";
import { HULPTEKST, VELDFOUT } from "@/components/site/FormulierStijl";
import { H3 } from "@/components/site/stijl";

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
      className={`grid gap-5 rounded-ontwerp-md border bg-white p-5 tablet:grid-cols-[150px_1fr] tablet:gap-7 tablet:p-[30px] ${
        fout ? "border-[#b42318]" : "border-line"
      }`}
    >
      {beeld ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={beeld}
          alt={`Zo meet je je ${label.toLowerCase()}`}
          className="mx-auto h-40 w-auto rounded-ontwerp-sm object-contain tablet:h-56"
        />
      ) : (
        <Lichaam meet={veld.sleutel} titel={`Zo meet je je ${label.toLowerCase()}`} className="mx-auto h-40 tablet:h-56" />
      )}
      <div className="flex flex-col gap-3">
        <h2 className={`${H3} m-0 text-[27px]`}>
          {label}
          {!veld.verplicht && (
            <span className="ml-2 align-middle font-sans text-[12px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">optioneel</span>
          )}
        </h2>
        <p className="m-0 whitespace-pre-line text-[15px] text-ink-soft">
          {veld.instructie}
        </p>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <Invoer label={veld.controle ? "1e meting" : "Meting"} eenheid="cm" waarde={waarde} zet={zetWaarde} />
          {veld.controle && <Invoer label="2e meting (controle)" eenheid="cm" waarde={controle} zet={zetControle} />}
        </div>
        {fout ? (
          <p className={`${VELDFOUT} m-0`}>{fout}</p>
        ) : beideIngevuld ? (
          <p className={`m-0 text-[14px] font-bold ${komtOvereen ? "text-[#3f6b35]" : "text-[#8a5a00]"}`}>
            {komtOvereen ? "✓ Je metingen komen overeen." : "Je metingen verschillen te veel. Meet nog een keer."}
          </p>
        ) : veld.controle && tweeKeerHint ? (
          <p className={`${HULPTEKST} m-0`}>{tweeKeerHint}</p>
        ) : null}
      </div>
    </section>
  );
}
