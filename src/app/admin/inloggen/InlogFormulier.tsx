"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export function InlogFormulier() {
  const [email, setEmail] = useState("");
  const [bezig, setBezig] = useState(false);
  const [verstuurd, setVerstuurd] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${location.origin}/auth/callback?next=/admin` },
    });
    if (error) setFout("Versturen mislukt. Controleer het e-mailadres.");
    else setVerstuurd(true);
    setBezig(false);
  }

  if (verstuurd) {
    return (
      <p className="rounded-lg border border-black/10 px-4 py-3 text-sm text-black/70 dark:border-white/15 dark:text-white/70">
        Check je e-mail: we hebben een inloglink gestuurd naar <strong>{email}</strong>.
      </p>
    );
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">E-mailadres</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20"
        />
      </label>
      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Stuur inloglink"}
      </button>
    </form>
  );
}
