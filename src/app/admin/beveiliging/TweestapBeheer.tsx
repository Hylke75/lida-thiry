"use client";

import { useCallback, useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { factorNaam, normaliseerCode } from "@/lib/mfa-regels";
import { meldTweestapWijziging } from "./acties";
import { invoerBreed, knop, knopKlein, tekstFout, tekstSucces } from "@/components/admin/stijl";

interface Factor {
  id: string;
  friendly_name?: string;
  factor_type: string;
  status: string;
  created_at: string;
}

interface Koppeling {
  factorId: string;
  qr: string;
  geheim: string;
}

function datum(iso: string): string {
  return new Date(iso).toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" });
}

async function haalFactoren(): Promise<{ factoren: Factor[]; fout: string | null }> {
  const { data, error } = await createClient().auth.mfa.listFactors();
  if (error) return { factoren: [], fout: `De gekoppelde apps konden niet worden geladen: ${error.message}` };
  return { factoren: (data?.all ?? []) as Factor[], fout: null };
}

/** Authenticator-apps koppelen en verwijderen (Supabase MFA, TOTP), rechtstreeks vanuit de browser. */
export function TweestapBeheer({ verplicht }: { verplicht: boolean }) {
  const router = useRouter();
  const [factoren, setFactoren] = useState<Factor[] | null>(null);
  const [koppeling, setKoppeling] = useState<Koppeling | null>(null);
  const [naam, setNaam] = useState("");
  const [code, setCode] = useState("");
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);

  const toon = useCallback((r: { factoren: Factor[]; fout: string | null }) => {
    setFactoren(r.factoren);
    if (r.fout) setFout(r.fout);
  }, []);

  const laad = useCallback(async () => toon(await haalFactoren()), [toon]);

  useEffect(() => {
    // Eenmalig laden bij openen.
    let actief = true;
    haalFactoren().then((r) => actief && toon(r));
    return () => {
      actief = false;
    };
  }, [toon]);

  const geverifieerd = (factoren ?? []).filter((f) => f.status === "verified" && f.factor_type === "totp");

  async function begin() {
    setBezig(true);
    setFout(null);
    setMelding(null);
    const supabase = createClient();
    // Half afgemaakte koppelingen eerst opruimen (die blokkeren anders een nieuwe).
    for (const f of (factoren ?? []).filter((f) => f.status !== "verified")) {
      await supabase.auth.mfa.unenroll({ factorId: f.id });
    }
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: "totp",
      friendlyName: factorNaam(geverifieerd, naam),
    });
    setBezig(false);
    if (error || !data) {
      setFout(`Koppelen kon niet worden gestart: ${error?.message ?? "onbekende fout"}`);
      return;
    }
    setKoppeling({ factorId: data.id, qr: data.totp.qr_code, geheim: data.totp.secret });
    setCode("");
  }

  async function bevestig(e: FormEvent) {
    e.preventDefault();
    if (!koppeling) return;
    const schoon = normaliseerCode(code);
    if (!schoon) {
      setFout("Vul de 6 cijfers uit de app in.");
      return;
    }
    setBezig(true);
    setFout(null);
    const { error } = await createClient().auth.mfa.challengeAndVerify({ factorId: koppeling.factorId, code: schoon });
    if (error) {
      setBezig(false);
      setFout("Die code klopt niet (of is net verlopen). Vul de nieuwste code uit de app in.");
      return;
    }
    await meldTweestapWijziging("aan").catch(() => undefined);
    setKoppeling(null);
    setNaam("");
    setBezig(false);
    setMelding("Tweestapsverificatie staat aan. Voortaan vragen we bij het inloggen ook een code uit de app.");
    await laad();
    router.refresh();
  }

  async function annuleer() {
    if (koppeling) await createClient().auth.mfa.unenroll({ factorId: koppeling.factorId });
    setKoppeling(null);
    setFout(null);
    await laad();
  }

  async function verwijder(f: Factor) {
    const laatste = geverifieerd.length <= 1;
    const vraag = laatste
      ? verplicht
        ? "Dit is je enige app. Tweestapsverificatie is verplicht, dus daarna moet je meteen een nieuwe app koppelen. Doorgaan?"
        : "Dit is je enige app. Daarna log je weer in met alleen je wachtwoord. Doorgaan?"
      : `‘${f.friendly_name ?? "App"}’ verwijderen?`;
    if (!window.confirm(vraag)) return;
    setBezig(true);
    setFout(null);
    setMelding(null);
    const { error } = await createClient().auth.mfa.unenroll({ factorId: f.id });
    if (error) {
      setBezig(false);
      setFout(`Verwijderen mislukt: ${error.message}`);
      return;
    }
    await meldTweestapWijziging("uit").catch(() => undefined);
    setBezig(false);
    setMelding("De app is verwijderd.");
    await laad();
    router.refresh();
  }

  if (factoren === null) return <p className="text-sm text-foreground/70">Laden…</p>;

  return (
    <div className="flex flex-col gap-4">
      {melding && (
        <p role="status" className={`text-sm ${tekstSucces}`}>
          ✓ {melding}
        </p>
      )}
      {fout && (
        <p role="alert" className={`text-sm ${tekstFout}`}>
          {fout}
        </p>
      )}

      {geverifieerd.length > 0 ? (
        <ul className="flex flex-col divide-y divide-black/5 text-sm dark:divide-white/10">
          {geverifieerd.map((f) => (
            <li key={f.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
              <span>
                <span className="font-medium">{f.friendly_name ?? "Authenticator-app"}</span>
                <span className="text-foreground/70"> · gekoppeld {datum(f.created_at)}</span>
              </span>
              <button type="button" className={`${knopKlein} text-red-700 dark:text-red-300`} disabled={bezig} onClick={() => verwijder(f)}>
                Verwijderen
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-foreground/70">Je hebt nog geen authenticator-app gekoppeld.</p>
      )}

      {koppeling ? (
        <form onSubmit={bevestig} className="flex flex-col gap-3 rounded-xl border border-accent/40 p-4">
          <p className="text-sm">
            <strong>1.</strong> Scan deze QR-code met je authenticator-app (bijv. Google Authenticator, Microsoft
            Authenticator, 1Password of Bitwarden).
          </p>
          {/* QR-code als data-URL (SVG) van Supabase; geen beeldoptimalisatie nodig. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={koppeling.qr} alt="QR-code voor je authenticator-app" width={180} height={180} className="rounded-lg bg-white p-2" />
          <p className="text-sm text-foreground/70">
            Lukt scannen niet? Voer dan deze sleutel handmatig in:
            <code className="mt-1 block break-all rounded bg-black/5 px-2 py-1 font-mono text-xs dark:bg-white/10">{koppeling.geheim}</code>
          </p>
          <label className="flex flex-col gap-1 text-sm">
            <span>
              <strong>2.</strong> Vul de code van 6 cijfers uit de app in
            </span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9 \-]*"
              maxLength={9}
              required
              className={`${invoerBreed} max-w-40 font-mono tracking-widest`}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <button className={knop} disabled={bezig}>
              {bezig ? "Bezig…" : "Bevestigen"}
            </button>
            <button type="button" className={knopKlein} disabled={bezig} onClick={annuleer}>
              Annuleren
            </button>
          </div>
        </form>
      ) : (
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
          <label className="flex flex-1 flex-col gap-1 text-sm">
            <span className="text-black/70 dark:text-white/70">Naam van de app of het apparaat (optioneel)</span>
            <input
              value={naam}
              onChange={(e) => setNaam(e.target.value)}
              maxLength={40}
              placeholder={geverifieerd.length ? "bijv. Reservetelefoon" : "bijv. Telefoon van Lida"}
              className={invoerBreed}
            />
          </label>
          <button type="button" className={knop} disabled={bezig} onClick={begin}>
            {bezig ? "Bezig…" : geverifieerd.length ? "Nog een app koppelen" : "App koppelen"}
          </button>
        </div>
      )}
    </div>
  );
}
