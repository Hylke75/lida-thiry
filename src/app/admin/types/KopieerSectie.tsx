"use client";

import { useState, useTransition } from "react";
import type { LetterKeuze } from "@/lib/adviestypes-beheer";
import { kopieerSectie } from "./acties";
import type { Uitkomst } from "./uitkomst";
import { knop, knopKlein } from "@/components/admin/stijl";

export interface TypeKeuze {
  sleutel: string;
  titel: string;
  letter: string;
  categorie: number;
}

/**
 * Neemt een veld (tekst en beelden) over in hetzelfde veld van
 * de gekozen andere types.
 */
export function KopieerSectie({
  sleutel,
  sectieId,
  kop,
  categorie,
  types,
  letters,
}: {
  sleutel: string;
  sectieId: string;
  kop: string;
  categorie: number;
  /** Alle types behalve het huidige. */
  types: TypeKeuze[];
  /** De lichaamstypes (code + naam). */
  letters: LetterKeuze[];
}) {
  const [gekozen, setGekozen] = useState<Set<string>>(new Set());
  const [uitkomst, setUitkomst] = useState<Uitkomst | null>(null);
  const [bezig, start] = useTransition();

  function wissel(sleutels: string[]) {
    setGekozen((oud) => {
      const nieuw = new Set(oud);
      const allemaal = sleutels.every((s) => oud.has(s));
      for (const s of sleutels) {
        if (allemaal) nieuw.delete(s);
        else nieuw.add(s);
      }
      return nieuw;
    });
  }

  function kopieer() {
    const doelen = types.filter((t) => gekozen.has(t.sleutel)).map((t) => t.sleutel);
    if (doelen.length === 0) return;
    const lijst = doelen.length <= 12 ? `: ${doelen.join(", ")}` : "";
    if (
      !window.confirm(
        `'${kop}' (tekst en beelden) overnemen in ${doelen.length} ${
          doelen.length === 1 ? "type" : "types"
        }${lijst}?\n\nWat daar nu in '${kop}' staat, wordt vervangen. Doorgaan?`,
      )
    ) {
      return;
    }
    start(async () => {
      const u = await kopieerSectie(sleutel, sectieId, doelen);
      setUitkomst(u);
      if (u.ok) setGekozen(new Set());
    });
  }

  return (
    <details className="group rounded-xl border border-black/10 dark:border-white/15">
      <summary className="cursor-pointer select-none px-4 py-2.5 text-sm text-black/70 dark:text-white/70">
        Dit veld overnemen in andere types…
      </summary>
      <div className="flex flex-col gap-3 border-t border-black/10 p-4 dark:border-white/15">
        <p className="text-sm text-foreground/70">
          Kies de types die voor dit veld dezelfde tekst en beelden moeten krijgen. Wat daar nu in dit veld staat,{" "}
          <strong>wordt vervangen</strong>; je kunt het daarna per type nog aanpassen.
        </p>
        <div className="flex flex-wrap gap-2">
          {letters.map((l) => (
            <button
              key={l.letter}
              type="button"
              className={knopKlein}
              onClick={() => wissel(types.filter((t) => t.letter === l.letter).map((t) => t.sleutel))}
            >
              Alle {l.letter} ({l.naam})
            </button>
          ))}
          <button
            type="button"
            className={knopKlein}
            onClick={() => wissel(types.filter((t) => t.categorie === categorie).map((t) => t.sleutel))}
          >
            Alle in categorie {categorie}
          </button>
          <button type="button" className={knopKlein} onClick={() => setGekozen(new Set())}>
            Niets kiezen
          </button>
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-5">
          {letters.map((l) => (
            <fieldset key={l.letter} className="flex flex-col gap-0.5">
              <legend className="mb-1 text-xs font-medium text-foreground/70">
                {l.letter} · {l.naam}
              </legend>
              {types
                .filter((t) => t.letter === l.letter)
                .map((t) => (
                  <label key={t.sleutel} className="flex items-center gap-2 text-sm" title={t.titel}>
                    <input
                      type="checkbox"
                      checked={gekozen.has(t.sleutel)}
                      onChange={() => wissel([t.sleutel])}
                      className="accent-[var(--accent)]"
                    />
                    {t.sleutel}
                  </label>
                ))}
            </fieldset>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={bezig || gekozen.size === 0}
            onClick={kopieer}
            className={knop}
          >
            {bezig
              ? "Bezig met kopiëren…"
              : gekozen.size === 0
                ? "Kies eerst types"
                : `Kopiëren naar ${gekozen.size} ${gekozen.size === 1 ? "type" : "types"}`}
          </button>
          {uitkomst && (
            <p
              role={uitkomst.ok ? "status" : "alert"}
              className={`text-sm ${uitkomst.ok ? "text-emerald-700 dark:text-emerald-300" : "text-red-700 dark:text-red-300"}`}
            >
              {uitkomst.ok ? "✓ " : ""}
              {uitkomst.melding}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
