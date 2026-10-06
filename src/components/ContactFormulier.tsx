"use client";

import { meet } from "@/lib/analytics/meet";
import { GEBEURTENISSEN } from "@/lib/analytics/regels";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { CONTACT_FORMULIER } from "@/lib/inhoud/groepen/contact";
import { MAX, valideerContact, type ContactVeld } from "@/lib/contact/regels";
import { knopKlassen, Pijl } from "@/components/site/Basis";
import {
  KLEINE_LETTERS,
  LABEL,
  MELDING_FOUT,
  MELDING_GOED,
  tekstvakKlassen,
  VELD_FOUT,
  VERPLICHT,
  veldKlassen,
} from "@/components/site/InhoudFormulier";

export type ContactFormulierTeksten = SectieWaarden<typeof CONTACT_FORMULIER>;

const VELD_VOLGORDE: readonly ContactVeld[] = ["naam", "email", "telefoon", "onderwerp", "bericht"];

/**
 * Het contactformulier. De privacyzin komt als (op de server opgemaakte)
 * inhoud mee, zodat de link naar de privacyverklaring werkt. Controleert de
 * invoer eerst zelf (dezelfde regels als de server) en toont fouten per veld.
 */
export function ContactFormulier({ teksten, privacy }: { teksten: ContactFormulierTeksten; privacy: ReactNode }) {
  const id = useId();
  const formRef = useRef<HTMLFormElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [velden, setVelden] = useState<Partial<Record<ContactVeld, string>>>({});
  const [gelukt, setGelukt] = useState(false);
  const [lengte, setLengte] = useState(0);
  const onderwerpen = teksten.onderwerpen.map((o) => o.onderwerp.trim()).filter(Boolean);

  const veldId = (v: ContactVeld) => `${id}-${v}`;
  const foutId = (v: ContactVeld) => `${id}-${v}-fout`;

  function focusEersteFout(fouten: Partial<Record<ContactVeld, string>>) {
    const eerste = VELD_VOLGORDE.find((v) => fouten[v]);
    if (eerste) document.getElementById(veldId(eerste))?.focus();
  }

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const gegevens = {
      naam: String(f.get("naam") || ""),
      email: String(f.get("email") || ""),
      telefoon: String(f.get("telefoon") || ""),
      onderwerp: String(f.get("onderwerp") || ""),
      bericht: String(f.get("bericht") || ""),
    };
    setFout(null);
    const controle = valideerContact(gegevens, onderwerpen);
    if (!controle.ok) {
      setVelden(controle.fouten);
      focusEersteFout(controle.fouten);
      return;
    }
    setVelden({});
    setBezig(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...gegevens, website: String(f.get("website") || "") }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        fout?: string;
        velden?: Partial<Record<ContactVeld, string>>;
      };
      if (res.ok) {
        setGelukt(true);
        meet(GEBEURTENISSEN.contactVerzonden);
        formRef.current?.reset();
      } else if (data.velden && Object.keys(data.velden).length) {
        setVelden(data.velden);
        focusEersteFout(data.velden);
      } else {
        setFout(res.status === 429 && data.fout ? data.fout : teksten.fout);
      }
    } catch {
      setFout(teksten.fout);
    } finally {
      setBezig(false);
    }
  }

  const veldFout = (v: ContactVeld) =>
    velden[v] ? (
      <span id={foutId(v)} className={VELD_FOUT}>
        {velden[v]}
      </span>
    ) : null;
  const aria = (v: ContactVeld, extra?: string) => ({
    id: veldId(v),
    "aria-invalid": velden[v] ? true : undefined,
    "aria-describedby": [velden[v] ? foutId(v) : null, extra].filter(Boolean).join(" ") || undefined,
  });
  const label = (v: ContactVeld, tekst: string, verplicht: boolean) => (
    <label htmlFor={veldId(v)} className={LABEL}>
      {tekst}
      {verplicht && (
        <span className={VERPLICHT} aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-3">
      {teksten.titel && (
        <h2 className="mt-0 mb-0 font-serif text-[32px] leading-[1.08] font-normal tracking-[-0.015em] text-balance tablet:text-[38px]">
          {teksten.titel}
        </h2>
      )}
      {teksten.intro && <p className="m-0 text-[17px] text-ink-soft">{teksten.intro}</p>}
      {gelukt ? (
        <div role="status" className={`${MELDING_GOED} mt-2 flex flex-col gap-1`}>
          <p className="m-0 font-serif text-[22px] leading-[1.2]">{teksten.succes_titel}</p>
          <p className="m-0">{teksten.succes}</p>
        </div>
      ) : (
        <form ref={formRef} onSubmit={verstuur} noValidate className="mt-4 flex flex-col gap-5">
          {/* Honeypot tegen spambots: onzichtbaar voor mensen en schermlezers. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
          />
          <div className="grid gap-5 tablet:grid-cols-2">
            <div className="flex flex-col gap-2">
              {label("naam", teksten.naam_label, true)}
              <input
                name="naam"
                autoComplete="name"
                required
                maxLength={MAX.naam}
                className={veldKlassen(!!velden.naam)}
                {...aria("naam")}
              />
              {veldFout("naam")}
            </div>
            <div className="flex flex-col gap-2">
              {label("email", teksten.email_label, true)}
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={MAX.email}
                className={veldKlassen(!!velden.email)}
                {...aria("email")}
              />
              {veldFout("email")}
            </div>
            <div className="flex flex-col gap-2">
              {label("telefoon", teksten.telefoon_label, false)}
              <input
                name="telefoon"
                type="tel"
                autoComplete="tel"
                maxLength={MAX.telefoon}
                className={veldKlassen(!!velden.telefoon)}
                {...aria("telefoon")}
              />
              {veldFout("telefoon")}
            </div>
            {onderwerpen.length > 0 && (
              <div className="flex flex-col gap-2">
                {label("onderwerp", teksten.onderwerp_label, true)}
                <div className="relative">
                  <select
                    name="onderwerp"
                    required
                    defaultValue=""
                    className={`${veldKlassen(!!velden.onderwerp)} cursor-pointer appearance-none pr-12`}
                    {...aria("onderwerp")}
                  >
                    <option value="" disabled>
                      {teksten.onderwerp_kies}
                    </option>
                    {onderwerpen.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                  <svg
                    aria-hidden="true"
                    viewBox="0 0 16 16"
                    className="pointer-events-none absolute top-1/2 right-5 h-4 w-4 -translate-y-1/2 text-berry dark:text-accent"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    focusable="false"
                  >
                    <path d="M4 6l4 4 4-4" />
                  </svg>
                </div>
                {veldFout("onderwerp")}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-2">
            {label("bericht", teksten.bericht_label, true)}
            <textarea
              name="bericht"
              required
              rows={7}
              maxLength={MAX.bericht}
              onChange={(e) => setLengte(e.currentTarget.value.length)}
              className={`${tekstvakKlassen(!!velden.bericht)} resize-y`}
              {...aria("bericht", `${id}-teller`)}
            />
            <div className="flex items-start justify-between gap-3">
              {veldFout("bericht") ?? <span />}
              <span
                id={`${id}-teller`}
                className={`shrink-0 text-[14px] tabular-nums ${lengte > MAX.bericht * 0.9 ? "font-bold text-berry" : "text-ink-soft"}`}
              >
                {lengte.toLocaleString("nl-NL")} / {MAX.bericht.toLocaleString("nl-NL")} tekens
              </span>
            </div>
          </div>
          {fout && (
            <p role="alert" className={MELDING_FOUT}>
              {fout}
            </p>
          )}
          <div className="flex flex-col gap-3 tablet:flex-row tablet:items-center tablet:justify-between">
            <button disabled={bezig} className={`${knopKlassen()} w-full cursor-pointer tablet:w-auto`}>
              {bezig ? "Bezig met versturen…" : teksten.knop}
              {!bezig && <Pijl />}
            </button>
          </div>
          <div className={KLEINE_LETTERS}>{privacy}</div>
        </form>
      )}
    </div>
  );
}
