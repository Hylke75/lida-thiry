import type { ReactNode } from "react";
import { Afbeelding } from "@/components/Afbeelding";
import { Opmaak } from "@/components/Opmaak";

// Typografie voor de paginatekst. Bewust met kind-selectors ([&>h2], [&>p_a], …):
// zo krijgen de blokken (formulieren, kaarten, knoppen) die tussen de tekst
// staan géén tekstopmaak opgedrongen.
export const PAGINA_PROZA = [
  "flex min-w-0 flex-col gap-5 text-[1.0625rem] leading-[1.8] text-foreground/85 [overflow-wrap:anywhere]",
  "[&>h2]:mt-8 [&>h2]:font-serif [&>h2]:text-2xl [&>h2]:leading-snug [&>h2]:font-semibold [&>h2]:text-foreground sm:[&>h2]:text-3xl",
  "[&>h3]:mt-4 [&>h3]:text-xl [&>h3]:font-semibold [&>h3]:text-foreground",
  "[&>p_a]:text-accent [&>p_a]:underline [&>p_a]:decoration-accent/40 [&>p_a]:underline-offset-4 [&>p_a:hover]:decoration-accent",
  "[&>ul_a]:text-accent [&>ul_a]:underline [&>ul_a]:underline-offset-4",
  "[&>p_strong]:font-semibold [&>p_strong]:text-foreground [&>ul_strong]:font-semibold [&>ul_strong]:text-foreground",
  "[&>ul]:flex [&>ul]:list-disc [&>ul]:flex-col [&>ul]:gap-2 [&>ul]:pl-6 [&>ul>li]:marker:text-accent",
  "[&>img]:my-3 [&>img]:h-auto [&>img]:w-full [&>img]:rounded-2xl [&>img]:shadow-sm",
].join(" ");

/** Omslag van een blok binnen de tekst: wat ruimte erboven en eronder, geen tekstopmaak. */
export function BlokRuimte({ children }: { children: ReactNode }) {
  return <div className="my-3 min-w-0 text-base leading-normal text-foreground">{children}</div>;
}

/**
 * Een beheerbare pagina zoals bezoekers hem zien: titel, intro, omslagfoto en
 * de tekst. De blokken ({contactformulier}, …) geeft de aanroeper mee: echte
 * componenten op de site, gemarkeerde vakken in het voorbeeld in het beheer.
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
    <article className="flex min-w-0 flex-col">
      <header className="flex flex-col gap-4">
        <Kop className="font-serif text-4xl leading-[1.15] font-semibold tracking-tight text-balance break-words hyphens-auto sm:text-5xl">
          {titel || "(nog geen titel)"}
        </Kop>
        {intro && <p className="text-lg leading-relaxed whitespace-pre-line text-balance text-foreground/70">{intro}</p>}
      </header>
      {omslag && (
        <div className="relative mt-8 aspect-[16/9] w-full overflow-hidden rounded-3xl">
          <Afbeelding vullen src={omslag} alt={omslagAlt} prioriteit sizes="(min-width: 768px) 720px, 100vw" className="object-cover" />
        </div>
      )}
      {inhoud.trim() && (
        <div className={`mt-8 ${PAGINA_PROZA}`}>
          <Opmaak tekst={inhoud} blokken={blokken} afmetingen={afmetingen} />
        </div>
      )}
    </article>
  );
}
