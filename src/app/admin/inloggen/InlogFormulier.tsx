"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function InlogFormulier() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: React.FormEvent) {
    e.preventDefault();
    setBezig(true);
    setFout(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: wachtwoord,
    });
    if (error) {
      setFout("Inloggen mislukt. Controleer je e-mailadres en wachtwoord.");
      setBezig(false);
      return;
    }
    router.push("/admin");
    router.refresh();
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
          autoComplete="email"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20"
        />
      </label>
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Wachtwoord</span>
        <input
          type="password"
          required
          value={wachtwoord}
          onChange={(e) => setWachtwoord(e.target.value)}
          autoComplete="current-password"
          className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20"
        />
      </label>
      {fout && <p className="text-sm text-red-600">{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className="rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
