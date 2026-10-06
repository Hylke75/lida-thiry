"use client";

import { meet } from "@/lib/analytics/meet";
import { GEBEURTENISSEN } from "@/lib/analytics/regels";
import { useState, type FormEvent, type ReactNode } from "react";
import type { NaamVeld } from "@/lib/nieuwsbrief/formulierregels";
import { knopKlassen, Pijl } from "@/components/site/Basis";
import { KLEINE_LETTERS, LABEL, MELDING_FOUT, MELDING_GOED, VERPLICHT, veldKlassen } from "@/components/site/InhoudFormulier";

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
  /** "paneel": tekst en formulier naast elkaar met pil-velden (homepage); standaard: gecentreerd blok. */
  weergave?: "standaard" | "paneel";
  /** Klein label boven de titel (alleen bij "paneel"). */
  bovenschrift?: string;
}


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
  weergave = "standaard",
  bovenschrift,
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
      else {
        setGelukt(true);
        meet(GEBEURTENISSEN.nieuwsbriefAanmelding);
      }
    } catch {
      setFout(foutTekst);
    } finally {
      setBezig(false);
    }
  }

  const Kop = kop;
  const metNaam = naamVeld !== "verborgen";

  // Honeypot tegen spambots: onzichtbaar voor mensen en schermlezers.
  const honeypot = (
    <input
      type="text"
      name="website"
      tabIndex={-1}
      autoComplete="off"
      aria-hidden="true"
      className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
    />
  );

  if (weergave === "paneel") {
    // Nieuwsbriefpaneel van de homepage (docs/ontwerp: .newsletter-inner): tekst
    // links, formulier rechts; pil-velden met (verborgen) labels.
    const pil =
      "min-h-[54px] w-full min-w-0 rounded-full border border-[rgba(47,36,65,.2)] bg-white px-5 text-ink outline-none placeholder:text-ink-soft focus:border-berry focus:shadow-[0_0_0_3px_rgba(111,45,89,.1)] focus-visible:outline-none";
    return (
      <div className="grid items-center gap-[44px] desktop:grid-cols-2">
        <div>
          {bovenschrift && (
            <p className="mt-0 mb-[14px] text-[12px] font-extrabold tracking-[0.13em] text-berry uppercase">{bovenschrift}</p>
          )}
          {titel && (
            <Kop className="mt-0 mb-[10px] font-serif text-[39px] leading-[1.02] font-normal tracking-[-0.02em] tablet:text-[clamp(38px,4.4vw,58px)]">
              {titel}
            </Kop>
          )}
          {tekst && <div className="text-[17px] text-ink-soft tablet:text-[18px] [&_a]:text-berry [&_a]:underline [&_p]:m-0">{tekst}</div>}
        </div>
        {gelukt ? (
          <div role="status">
            <p className="m-0 rounded-ontwerp-sm bg-white px-5 py-4 whitespace-pre-line">{succes}</p>
          </div>
        ) : (
          <form onSubmit={verstuur} className="relative flex flex-col gap-3">
            {honeypot}
            <div className="flex flex-col gap-[10px] tablet:flex-row">
              {metNaam && (
                <label className="tablet:w-[38%] tablet:shrink-0">
                  <span className="sr-only">{naamLabel}</span>
                  <input
                    name="naam"
                    autoComplete="given-name"
                    maxLength={120}
                    required={naamVeld === "verplicht"}
                    placeholder={naamLabel}
                    className={pil}
                  />
                </label>
              )}
              <label className="flex-1">
                <span className="sr-only">{emailLabel}</span>
                <input
                  name="email"
                  type="email"
                  required
                  autoComplete="email"
                  maxLength={254}
                  placeholder="jouw@email.nl"
                  className={pil}
                />
              </label>
              <button
                disabled={bezig}
                className="inline-flex min-h-[52px] w-full shrink-0 cursor-pointer items-center justify-center gap-[10px] self-center rounded-full border border-berry bg-berry px-[22px] text-[14px] font-bold text-white transition-[transform,box-shadow] duration-[180ms] hover:border-ink hover:bg-ink focus-visible:outline-2 focus-visible:outline-offset-[3px] focus-visible:outline-berry disabled:opacity-60 tablet:w-auto"
              >
                {bezig ? "Bezig…" : knop}
                {!bezig && <span aria-hidden="true">→</span>}
              </button>
            </div>
            {fout && (
              <p role="alert" className="m-0 rounded-ontwerp-sm bg-white px-4 py-3 text-sm text-red-800">
                {fout}
              </p>
            )}
            <div className="text-[15px] leading-[1.55] text-ink-soft [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_p]:m-0">{toestemming}</div>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-3 text-center">
      {titel && (
        <Kop
          className={`mt-0 mb-0 font-serif font-normal tracking-[-0.02em] text-balance ${
            kop === "h1"
              ? "text-[40px] leading-[1.04] tablet:text-[clamp(40px,4.6vw,56px)]"
              : "text-[32px] leading-[1.08] tablet:text-[40px]"
          }`}
        >
          {titel}
        </Kop>
      )}
      {tekst && (
        <div className="flex flex-col gap-2 text-[17px] text-ink-soft dark:text-foreground/75 [&_a]:font-bold [&_a]:text-berry [&_a]:underline [&_a]:underline-offset-[5px] dark:[&_a]:text-accent [&_p]:m-0 [&_ul]:list-inside [&_ul]:list-disc">
          {tekst}
        </div>
      )}
      {gelukt ? (
        <div role="status" className="mt-2 flex flex-col gap-2">
          <p className={`${MELDING_GOED} whitespace-pre-line`}>{succes}</p>
          {voorbeeld && (
            <button type="button" onClick={() => setGelukt(false)} className="text-sm text-ink-soft underline underline-offset-4 dark:text-foreground/75">
              Voorbeeld: er is niets verstuurd. Terug naar het formulier
            </button>
          )}
        </div>
      ) : (
        <form onSubmit={verstuur} className="mt-3 flex flex-col gap-4 text-left">
          {honeypot}
          <div className={metNaam ? "grid gap-4 tablet:grid-cols-[1fr_1.4fr]" : "grid gap-4"}>
            {metNaam && (
              <label className="flex flex-col gap-2">
                <span className={LABEL}>
                  {naamLabel}
                  {naamVeld === "verplicht" && <span className={VERPLICHT}> *</span>}
                </span>
                <input
                  name="naam"
                  autoComplete="given-name"
                  maxLength={120}
                  required={naamVeld === "verplicht"}
                  className={veldKlassen()}
                />
              </label>
            )}
            <label className="flex flex-col gap-2">
              <span className={LABEL}>
                {emailLabel}
                <span className={VERPLICHT}> *</span>
              </span>
              <input name="email" type="email" required autoComplete="email" maxLength={254} className={veldKlassen()} />
            </label>
          </div>
          {fout && (
            <p role="alert" className={MELDING_FOUT}>
              {fout}
            </p>
          )}
          <button disabled={bezig} className={`${knopKlassen()} mx-auto mt-1 w-full cursor-pointer tablet:w-auto`}>
            {bezig ? "Bezig…" : knop}
            {!bezig && <Pijl />}
          </button>
          <div className={`${KLEINE_LETTERS} text-center [&_p]:mt-1`}>{toestemming}</div>
        </form>
      )}
    </div>
  );
}
