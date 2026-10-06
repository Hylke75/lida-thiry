"use client";

import { useRef, useState } from "react";
import { VinkjeTekst } from "../bestellen/BestelFormulier";
import { MAX_BOODSCHAP } from "@/lib/cadeaubon/regels";
import { vulIn, type SectieWaarden } from "@/lib/inhoud/schema";
import type { CADEAUBON_PAGINA } from "@/lib/inhoud/groepen/cadeaubon";
import { euroNaarCent } from "@/lib/prijs";
import { knopKlassen } from "@/components/site/Basis";
import { HULPTEKST, INVOER, LABEL, LEGENDA, VELDFOUT, VERPLICHT, VINKJE, VINKJE_LABEL, keuzeTegel } from "@/components/site/FormulierStijl";
import { klantMeldingKlassen } from "@/components/site/KlantPagina";

type Teksten = SectieWaarden<typeof CADEAUBON_PAGINA>;

const invoerKlasse = INVOER;

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
      setFout(vulIn(teksten.teHoog, { max: maxLabel }));
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
    <form ref={formRef} onSubmit={verstuur} className="flex flex-col gap-8">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />

      <fieldset className="flex flex-col gap-3">
        <legend className={LEGENDA}>{teksten.bedragLegenda}</legend>
        <div className="grid grid-cols-2 gap-3 tablet:grid-cols-3">
          {opties.map((o) => (
            <label
              key={o.waarde}
              className={`flex min-h-[52px] items-center justify-center rounded-ontwerp-sm px-4 py-2 text-center text-[15px] font-bold ${keuzeTegel(
                keuze === o.waarde,
              )} ${o.waarde === "prijs" ? "col-span-2 tablet:col-span-3" : ""}`}
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
          <label className="mt-1 flex flex-col gap-2">
            <span className={LABEL}>
              {vulIn(teksten.eigenBedragLabel, { max: maxLabel })}
              <span className={VERPLICHT}> *</span>
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
          <p className={VELDFOUT}>{vulIn(teksten.teHoog, { max: maxLabel })}</p>
        )}
        <p className={`${HULPTEKST} whitespace-pre-line`}>{teksten.bedragUitleg}</p>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={LEGENDA}>{teksten.gegevensLegenda}</legend>
        <Veld naam="koper_naam" label={teksten.koperNaam} autoComplete="name" verplicht />
        <Veld naam="koper_email" label={teksten.koperEmail} type="email" autoComplete="email" verplicht />
      </fieldset>

      <fieldset className="flex flex-col gap-2">
        <legend className={LEGENDA}>{teksten.bezorgingLegenda}</legend>
        <label className={VINKJE_LABEL}>
          <input
            type="radio"
            name="bezorging"
            checked={bezorging === "koper"}
            onChange={() => setBezorging("koper")}
            className={VINKJE}
          />
          <span>{teksten.bezorgingKoper}</span>
        </label>
        <label className={VINKJE_LABEL}>
          <input
            type="radio"
            name="bezorging"
            checked={bezorging === "ontvanger"}
            onChange={() => setBezorging("ontvanger")}
            className={VINKJE}
          />
          <span>{teksten.bezorgingOntvanger}</span>
        </label>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className={LEGENDA}>{teksten.ontvangerLegenda}</legend>
        <Veld
          naam="ontvanger_naam"
          label={bezorging === "ontvanger" ? teksten.ontvangerNaam : teksten.ontvangerNaamOptioneel}
          verplicht={bezorging === "ontvanger"}
        />
        {bezorging === "ontvanger" && (
          <>
            <Veld naam="ontvanger_email" label={teksten.ontvangerEmail} type="email" verplicht />
            <label className={VINKJE_LABEL}>
              <input
                type="checkbox"
                checked={later}
                onChange={(e) => setLater(e.target.checked)}
                className={VINKJE}
              />
              <span>{teksten.later}</span>
            </label>
            {later && (
              <label className="flex flex-col gap-2">
                <span className={LABEL}>
                  {teksten.verzenddatum}
                  <span className={VERPLICHT}> *</span>
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
        <label className="flex flex-col gap-2">
          <span className={LABEL}>{teksten.boodschap}</span>
          <textarea name="boodschap" rows={3} maxLength={MAX_BOODSCHAP} className={`${invoerKlasse} resize-y`} />
        </label>
      </fieldset>

      <label className={`${VINKJE_LABEL} border-t border-line pt-6`}>
        <input type="checkbox" name="voorwaarden_akkoord" required className={VINKJE} />
        <span>
          <VinkjeTekst tekst={teksten.akkoordVoorwaarden} />
        </span>
      </label>

      {fout && (
        <p role="alert" className={klantMeldingKlassen("fout")}>
          {fout}
        </p>
      )}

      <button
        disabled={bezig}
        className={`${knopKlassen()} w-full tablet:w-auto tablet:self-start`}
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
    <label className="flex flex-col gap-2">
      <span className={LABEL}>
        {label}
        {verplicht && <span className={VERPLICHT}> *</span>}
      </span>
      <input name={naam} type={type} autoComplete={autoComplete} required={verplicht} className={invoerKlasse} />
    </label>
  );
}
