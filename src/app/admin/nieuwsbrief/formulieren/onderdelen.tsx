"use client";

import { useState } from "react";
import { knopKlein } from "../_editor/stijl";

/** Toont een stukje tekst (zoals een blokcode of link) met een kopieerknop. */
export function Kopieer({ tekst, label = "Kopieer" }: { tekst: string; label?: string }) {
  const [gekopieerd, setGekopieerd] = useState(false);

  async function kopieer() {
    try {
      await navigator.clipboard.writeText(tekst);
      setGekopieerd(true);
      window.setTimeout(() => setGekopieerd(false), 2000);
    } catch {
      window.prompt("Kopieer deze tekst:", tekst);
    }
  }

  return (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <code className="min-w-0 truncate rounded bg-black/5 px-1.5 py-0.5 text-xs dark:bg-white/10">{tekst}</code>
      <button type="button" onClick={kopieer} className={knopKlein}>
        <span aria-live="polite">{gekopieerd ? "Gekopieerd ✓" : label}</span>
      </button>
    </span>
  );
}

/** Verzendknop die eerst om bevestiging vraagt. */
export function BevestigVerzend({
  bevestiging,
  className,
  children,
}: {
  bevestiging: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      className={className}
      onClick={(e) => {
        if (!window.confirm(bevestiging)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
