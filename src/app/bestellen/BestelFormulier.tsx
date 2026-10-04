"use client";

import { Fragment, useRef, useState } from "react";
import { parseerOpmaak, type Inline } from "@/lib/inhoud/opmaak";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { BESTELLEN_FORMULIER } from "@/lib/inhoud/groepen/bestellen";

export type BestelFormulierTeksten = SectieWaarden<typeof BESTELLEN_FORMULIER>;

export function BestelFormulier({
  prijsBekend,
  gratisTest,
  teksten,
  nieuwsbriefVinkje,
}: {
  prijsBekend: boolean;
  gratisTest: boolean;
  teksten: BestelFormulierTeksten;
  /** Tekst bij het (optionele) vinkje voor de nieuwsbrief (Beheer → Teksten → Nieuwsbrief). */
  nieuwsbriefVinkje: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function start(gratis: boolean) {
    const form = formRef.current;
    if (!form) return;
    if (!form.reportValidity()) return;
    setFout(null);
    setBezig(true);
    const f = new FormData(form);
    const payload = {
      klantnaam: String(f.get("klantnaam") || ""),
      email: String(f.get("email") || ""),
      factuurgegevens: {
        adres: String(f.get("adres") || ""),
        postcode: String(f.get("postcode") || ""),
        plaats: String(f.get("plaats") || ""),
        land: "Nederland",
      },
      voorwaarden_akkoord: f.get("voorwaarden_akkoord") === "on",
      directe_levering_akkoord: f.get("directe_levering_akkoord") === "on",
      gratis,
      website: String(f.get("website") || ""),
      kortingscode: String(f.get("kortingscode") || "").trim(),
      nieuwsbrief: f.get("nieuwsbrief") === "on",
    };
    try {
      const res = await fetch("/api/bestellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.fout || teksten.foutAlgemeen);
        setBezig(false);
        return;
      }
      window.location.href = data.testUrl || data.checkoutUrl;
    } catch {
      setFout(teksten.foutVerbinding);
      setBezig(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-4">
      {/* Honeypot tegen spambots: onzichtbaar voor mensen en schermlezers. */}
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />
      <Veld naam="klantnaam" label="Naam" autoComplete="name" verplicht />
      <Veld naam="email" label="E-mailadres" type="email" autoComplete="email" verplicht />
      <Veld naam="adres" label="Adres" autoComplete="street-address" />
      <div className="grid grid-cols-2 gap-4">
        <Veld naam="postcode" label="Postcode" autoComplete="postal-code" />
        <Veld naam="plaats" label="Plaats" autoComplete="address-level2" />
      </div>
      <Veld naam="kortingscode" label="Kortingscode of cadeaubon (optioneel)" autoComplete="off" />

      <label className="flex items-start gap-3 text-sm text-foreground/70">
        <input type="checkbox" name="voorwaarden_akkoord" required className="mt-1 accent-accent" />
        <span>
          <VinkjeTekst tekst={teksten.akkoordVoorwaarden} />
        </span>
      </label>
      <label className="flex items-start gap-3 text-sm text-foreground/70">
        <input type="checkbox" name="directe_levering_akkoord" required className="mt-1 accent-accent" />
        <span>
          <VinkjeTekst tekst={teksten.akkoordLevering} />
        </span>
      </label>
      {nieuwsbriefVinkje.trim() && (
        <label className="flex items-start gap-3 text-sm text-foreground/70">
          <input type="checkbox" name="nieuwsbrief" className="mt-1 accent-accent" />
          <span>
            <VinkjeTekst tekst={nieuwsbriefVinkje} />
          </span>
        </label>
      )}

      {fout && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}

      {prijsBekend && (
        <button
          type="button"
          onClick={() => start(false)}
          disabled={bezig}
          className="mt-2 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {bezig ? teksten.knopBezig : teksten.knop}
        </button>
      )}
      {gratisTest && (
        <button
          type="button"
          onClick={() => start(true)}
          disabled={bezig}
          className="rounded-full border border-accent/40 px-6 py-3 text-sm font-medium text-accent hover:bg-accent-zacht disabled:opacity-50"
        >
          {bezig ? teksten.knopBezig : "Gratis testen (zonder betalen)"}
        </button>
      )}
    </form>
  );
}

/**
 * Tekst bij een vinkje, met **vet** en [links](url). Alle links openen in een
 * nieuw tabblad, zodat het half ingevulde formulier niet verloren gaat. Alinea's,
 * koppen en opsommingen worden als losse regels getoond (binnen een label past
 * geen blokopmaak).
 */
function VinkjeTekst({ tekst }: { tekst: string }) {
  const regels = parseerOpmaak(tekst).flatMap((b) =>
    b.soort === "lijst" ? b.items : b.soort === "blok" || b.soort === "afbeelding" ? [] : [b.inhoud],
  );
  return (
    <>
      {regels.map((inhoud, i) => (
        <Fragment key={i}>
          {i > 0 && <br />}
          <InlineTekst delen={inhoud} />
        </Fragment>
      ))}
    </>
  );
}

function InlineTekst({ delen }: { delen: Inline[] }) {
  return (
    <>
      {delen.map((d, i) => {
        switch (d.soort) {
          case "tekst":
            return <Fragment key={i}>{d.tekst}</Fragment>;
          case "regel":
            return <br key={i} />;
          case "vet":
            return (
              <strong key={i}>
                <InlineTekst delen={d.kinderen} />
              </strong>
            );
          case "link":
            return (
              <a
                key={i}
                href={d.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-accent underline underline-offset-2"
              >
                <InlineTekst delen={d.kinderen} />
              </a>
            );
          case "variabele":
            return <Fragment key={i}>{`{${d.naam}}`}</Fragment>;
        }
      })}
    </>
  );
}

function Veld({
  naam,
  label,
  type = "text",
  autoComplete,
  verplicht,
}: {
  naam: string;
  label: string;
  type?: string;
  autoComplete?: string;
  verplicht?: boolean;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-foreground/70">
        {label}
        {verplicht && <span className="text-accent"> *</span>}
      </span>
      <input
        name={naam}
        type={type}
        autoComplete={autoComplete}
        required={verplicht}
        className="rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20"
      />
    </label>
  );
}
