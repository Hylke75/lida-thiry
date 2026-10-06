"use client";

import { useState } from "react";
import { knopKlassen } from "@/components/site/Basis";
import { INVOER, LABEL, VERPLICHT } from "@/components/site/FormulierStijl";
import { klantMeldingKlassen } from "@/components/site/KlantPagina";

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
      <p role="status" className={`${klantMeldingKlassen("goed")} whitespace-pre-line`}>
        {teksten.bevestiging}
      </p>
    );
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-5">
      <input
        type="text"
        name="website"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
      />
      <label className="flex flex-col gap-2">
        <span className={LABEL}>
          E-mailadres<span className={VERPLICHT}> *</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          className={INVOER}
        />
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
