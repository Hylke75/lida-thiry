"use client";

import { useId, useState } from "react";
import { normaliseerTags } from "@/lib/blog/regels";
import { invoerBreed, knopSecundair, tekstZacht } from "@/components/admin/stijl";

/** Tags als losse "chips", met suggesties uit eerdere berichten. */
export function TagInvoer({
  id,
  waarde,
  suggesties,
  onChange,
}: {
  id: string;
  waarde: string[];
  suggesties: string[];
  onChange: (tags: string[]) => void;
}) {
  const [nieuw, setNieuw] = useState("");
  const lijst = useId();
  const voegToe = (tekst: string) => {
    const delen = tekst.split(",").map((t) => t.trim()).filter(Boolean);
    if (delen.length) onChange(normaliseerTags([...waarde, ...delen]));
    setNieuw("");
  };
  const over = suggesties.filter((s) => !waarde.includes(s.toLowerCase()));

  return (
    <div className="flex flex-col gap-2">
      {waarde.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {waarde.map((t) => (
            <li key={t} className="flex items-center gap-1 rounded-full bg-accent-zacht py-0.5 pl-3 pr-1 text-sm text-accent">
              {t}
              <button
                type="button"
                onClick={() => onChange(waarde.filter((x) => x !== t))}
                aria-label={`Tag ${t} verwijderen`}
                className="rounded-full px-1.5 hover:bg-black/10 dark:hover:bg-white/10"
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <input
          id={id}
          value={nieuw}
          list={lijst}
          maxLength={40}
          onChange={(e) => {
            if (e.target.value.includes(",")) voegToe(e.target.value);
            else setNieuw(e.target.value);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              voegToe(nieuw);
            } else if (e.key === "Backspace" && !nieuw && waarde.length) {
              onChange(waarde.slice(0, -1));
            }
          }}
          onBlur={() => nieuw.trim() && voegToe(nieuw)}
          className={invoerBreed}
          placeholder="Typ een tag en druk op Enter"
        />
        <button type="button" onClick={() => voegToe(nieuw)} disabled={!nieuw.trim()} className={knopSecundair}>
          Toevoegen
        </button>
      </div>
      <datalist id={lijst}>
        {over.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
      <p className={`text-xs ${tekstZacht}`}>Maximaal 15 tags, in kleine letters. Bijvoorbeeld: jurken, zandloper, najaar.</p>
    </div>
  );
}
