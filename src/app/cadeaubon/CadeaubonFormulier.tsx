"use client";

import { useRef, useState } from "react";
import { VinkjeTekst } from "../bestellen/BestelFormulier";
import { euroNaarCent, MAX_BOODSCHAP } from "@/lib/cadeaubon/regels";

interface Teksten {
  bedragUitleg: string;
  akkoordVoorwaarden: string;
  knop: string;
  knopBezig: string;
  foutAlgemeen: string;
  foutVerbinding: string;
}

const invoerKlasse =
  "rounded-lg border border-foreground/15 bg-kaart px-3 py-2 outline-none focus:border-accent focus:ring-2 focus:ring-accent/20";

export function CadeaubonFormulier({
  opties,
  standaard,
  maxCent,
  maxLabel,
  minDatum,
  maxDatum,
  teksten,
}: {
  opties: { waarde: string; label: string }[];
  standaard: string;
  /** Hoogste bedrag (de prijs van de test), in centen en leesbaar. */
  maxCent: number;
  maxLabel: string;
  minDatum: string;
  maxDatum: string;
  teksten: Teksten;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  const [keuze, setKeuze] = useState(standaard);
  const [eigenBedrag, setEigenBedrag] = useState("");
  const [bezorging, setBezorging] = useState<"koper" | "ontvanger">("koper");
  const [later, setLater] = useState(false);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  const eigenCent = keuze === "anders" ? euroNaarCent(eigenBedrag) : null;
  const teHoog = eigenCent !== null && eigenCent > maxCent;

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    if (teHoog) {
      setFout(`Een cadeaubon is maximaal de prijs van de test (${maxLabel}).`);
      return;
    }
    setFout(null);
    setBezig(true);
    const f = new FormData(form);
    const payload = {
      bedrag: keuze,
      eigen_bedrag: eigenBedrag,
      koper_naam: String(f.get("koper_naam") || ""),
      koper_email: String(f.get("koper_email") || ""),
      ontvanger_naam: String(f.get("ontvanger_naam") || ""),
      ontvanger_email: bezorging === "ontvanger" ? String(f.get("ontvanger_email") || "") : "",
      boodschap: String(f.get("boodschap") || ""),
      bezorging,
      verzend_op: bezorging === "ontvanger" && later ? String(f.get("verzend_op") || "") : "",
      voorwaarden_akkoord: f.get("voorwaarden_akkoord") === "on",
      website: String(f.get("website") || ""),
    };
    try {
      const res = await fetch("/api/cadeaubon", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.checkoutUrl) {
        setFout(data.fout || teksten.foutAlgemeen);
        setBezig(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setFout(teksten.foutVerbinding);
      setBezig(false);
    }
  }

  return (
    <form ref={formRef} onSubmit={verstuur} className="flex flex-col gap-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-medium">Bedrag</legend>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {opties.map((o) => (
            <label
              key={o.waarde}
              className={`flex cursor-pointer items-center justify-center rounded-lg border px-3 py-2 text-center text-sm transition-colors ${
                keuze === o.waarde
                  ? "border-accent bg-accent-zacht font-medium text-accent"
                  : "border-foreground/15 hover:border-accent/50"
              } ${o.waarde === "prijs" ? "col-span-2 sm:col-span-3" : ""}`}
            >
              <input
                type="radio"
                name="bedrag"
                value={o.waarde}
                checked={keuze === o.waarde}
                onChange={() => setKeuze(o.waarde)}
                className="sr-only"
              />
              {o.label}
            </label>
          ))}
        </div>
        {keuze === "anders" && (
          <label className="mt-1 flex flex-col gap-1 text-sm">
            <span className="text-foreground/70">
              Bedrag in euro (minimaal 5, maximaal de prijs van de test: {maxLabel})
              <span className="text-accent"> *</span>
            </span>
            <input
              value={eigenBedrag}
              onChange={(e) => setEigenBedrag(e.target.value)}
              inputMode="decimal"
              required
              pattern="\s*€?\s*\d{1,6}([.,]\d{1,2})?\s*"
              placeholder="25"
              aria-invalid={teHoog || undefined}
              className={invoerKlasse}
            />
          </label>
        )}
        {teHoog && (
          <p className="text-sm text-accent">
            Een cadeaubon is maximaal de prijs van de test ({maxLabel}).
          </p>
        )}
        <p className="text-xs whitespace-pre-line text-foreground/70">{teksten.bedragUitleg}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Jouw gegevens</legend>
        <Veld naam="koper_naam" label="Je naam" autoComplete="name" verplicht />
        <Veld naam="koper_email" label="Je e-mailadres" type="email" autoComplete="email" verplicht />
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Bezorging</legend>
        <label className="flex items-start gap-3 text-sm text-foreground/80">
          <input
            type="radio"
            name="bezorging"
            checked={bezorging === "koper"}
            onChange={() => setBezorging("koper")}
            className="mt-1 accent-accent"
          />
          <span>Naar mij — ik geef de bon zelf (je krijgt hem ook als PDF om te printen)</span>
        </label>
        <label className="flex items-start gap-3 text-sm text-foreground/80">
          <input
            type="radio"
            name="bezorging"
            checked={bezorging === "ontvanger"}
            onChange={() => setBezorging("ontvanger")}
            className="mt-1 accent-accent"
          />
          <span>Direct per e-mail naar de ontvanger</span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-3">
        <legend className="mb-2 text-sm font-medium">Voor wie is de bon?</legend>
        <Veld
          naam="ontvanger_naam"
          label={bezorging === "ontvanger" ? "Naam van de ontvanger" : "Naam van de ontvanger (optioneel)"}
          verplicht={bezorging === "ontvanger"}
        />
        {bezorging === "ontvanger" && (
          <>
            <Veld naam="ontvanger_email" label="E-mailadres van de ontvanger" type="email" verplicht />
            <label className="flex items-start gap-3 text-sm text-foreground/80">
              <input
                type="checkbox"
                checked={later}
                onChange={(e) => setLater(e.target.checked)}
                className="mt-1 accent-accent"
              />
              <span>Later versturen, op een datum naar keuze</span>
            </label>
            {later && (
              <label className="flex flex-col gap-1 text-sm">
                <span className="text-foreground/70">
                  Verzenddatum<span className="text-accent"> *</span>
                </span>
                <input
                  name="verzend_op"
                  type="date"
                  required
                  min={minDatum}
                  max={maxDatum}
                  className={invoerKlasse}
                />
              </label>
            )}
          </>
        )}
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-foreground/70">Persoonlijke boodschap (optioneel)</span>
          <textarea name="boodschap" rows={3} maxLength={MAX_BOODSCHAP} className={invoerKlasse} />
        </label>
      </fieldset>

      <label className="flex items-start gap-3 text-sm text-foreground/70">
        <input type="checkbox" name="voorwaarden_akkoord" required className="mt-1 accent-accent" />
        <span>
          <VinkjeTekst tekst={teksten.akkoordVoorwaarden} />
        </span>
      </label>

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}

      <button
        disabled={bezig}
        className="mt-1 rounded-full bg-accent px-6 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? teksten.knopBezig : teksten.knop}
      </button>
    </form>
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
      <input name={naam} type={type} autoComplete={autoComplete} required={verplicht} className={invoerKlasse} />
    </label>
  );
}
