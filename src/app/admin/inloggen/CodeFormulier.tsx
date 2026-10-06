"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { normaliseerCode } from "@/lib/mfa-regels";
import { invoer, knop, tekstFout } from "@/components/admin/stijl";

/**
 * Tweede stap van het inloggen: de code uit de authenticator-app. Verhoogt de
 * sessie naar aal2 (Supabase MFA, challengeAndVerify).
 */
export function CodeFormulier({ vervolg = "/admin" }: { vervolg?: string }) {
  const router = useRouter();
  const [code, setCode] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function verstuur(e: FormEvent) {
    e.preventDefault();
    const schoon = normaliseerCode(code);
    if (!schoon) {
      setFout("Vul de 6 cijfers uit je authenticator-app in.");
      return;
    }
    setBezig(true);
    setFout(null);
    const supabase = createClient();
    const { data, error } = await supabase.auth.mfa.listFactors();
    const factoren = (data?.all ?? []).filter((f) => f.status === "verified" && f.factor_type === "totp");
    if (error || factoren.length === 0) {
      setBezig(false);
      setFout("Er is geen authenticator-app gevonden voor dit account. Log opnieuw in.");
      return;
    }
    // Met meer gekoppelde apps weten we niet uit welke de code komt: probeer ze op volgorde.
    let gelukt = false;
    for (const f of factoren) {
      const { error: verifyFout } = await supabase.auth.mfa.challengeAndVerify({ factorId: f.id, code: schoon });
      if (!verifyFout) {
        gelukt = true;
        break;
      }
    }
    if (!gelukt) {
      setBezig(false);
      setCode("");
      setFout("Die code klopt niet (of is net verlopen). Vul de nieuwste code uit de app in.");
      return;
    }
    router.push(vervolg);
    router.refresh();
  }

  return (
    <form onSubmit={verstuur} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm">
        <span className="text-black/70 dark:text-white/70">Code uit je authenticator-app</span>
        <input
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          required
          maxLength={9}
          placeholder="123 456"
          className={`${invoer} font-mono tracking-widest`}
        />
      </label>
      {fout && (
        <p role="alert" className={`text-sm ${tekstFout}`}>
          {fout}
        </p>
      )}
      <button
        type="submit"
        disabled={bezig}
        className={knop}
      >
        {bezig ? "Bezig…" : "Bevestigen"}
      </button>
    </form>
  );
}
