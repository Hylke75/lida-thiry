"use client";

import type { RefObject } from "react";
import type { Bewerking } from "@/lib/blog/ai-prompt";
import { woorden } from "@/lib/blog/regels";
import { Draaier, Meldingen } from "@/components/admin/editor/onderdelen";
import { kaart, knop, knopKlein, knopSecundair, tekstFout, tekstSucces, tekstZacht } from "@/components/admin/stijl";
import type { AiHulp } from "./useAiHulp";
import { BEWERKING_LABEL } from "./velden";

/** Boven het tekstvak: de AI is bezig, er ging iets mis, of een voorstel om te vergelijken en over te nemen. */
export function AiVoorstelPaneel({ ai, paneel }: { ai: AiHulp; paneel: RefObject<HTMLDivElement | null> }) {
  const { aiBezig, aiFout, aiTekst } = ai;
  if (!(aiBezig || aiFout || aiTekst)) return null;
  return (
    <div ref={paneel} className="scroll-mt-20">
      {aiBezig && (
        <p role="status" className="flex items-center gap-2 rounded-lg bg-violet-50 px-4 py-3 text-sm text-violet-900 dark:bg-violet-950/40 dark:text-violet-200">
          <Draaier /> De AI is bezig: {aiBezig}… Dit kan een halve tot anderhalve minuut duren. Je kunt intussen gewoon verder werken.
        </p>
      )}
      {aiFout && <Meldingen soort="fout" tekst={[aiFout]} />}
      {aiTekst && (
        <div className={`${kaart} border-violet-300 dark:border-violet-700`}>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">
              Voorstel van de AI: {BEWERKING_LABEL[aiTekst.bewerking].toLowerCase()} {aiTekst.geheel ? "(hele tekst)" : "(selectie)"}
            </h2>
            <div className="flex gap-2">
              <button type="button" onClick={() => ai.setAiTekst(null)} className={knopSecundair}>
                Annuleren
              </button>
              <button type="button" onClick={ai.aiOvernemen} className={knop}>
                Overnemen
              </button>
            </div>
          </div>
          <p className={`text-xs ${tekstZacht}`}>
            Lees het voorstel kritisch. Er verandert pas iets aan je tekst als je op Overnemen klikt (en daarna opslaat).
          </p>
          <div className="grid min-w-0 gap-3 md:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`text-xs font-medium uppercase tracking-wide ${tekstFout}`}>Nu ({woorden(aiTekst.voor)} woorden)</span>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-red-50 p-3 font-sans text-sm leading-relaxed text-red-950 dark:bg-red-950/30 dark:text-red-100">
                {aiTekst.voor}
              </pre>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <span className={`text-xs font-medium uppercase tracking-wide ${tekstSucces}`}>Voorstel ({woorden(aiTekst.na)} woorden)</span>
              <pre className="max-h-96 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-emerald-50 p-3 font-sans text-sm leading-relaxed text-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-100">
                {aiTekst.na}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/** Werkbalk met de AI-bewerkingen (verbeteren, korter, …). */
export function AiWerkbalk({ ai }: { ai: AiHulp }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5" role="toolbar" aria-label="AI-hulp">
      <span className={`text-xs ${tekstZacht}`}>✨ AI:</span>
      {(Object.keys(BEWERKING_LABEL) as Bewerking[]).map((b) => (
        <button
          key={b}
          type="button"
          disabled={Boolean(ai.aiBezig)}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => void ai.aiHerschrijf(b)}
          className={`${knopKlein} border-violet-300 text-violet-900 dark:border-violet-700 dark:text-violet-200`}
        >
          {BEWERKING_LABEL[b]}
        </button>
      ))}
      <span className={`text-xs ${tekstZacht}`}>— werkt op de geselecteerde tekst, of op alles als er niets geselecteerd is.</span>
    </div>
  );
}

/** Uitleg als de AI-schrijfhulp uit staat. */
export function AiUit() {
  return (
    <p className={`rounded-lg bg-black/[0.03] px-4 py-3 text-xs dark:bg-white/5 ${tekstZacht}`}>
      ✨ De AI-schrijfhulp staat uit. Je webbouwer kan hem aanzetten door in Vercel de omgevingsvariabele <code>ANTHROPIC_API_KEY</code> in te
      stellen (een sleutel van console.anthropic.com) en de site opnieuw te publiceren.
    </p>
  );
}
