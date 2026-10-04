"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import type { NaamVeld } from "@/lib/nieuwsbrief/formulierregels";

export interface NieuwsbriefFormulierProps {
  titel?: string;
  /** De tekst onder de titel (al opgemaakt). */
  tekst?: ReactNode;
  naamVeld: NaamVeld;
  naamLabel: string;
  emailLabel: string;
  knop: string;
  succes: string;
  fout: string;
  /** De toestemmingstekst (al opgemaakt, zodat links naar de privacyverklaring werken). */
  toestemming: ReactNode;
  /** Slug van een aanmeldformulier uit het beheer; leeg = het standaard aanmeldblok. */
  formulier?: string;
  /** Kop als h1 (eigen landingspagina) of h2 (blok op een pagina). */
  kop?: "h1" | "h2";
  /** Voorbeeld in het beheer: verstuurt niets. */
  voorbeeld?: boolean;
}

const veld =
  "rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

/**
 * Aanmeldformulier voor de nieuwsbrief: het standaard aanmeldblok of een
 * formulier uit Beheer → Nieuwsbrief → Formulieren (met eigen teksten, naamveld
 * en toestemming). Verstuurt naar /api/nieuwsbrief/aanmelden.
 */
export function NieuwsbriefFormulier({
  titel,
  tekst,
  naamVeld,
  naamLabel,
  emailLabel,
  knop,
  succes,
  fout: foutTekst,
  toestemming,
  formulier,
  kop = "h2",
  voorbeeld = false,
}: NieuwsbriefFormulierProps) {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (voorbeeld) {
      setGelukt(true);
      return;
    }
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
          ...(formulier ? { formulier } : {}),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { fout?: string };
      if (!res.ok) setFout(data.fout || foutTekst);
      else setGelukt(true);
    } catch {
      setFout(foutTekst);
    } finally {
      setBezig(false);
    }
  }

  const Kop = kop;
  const metNaam = naamVeld !== "verborgen";

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-4 text-center">
      {titel && (
        <Kop className={`${kop === "h1" ? "text-3xl sm:text-4xl" : "text-3xl"} font-semibold tracking-tight`}>{titel}</Kop>
      )}
      {tekst && (
        <div className="flex flex-col gap-2 text-foreground/70 [&_a]:text-accent [&_a]:underline [&_ul]:list-inside [&_ul]:list-disc">
          {tekst}
        </div>
      )}
      {gelukt ? (
        <div role="status" className="flex flex-col gap-2">
          <p className="whitespace-pre-line rounded-2xl bg-accent-zacht px-5 py-4 text-foreground/80">{succes}</p>
          {voorbeeld && (
            <button type="button" onClick={() => setGelukt(false)} className="text-xs text-foreground/50 underline underline-offset-4">
              Voorbeeld: er is niets verstuurd. Terug naar het formulier
            </button>
          )}
        </div>
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
          <div className={metNaam ? "grid gap-3 sm:grid-cols-[1fr_1.4fr]" : "grid gap-3"}>
            {metNaam && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-foreground/70">
                  {naamLabel}
                  {naamVeld === "verplicht" && <span className="text-accent"> *</span>}
                </span>
                <input
                  name="naam"
                  autoComplete="given-name"
                  maxLength={120}
                  required={naamVeld === "verplicht"}
                  className={veld}
                />
              </label>
            )}
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-foreground/70">
                {emailLabel}
                <span className="text-accent"> *</span>
              </span>
              <input name="email" type="email" required autoComplete="email" maxLength={254} className={veld} />
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
            {bezig ? "Bezig…" : knop}
          </button>
          <div className="text-center text-xs text-foreground/50 [&_a]:text-accent [&_a]:underline [&_p]:mt-1">
            {toestemming}
          </div>
        </form>
      )}
    </div>
  );
}
