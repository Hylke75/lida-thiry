"use client";

import { useState } from "react";

export function BestelFormulier() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFout(null);
    setBezig(true);
    const f = new FormData(e.currentTarget);
    const payload = {
      klantnaam: String(f.get("klantnaam") || ""),
      email: String(f.get("email") || ""),
      factuurgegevens: {
        adres: String(f.get("adres") || ""),
        postcode: String(f.get("postcode") || ""),
        plaats: String(f.get("plaats") || ""),
        land: String(f.get("land") || "Nederland"),
      },
      voorwaarden_akkoord: f.get("voorwaarden_akkoord") === "on",
      directe_levering_akkoord: f.get("directe_levering_akkoord") === "on",
    };

    try {
      const res = await fetch("/api/bestellen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        setFout(data.fout || "Er ging iets mis.");
        setBezig(false);
        return;
      }
      window.location.href = data.checkoutUrl;
    } catch {
      setFout("Kon de betaling niet starten. Probeer het opnieuw.");
      setBezig(false);
    }
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-4">
      <Veld naam="klantnaam" label="Naam" autoComplete="name" verplicht />
      <Veld naam="email" label="E-mailadres" type="email" autoComplete="email" verplicht />
      <Veld naam="adres" label="Adres" autoComplete="street-address" />
      <div className="grid grid-cols-2 gap-4">
        <Veld naam="postcode" label="Postcode" autoComplete="postal-code" />
        <Veld naam="plaats" label="Plaats" autoComplete="address-level2" />
      </div>

      <label className="flex items-start gap-3 text-sm text-black/70 dark:text-white/70">
        <input type="checkbox" name="voorwaarden_akkoord" required className="mt-1" />
        <span>Ik ga akkoord met de voorwaarden en de privacyverklaring.</span>
      </label>
      <label className="flex items-start gap-3 text-sm text-black/70 dark:text-white/70">
        <input type="checkbox" name="directe_levering_akkoord" required className="mt-1" />
        <span>
          Ik ga ermee akkoord dat de digitale inhoud direct wordt geleverd en dat
          ik daarmee mijn herroepingsrecht verlies.
        </span>
      </label>

      {fout && (
        <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}

      <button
        type="submit"
        disabled={bezig}
        className="mt-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Naar betaling"}
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
      <span className="text-black/70 dark:text-white/70">
        {label}
        {verplicht && <span className="text-red-500"> *</span>}
      </span>
      <input
        name={naam}
        type={type}
        autoComplete={autoComplete}
        required={verplicht}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
      />
    </label>
  );
}
