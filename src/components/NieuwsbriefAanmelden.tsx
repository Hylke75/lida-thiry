"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";

export type NieuwsbriefAanmeldTeksten = SectieWaarden<typeof NIEUWSBRIEF_AANMELDEN>;

/**
 * Aanmeldformulier voor de nieuwsbrief. De toestemmingstekst komt als (op de
 * server opgemaakte) inhoud mee, zodat links naar de privacyverklaring werken.
 */
export function NieuwsbriefAanmelden({
  teksten,
  toestemming,
}: {
  teksten: NieuwsbriefAanmeldTeksten;
  toestemming: ReactNode;
}) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    setFout(null);
    setBezig(true);
    try {
      const res = await fetch("/api/nieuwsbrief/aanmelden", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          naam: String(f.get("naam") || ""),
          email: String(f.get("email") || ""),
          website: String(f.get("website") || ""),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) setFout(data.fout || teksten.fout);
      else setGelukt(true);
    } catch {
      setFout(teksten.fout);
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 text-center">
      <h2 className="text-3xl font-semibold tracking-tight">{teksten.titel}</h2>
      <p className="text-foreground/70">{teksten.tekst}</p>
      {gelukt ? (
        <p role="status" className="rounded-2xl bg-accent-zacht px-5 py-4 text-foreground/80">
          {teksten.succes}
        </p>
      ) : (
        <form onSubmit={verstuur} className="mt-2 flex flex-col gap-3 text-left">
          {/* Honeypot tegen spambots: onzichtbaar voor mensen en schermlezers. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
          />
          <div className="grid gap-3 sm:grid-cols-[1fr_1.4fr]">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-foreground/70">{teksten.naam_label}</span>
              <input
                name="naam"
                autoComplete="given-name"
                maxLength={120}
                className="rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-foreground/70">
                {teksten.email_label}
                <span className="text-accent"> *</span>
              </span>
              <input
                name="email"
                type="email"
                required
                autoComplete="email"
                maxLength={254}
                className="rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
              />
            </label>
          </div>
          {fout && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {fout}
            </p>
          )}
          <button
            disabled={bezig}
            className="mx-auto mt-1 rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {bezig ? "Bezig…" : teksten.knop}
          </button>
          <div className="text-center text-xs text-foreground/50 [&_a]:text-accent [&_a]:underline [&_p]:mt-1">
            {toestemming}
          </div>
        </form>
      )}
    </div>
  );
}
