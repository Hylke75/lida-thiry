import Image from "next/image";
import type { Dispatch, ReactNode, SetStateAction } from "react";
import type { TestTeksten } from "@/lib/inhoud/groepen/test";
import { HULPTEKST, keuzeTegel } from "@/components/site/FormulierStijl";
import { KLANT_INTRO } from "@/components/site/KlantPagina";
import { schouderbreedteFout, type Antwoorden } from "../wizard-regels";
import { Invoer } from "./Invoer";
// Lida's eigen illustratie (LidaThiry.nl), uit haar antwoorden van 26-10-2026.
import handentest from "./handentest-bovenlichaam.jpg";

type Veld = "breedstePunt" | "bovenlichaam";

/** Eén vraag met keuzeknoppen (onder elkaar: de antwoorden zijn zinnen). */
function Keuzevraag({
  naam,
  vraag,
  opties,
  waarde,
  zet,
  fout,
  children,
}: {
  naam: string;
  vraag: string;
  opties: { waarde: string; label: string }[];
  waarde: string;
  zet: (w: string) => void;
  fout: boolean;
  children?: ReactNode;
}) {
  return (
    <fieldset className="min-w-0 rounded-ontwerp-md border border-line bg-white p-5 tablet:p-6">
      <legend className="float-left mb-4 w-full whitespace-pre-line text-[17px] font-bold text-ink">{vraag}</legend>
      <div className="clear-left flex flex-col gap-4">
        {children}
        <div className="flex flex-col gap-2.5">
          {opties.map((o) => {
            const gekozen = waarde === o.waarde;
            return (
              <label
                key={o.waarde}
                className={`flex min-h-11 items-center rounded-ontwerp-sm px-4 py-2.5 text-[15px] font-semibold ${keuzeTegel(gekozen)}`}
              >
                <input
                  type="radio"
                  name={naam}
                  value={o.waarde}
                  checked={gekozen}
                  onChange={() => zet(o.waarde)}
                  className="sr-only"
                />
                {o.label}
              </label>
            );
          })}
        </div>
        {fout && !waarde && <p className="m-0 text-[14px] font-bold text-[#b42318]">Kies een antwoord.</p>}
      </div>
    </fieldset>
  );
}

/**
 * Stap "Je proporties" (alleen bij Lida's rekenmethode): de schouderbreedte, het
 * breedste punt in de spiegel en de handentest voor de lengte van het bovenlichaam.
 */
export function StapProporties({
  a,
  setA,
  toonFouten,
  teksten: t,
}: {
  a: Antwoorden;
  setA: Dispatch<SetStateAction<Antwoorden>>;
  toonFouten: boolean;
  teksten: TestTeksten["proporties"];
}) {
  const zet = (veld: Veld) => (w: string) => setA((s) => ({ ...s, [veld]: w }));
  return (
    <div className="flex flex-col gap-5">
      {t.intro && <p className={`${KLANT_INTRO} m-0 whitespace-pre-line text-[17px]`}>{t.intro}</p>}

      <div className="flex flex-col gap-3 rounded-ontwerp-md border border-line bg-white p-5 tablet:p-6">
        <p className={`${HULPTEKST} m-0 whitespace-pre-line`}>{t.schouderbreedte_instructie}</p>
        <Invoer
          label={t.schouderbreedte_label}
          eenheid="cm"
          voorbeeld={t.schouderbreedte_voorbeeld}
          waarde={a.schouderbreedte}
          zet={(w) => setA((s) => ({ ...s, schouderbreedte: w }))}
          fout={toonFouten ? schouderbreedteFout(a) : null}
        />
      </div>

      <Keuzevraag
        naam="breedste_punt"
        vraag={t.breedste_vraag}
        opties={[
          { waarde: "schouders", label: t.breedste_schouders },
          { waarde: "gelijk", label: t.breedste_gelijk },
          { waarde: "heupen", label: t.breedste_heupen },
        ]}
        waarde={a.breedstePunt}
        zet={zet("breedstePunt")}
        fout={toonFouten}
      />

      <Keuzevraag
        naam="bovenlichaam"
        vraag={t.bovenlichaam_vraag}
        opties={[
          { waarde: "kort", label: t.bovenlichaam_kort },
          { waarde: "gemiddeld", label: t.bovenlichaam_gemiddeld },
          { waarde: "lang", label: t.bovenlichaam_lang },
        ]}
        waarde={a.bovenlichaam}
        zet={zet("bovenlichaam")}
        fout={toonFouten}
      >
        <Image
          src={handentest}
          alt={t.afbeelding_alt}
          sizes="(min-width: 768px) 640px, 100vw"
          className="h-auto w-full rounded-ontwerp-sm border border-beeldrand"
        />
      </Keuzevraag>
    </div>
  );
}
