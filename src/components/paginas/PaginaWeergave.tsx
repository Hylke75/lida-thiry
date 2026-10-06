import type { ReactNode } from "react";
import { Afbeelding } from "@/components/Afbeelding";
import { Opmaak } from "@/components/Opmaak";
import { KopTekst } from "@/components/site/Basis";
import { InhoudBlok, InhoudProza } from "@/components/site/InhoudProza";
import { H1_INHOUD, INTRO, KOP_ACHTERGROND } from "@/components/site/InhoudKop";
import { CONTAINER } from "@/components/site/stijl";

/** Leeskolom van een pagina (max. ~720 px). */
const LEESKOLOM = `${CONTAINER} max-w-[720px]`;

/** Omslag van een blok binnen de tekst: wat ruimte erboven en eronder, geen tekstopmaak. */
export function BlokRuimte({ children }: { children: ReactNode }) {
  return <InhoudBlok>{children}</InhoudBlok>;
}

/**
 * Een beheerbare pagina zoals bezoekers hem zien: kop (warme band met titel en
 * intro), omslagfoto en de tekst in een leeskolom. De blokken ({contactformulier}, …)
 * geeft de aanroeper mee: echte componenten op de site, gemarkeerde vakken in
 * het voorbeeld in het beheer. Accentwoorden met *sterretjes* in de titel
 * worden cursief koraal, net als op de homepage.
 */
export function PaginaWeergave({
  titel,
  intro,
  inhoud,
  omslagUrl,
  omslagAlt,
  blokken,
  afmetingen,
  kop = "h1",
}: {
  titel: string;
  intro: string;
  inhoud: string;
  omslagUrl: string | null;
  omslagAlt: string;
  blokken: Readonly<Record<string, ReactNode>>;
  /** Afmetingen van de afbeeldingen in de tekst (zie Opmaak); leeg = gewone <img>. */
  afmetingen?: Readonly<Record<string, { breedte: number; hoogte: number }>>;
  /** In het live voorbeeld van de editor is de titel geen h1 van de beheerpagina. */
  kop?: "h1" | "h2";
}) {
  const Kop = kop;
  const omslag = omslagUrl && /^https:\/\//.test(omslagUrl) ? omslagUrl : null;
  return (
    <article className="flex min-w-0 flex-col pb-[68px] tablet:pb-[92px]">
      {/* In het beheer (donkere modus) zonder de warme band, zodat de tekst leesbaar blijft. */}
      <header className={`${KOP_ACHTERGROND} border-b border-line dark:border-white/10 dark:bg-transparent`}>
        <div className={`${LEESKOLOM} flex flex-col gap-5 pt-12 pb-12 tablet:pt-[72px] tablet:pb-14`}>
          <Kop className={H1_INHOUD}>{titel ? <KopTekst tekst={titel} /> : "(nog geen titel)"}</Kop>
          {intro && <p className={`${INTRO} whitespace-pre-line dark:text-foreground/75`}>{intro}</p>}
        </div>
      </header>
      {omslag && (
        <div className={`${CONTAINER} mt-10 max-w-[980px] tablet:mt-14`}>
          <div className="relative aspect-[16/9] w-full overflow-hidden rounded-[8px] border border-beeldrand bg-sand-deep">
            <Afbeelding vullen src={omslag} alt={omslagAlt} prioriteit sizes="(min-width: 1020px) 980px, 100vw" className="object-cover" />
          </div>
        </div>
      )}
      {inhoud.trim() && (
        <div className={`${LEESKOLOM} pt-10 tablet:pt-14`}>
          <InhoudProza>
            <Opmaak tekst={inhoud} blokken={blokken} afmetingen={afmetingen} />
          </InhoudProza>
        </div>
      )}
    </article>
  );
}
