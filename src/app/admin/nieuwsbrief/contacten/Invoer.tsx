"use client";

import { useId, useState, type ComponentProps, type KeyboardEvent } from "react";
import { ontleedTags } from "@/lib/nieuwsbrief/contactregels";

/**
 * Tags invoeren als losse labels, met suggesties uit de bestaande tags. Het
 * formulier krijgt één veld `name` met de tags gescheiden door komma's.
 */
export function TagInvoer({
  name,
  begin = [],
  suggesties,
  placeholder = "Tag toevoegen…",
}: {
  name: string;
  begin?: string[];
  suggesties: string[];
  placeholder?: string;
}) {
  const lijstId = useId();
  const [tags, setTags] = useState<string[]>(begin);
  const [tekst, setTekst] = useState("");

  const voegToe = (invoer: string) => {
    const nieuw = ontleedTags(invoer);
    if (nieuw.length) setTags((t) => [...new Set([...t, ...nieuw])]);
    setTekst("");
  };
  const toets = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      voegToe(tekst);
    } else if (e.key === "Backspace" && !tekst && tags.length) {
      setTags((t) => t.slice(0, -1));
    }
  };
  const beschikbaar = suggesties.filter((s) => !tags.includes(s));

  return (
    <div className="flex min-h-10 flex-wrap items-center gap-1.5 rounded-lg border border-black/15 bg-kaart px-2 py-1.5 focus-within:border-accent dark:border-white/20">
      <input type="hidden" name={name} value={[...tags, tekst].filter((t) => t.trim()).join(",")} />
      {tags.map((t) => (
        <span key={t} className="flex items-center gap-1 rounded-full bg-accent-zacht px-2.5 py-0.5 text-xs text-accent">
          {t}
          <button
            type="button"
            aria-label={`Tag ${t} verwijderen`}
            onClick={() => setTags((x) => x.filter((y) => y !== t))}
            className="text-accent/70 hover:text-accent"
          >
            ×
          </button>
        </span>
      ))}
      <input
        list={lijstId}
        value={tekst}
        onChange={(e) => {
          const v = e.target.value;
          // Een gekozen suggestie meteen als tag toevoegen.
          if (beschikbaar.includes(v)) voegToe(v);
          else setTekst(v);
        }}
        onKeyDown={toets}
        onBlur={() => tekst.trim() && voegToe(tekst)}
        placeholder={tags.length ? "" : placeholder}
        aria-label="Tag toevoegen"
        className="min-w-24 flex-1 bg-transparent px-1 py-0.5 text-sm outline-none"
      />
      <datalist id={lijstId}>
        {beschikbaar.map((s) => (
          <option key={s} value={s} />
        ))}
      </datalist>
    </div>
  );
}

/** Verzendknop die eerst om bevestiging vraagt (bijv. bij verwijderen). */
export function BevestigKnop({ bevestiging, onClick, ...rest }: ComponentProps<"button"> & { bevestiging: string }) {
  return (
    <button
      {...rest}
      onClick={(e) => {
        if (!window.confirm(bevestiging)) e.preventDefault();
        else onClick?.(e);
      }}
    />
  );
}

/** Vinkje dat alle vinkjes `name="id"` in hetzelfde formulier aan- of uitzet. */
export function SelecteerAlles() {
  return (
    <input
      type="checkbox"
      aria-label="Alles op deze pagina selecteren"
      className="accent-accent"
      onChange={(e) => {
        const form = e.currentTarget.form;
        if (!form) return;
        for (const el of Array.from(form.querySelectorAll<HTMLInputElement>('input[type="checkbox"][name="id"]'))) {
          el.checked = e.currentTarget.checked;
        }
      }}
    />
  );
}
