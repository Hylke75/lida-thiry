"use client";

import { useState } from "react";

export function MijnAdviesFormulier({
  teksten,
}: {
  teksten: { knop: string; knopBezig: string; bevestiging: string; foutVerbinding: string };
}) {
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch("/api/mijn-advies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: String(f.get("email") || ""), website: String(f.get("website") || "") }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setFout(data.fout || teksten.foutVerbinding);
      } else {
        setKlaar(true);
      }
    } catch {
      setFout(teksten.foutVerbinding);
    }
    setBezig(false);
  }

  if (klaar) {
    return (
      <p role="status" className="rounded-lg bg-accent-zacht px-4 py-3 text-sm whitespace-pre-line text-foreground/80">
        {teksten.bevestiging}
      </p>
    );
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-4">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-foreground/70">
          E-mailadres<span className="text-accent"> *</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className="rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
        />
      </label>
      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}
      <button
        disabled={bezig}
        className="rounded-full bg-accent px-6 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? teksten.knopBezig : teksten.knop}
      </button>
    </form>
  );
}
