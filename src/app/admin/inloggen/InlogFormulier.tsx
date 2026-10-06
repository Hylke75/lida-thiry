"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { CodeFormulier } from "./CodeFormulier";
import { invoer, knop, tekstFout } from "@/components/admin/stijl";

export function InlogFormulier() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [wachtwoord, setWachtwoord] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [codeNodig, setCodeNodig] = useState(false);

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
    // Tweestapsverificatie: met een gekoppelde app eerst de code (aal1 → aal2).
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal && aal.nextLevel === "aal2" && aal.currentLevel !== "aal2") {
      setBezig(false);
      setCodeNodig(true);
      return;
    }
    router.push("/admin");
    router.refresh();
  }

  if (codeNodig) {
    return (
      <div className="flex flex-col gap-3">
        <p className="text-sm text-foreground/70">
          Je wachtwoord klopt. Vul nu de code van 6 cijfers uit je authenticator-app in.
        </p>
        <CodeFormulier />
      </div>
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
          autoComplete="email"
          className={invoer}
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
          className={invoer}
        />
      </label>
      {fout && <p className={`text-sm ${tekstFout}`}>{fout}</p>}
      <button
        type="submit"
        disabled={bezig}
        className={knop}
      >
        {bezig ? "Bezig…" : "Inloggen"}
      </button>
    </form>
  );
}
