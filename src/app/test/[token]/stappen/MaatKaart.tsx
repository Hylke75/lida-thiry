import type { MaatVeld } from "@/lib/test-config";
import { Lichaam } from "@/components/Lichaam";
import { kaalLabel, metingenKomenOvereen } from "../wizard-regels";
import { Invoer } from "./Invoer";
import { HULPTEKST, VELDFOUT } from "@/components/site/FormulierStijl";
import { H3 } from "@/components/site/stijl";
import { vulIn } from "@/lib/inhoud/schema";
import type { TestTeksten } from "@/lib/inhoud/groepen/test";

/** Eén maat: meetbeeld, instructie, meting (en controlemeting) en terugkoppeling. */
export function MaatKaart({
  veld,
  beeld,
  waarde,
  controle,
  zetWaarde,
  zetControle,
  fout,
  teksten,
}: {
  veld: MaatVeld;
  beeld?: string;
  waarde: string;
  controle: string;
  zetWaarde: (w: string) => void;
  zetControle: (w: string) => void;
  fout: string | null;
  teksten: TestTeksten["meten"];
}) {
  const label = kaalLabel(veld.label);
  const tweeKeerHint = teksten.twee_keer;
  const beeldAlt = vulIn(teksten.beeld_alt, { maat: label.toLowerCase() });
  const beideIngevuld = veld.controle && waarde !== "" && controle !== "";
  const komtOvereen = beideIngevuld && metingenKomenOvereen(waarde, controle);

  return (
    <section
      className={`grid gap-5 rounded-ontwerp-md border bg-white p-5 tablet:grid-cols-[150px_1fr] tablet:gap-7 tablet:p-[30px] ${
        fout ? "border-[#b42318]" : "border-line"
      }`}
    >
      {/* Meetbeeld: eigen foto (Beheer → Meetinstructies) of de getekende figuur met meetlint. */}
      <div className="mx-auto flex w-full max-w-[220px] items-center justify-center self-start rounded-[46%_54%_46%_54%/52%_42%_58%_48%] bg-cream px-4 py-5 [--lichaam-vulling:var(--white)] tablet:max-w-none">
        {beeld ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={beeld}
            alt={beeldAlt}
            className="h-40 w-auto rounded-ontwerp-sm object-contain tablet:h-56"
          />
        ) : (
          <Lichaam meet={veld.sleutel} titel={beeldAlt} className="h-40 tablet:h-56" />
        )}
      </div>
      <div className="flex flex-col gap-3">
        <h2 className={`${H3} m-0 text-[27px]`}>
          {label}
          {!veld.verplicht && (
            <span className="ml-2 align-middle font-sans text-[12px] font-extrabold tracking-[0.1em] text-ink-soft uppercase">{teksten.optioneel}</span>
          )}
        </h2>
        <p className="m-0 whitespace-pre-line text-[15px] text-ink-soft">
          {veld.instructie}
        </p>
        <div className="grid grid-cols-1 gap-4 min-[420px]:grid-cols-2">
          <Invoer label={veld.controle ? teksten.eerste_meting : teksten.meting_label} eenheid="cm" waarde={waarde} zet={zetWaarde} />
          {veld.controle && <Invoer label={teksten.tweede_meting} eenheid="cm" waarde={controle} zet={zetControle} />}
        </div>
        {fout ? (
          <p className={`${VELDFOUT} m-0`}>{fout}</p>
        ) : beideIngevuld ? (
          <p className={`m-0 text-[14px] font-bold ${komtOvereen ? "text-[#3f6b35]" : "text-[#8a5a00]"}`}>
            {komtOvereen ? teksten.overeen : teksten.verschil}
          </p>
        ) : veld.controle && tweeKeerHint ? (
          <p className={`${HULPTEKST} m-0`}>{tweeKeerHint}</p>
        ) : null}
      </div>
    </section>
  );
}
