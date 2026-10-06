import type { ReactNode } from "react";
import { Bovenschrift, KleurLint, KopTekst } from "./Basis";
import { CONTAINER } from "./stijl";

/**
 * h1 van een inhoudspagina (blog, pagina's, juridisch, 404): iets kleiner dan de
 * hero van de homepage. 42 px op de telefoon, daarboven clamp(44px, 5.4vw, 68px).
 */
export const H1_INHOUD =
  "mt-0 mb-0 font-serif text-[42px] leading-[1.04] font-normal tracking-[-0.022em] text-balance break-words hyphens-auto tablet:text-[clamp(44px,5.4vw,68px)]";

/** De intro onder de h1 (handboek: 18–19 px, zachte inkt). */
export const INTRO = "mt-0 mb-0 max-w-[690px] text-[18px] leading-[1.6] text-ink-soft tablet:text-[19px]";

/** De warme achtergrond van de hero, voor de kop van inhoudspagina's. */
export const KOP_ACHTERGROND = "bg-[linear-gradient(108deg,#fff7ef_0%,#fffaf5_48%,#fdf2eb_100%)]";

/**
 * Kop van een inhoudspagina: warme band met (bovenschrift,) h1 en intro, met het
 * kleurlint eronder (zoals onder de hero). `boven` staat boven het bovenschrift
 * (bijv. een kruimelpad), `onder` onder de intro (bijv. knoppen of metadata).
 * Accentwoorden met *sterretjes* in de titel worden cursief koraal.
 */
export function InhoudKop({
  titel,
  bovenschrift,
  intro,
  boven,
  onder,
  midden = false,
  smal = false,
  lint = true,
  id,
}: {
  titel: string;
  bovenschrift?: ReactNode;
  intro?: ReactNode;
  boven?: ReactNode;
  onder?: ReactNode;
  /** Gecentreerd (blogoverzicht, 404). */
  midden?: boolean;
  /** Smalle kolom (max. 860 px), gelijk aan de leeskolom eronder. */
  smal?: boolean;
  /** Kleurlint onder de kop. */
  lint?: boolean;
  id?: string;
}) {
  return (
    <header className={KOP_ACHTERGROND}>
      <div
        className={`${CONTAINER} flex flex-col gap-5 pt-12 pb-12 tablet:pt-[72px] tablet:pb-16 ${
          midden ? "items-center text-center" : "items-start"
        } ${smal ? "max-w-[860px]" : ""}`}
      >
        {boven}
        <div className={`flex flex-col gap-5 ${midden ? "items-center" : ""}`}>
          <div>
            {bovenschrift && <Bovenschrift>{bovenschrift}</Bovenschrift>}
            <h1 id={id} className={H1_INHOUD}>
              <KopTekst tekst={titel} />
            </h1>
          </div>
          {intro && <div className={`${INTRO} whitespace-pre-line ${midden ? "mx-auto" : ""}`}>{intro}</div>}
        </div>
        {onder}
      </div>
      {lint && <KleurLint />}
    </header>
  );
}
