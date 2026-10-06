import type { ReactNode } from "react";
import { KleurLint, TekstLink } from "@/components/site/Basis";
import { NIEUWSBRIEF_VERLOOP } from "@/components/site/InhoudNieuwsbrief";

/**
 * Pagina-omslag van de nieuwsbriefpagina's: het zachte verloop van het
 * nieuwsbriefpaneel met een witte kaart (kleurlint bovenaan) in het midden.
 */
export function NieuwsbriefKaart({ children, terug = "Naar de startpagina" }: { children: ReactNode; terug?: string }) {
  return (
    <main className={`flex w-full flex-1 flex-col items-center justify-center ${NIEUWSBRIEF_VERLOOP} px-[14px] py-[68px] tablet:px-5 tablet:py-[92px]`}>
      <div className="flex w-full max-w-[640px] flex-col items-center gap-6">
        <div className="w-full overflow-hidden rounded-ontwerp-lg bg-white shadow-ontwerp">
          <KleurLint />
          <div className="px-5 py-10 tablet:px-12 tablet:py-12">{children}</div>
        </div>
        <TekstLink href="/" className="text-[14px]">
          <span aria-hidden="true">←</span> {terug}
        </TekstLink>
      </div>
    </main>
  );
}

/** Eenvoudige, gecentreerde pagina voor bevestigen en afmelden. */
export function Kader({ titel, tekst, children }: { titel: string; tekst?: string; children?: ReactNode }) {
  return (
    <NieuwsbriefKaart>
      <div className="flex flex-col items-center gap-5 text-center">
        <h1 className="m-0 font-serif text-[38px] leading-[1.06] font-normal tracking-[-0.02em] text-balance tablet:text-[48px]">
          {titel}
        </h1>
        {tekst && <p className="m-0 max-w-[480px] text-[17px] whitespace-pre-line text-ink-soft">{tekst}</p>}
        {children}
      </div>
    </NieuwsbriefKaart>
  );
}
