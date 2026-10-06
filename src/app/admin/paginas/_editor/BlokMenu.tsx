"use client";

import { useRef } from "react";
import type { FormulierKeuze } from "@/lib/paginas/beheer";
import { blokVoorFormulier, PAGINA_BLOKKEN } from "@/lib/paginas/regels";
import { knopKlein, tekstZacht } from "@/components/admin/stijl";

/** Uitklapmenu "Blok invoegen" in de opmaakwerkbalk: vaste blokken en de nieuwsbriefformulieren. */
export function BlokMenu({ formulieren, onKies }: { formulieren: FormulierKeuze[]; onKies: (naam: string) => void }) {
  const blokMenu = useRef<HTMLDetailsElement>(null);

  function kies(naam: string) {
    onKies(naam);
    if (blokMenu.current) blokMenu.current.open = false;
  }

  return (
    <details ref={blokMenu} className="relative">
      <summary className={`${knopKlein} cursor-pointer list-none [&::-webkit-details-marker]:hidden`} onMouseDown={(e) => e.preventDefault()}>
        ＋ Blok invoegen
      </summary>
      <div className="absolute left-0 z-30 mt-1 flex w-72 max-w-[calc(100vw-2rem)] flex-col gap-0.5 rounded-xl border border-black/10 bg-kaart p-1.5 text-sm shadow-lg dark:border-white/15">
        {Object.entries(PAGINA_BLOKKEN).map(([naam, uitleg]) => (
          <button
            key={naam}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => kies(naam)}
            className="flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <code className="text-xs">{`{${naam}}`}</code>
            <span className={`text-xs ${tekstZacht}`}>{uitleg}</span>
          </button>
        ))}
        {formulieren.length > 0 && <p className={`px-2.5 pt-2 text-xs font-medium uppercase tracking-wide ${tekstZacht}`}>Nieuwsbriefformulieren</p>}
        {formulieren.map((f) => (
          <button
            key={f.slug}
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => kies(blokVoorFormulier(f.slug))}
            className="flex flex-col items-start rounded-lg px-2.5 py-1.5 text-left hover:bg-black/5 dark:hover:bg-white/5"
          >
            <code className="break-all text-xs">{`{${blokVoorFormulier(f.slug)}}`}</code>
            <span className={`text-xs ${tekstZacht}`}>{f.naam}</span>
          </button>
        ))}
      </div>
    </details>
  );
}
