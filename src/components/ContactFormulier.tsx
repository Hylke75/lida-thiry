"use client";

import { meet } from "@/lib/analytics/meet";
import { GEBEURTENISSEN } from "@/lib/analytics/regels";
import { useId, useRef, useState, type FormEvent, type ReactNode } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { CONTACT_FORMULIER } from "@/lib/inhoud/groepen/contact";
import { MAX, valideerContact, type ContactVeld } from "@/lib/contact/regels";

export type ContactFormulierTeksten = SectieWaarden<typeof CONTACT_FORMULIER>;

const VELD_VOLGORDE: readonly ContactVeld[] = ["naam", "email", "telefoon", "onderwerp", "bericht"];

const invoerStijl = (fout: boolean) =>
  `w-full rounded-lg border bg-kaart px-3 py-2 outline-none focus:ring-2 ${
    fout
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "border-foreground/15 focus:border-accent focus:ring-accent/20"
  }`;

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
      <span id={foutId(v)} className="text-sm text-red-700 dark:text-red-300">
        {velden[v]}
      </span>
    ) : null;
  const aria = (v: ContactVeld, extra?: string) => ({
    id: veldId(v),
    "aria-invalid": velden[v] ? true : undefined,
    "aria-describedby": [velden[v] ? foutId(v) : null, extra].filter(Boolean).join(" ") || undefined,
  });
  const label = (v: ContactVeld, tekst: string, verplicht: boolean) => (
    <label htmlFor={veldId(v)} className="text-foreground/70">
      {tekst}
      {verplicht && (
        <span className="text-accent" aria-hidden="true">
          {" "}
          *
        </span>
      )}
    </label>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4">
      {teksten.titel && <h2 className="text-3xl font-semibold tracking-tight">{teksten.titel}</h2>}
      {teksten.intro && <p className="text-foreground/70">{teksten.intro}</p>}
      {gelukt ? (
        <div role="status" className="flex flex-col gap-1 rounded-2xl bg-accent-zacht px-5 py-4 text-foreground/80">
          <p className="font-medium">{teksten.succes_titel}</p>
          <p>{teksten.succes}</p>
        </div>
      ) : (
        <form ref={formRef} onSubmit={verstuur} noValidate className="mt-2 flex flex-col gap-4">
          {/* Honeypot tegen spambots: onzichtbaar voor mensen en schermlezers. */}
          <input
            type="text"
            name="website"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="flex flex-col gap-1 text-sm">
              {label("naam", teksten.naam_label, true)}
              <input
                name="naam"
                autoComplete="name"
                required
                maxLength={MAX.naam}
                className={invoerStijl(!!velden.naam)}
                {...aria("naam")}
              />
              {veldFout("naam")}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {label("email", teksten.email_label, true)}
              <input
                name="email"
                type="email"
                autoComplete="email"
                required
                maxLength={MAX.email}
                className={invoerStijl(!!velden.email)}
                {...aria("email")}
              />
              {veldFout("email")}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {label("telefoon", teksten.telefoon_label, false)}
              <input
                name="telefoon"
                type="tel"
                autoComplete="tel"
                maxLength={MAX.telefoon}
                className={invoerStijl(!!velden.telefoon)}
                {...aria("telefoon")}
              />
              {veldFout("telefoon")}
            </div>
            {onderwerpen.length > 0 && (
              <div className="flex flex-col gap-1 text-sm">
                {label("onderwerp", teksten.onderwerp_label, true)}
                <select
                  name="onderwerp"
                  required
                  defaultValue=""
                  className={invoerStijl(!!velden.onderwerp)}
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
                {veldFout("onderwerp")}
              </div>
            )}
          </div>
          <div className="flex flex-col gap-1 text-sm">
            {label("bericht", teksten.bericht_label, true)}
            <textarea
              name="bericht"
              required
              rows={7}
              maxLength={MAX.bericht}
              onChange={(e) => setLengte(e.currentTarget.value.length)}
              className={`${invoerStijl(!!velden.bericht)} resize-y`}
              {...aria("bericht", `${id}-teller`)}
            />
            <div className="flex items-start justify-between gap-3">
              {veldFout("bericht") ?? <span />}
              <span
                id={`${id}-teller`}
                className={`shrink-0 text-xs tabular-nums ${lengte > MAX.bericht * 0.9 ? "text-accent" : "text-foreground/50"}`}
              >
                {lengte.toLocaleString("nl-NL")} / {MAX.bericht.toLocaleString("nl-NL")} tekens
              </span>
            </div>
          </div>
          {fout && (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {fout}
            </p>
          )}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <button
              disabled={bezig}
              className="w-fit rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {bezig ? "Bezig met versturen…" : teksten.knop}
            </button>
          </div>
          <div className="text-xs text-foreground/50 [&_a]:text-accent [&_a]:underline [&_p]:mt-1">{privacy}</div>
        </form>
      )}
    </div>
  );
}
