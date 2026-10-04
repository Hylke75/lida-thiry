"use client";

import { useState, type FormEvent } from "react";
import type { TestUitkomst } from "@/lib/doorverwijzingen/regels";
import { Melding } from "../Melding";
import { testDoorverwijzing } from "./acties";
import { invoer, kleineKnop } from "./stijl";

function Uitleg({ u }: { u: TestUitkomst }) {
  switch (u.soort) {
    case "ongeldig":
      return <p>Dit is geen geldig adres. Vul een pad in (bijv. /oude-pagina) of een volledig adres.</p>;
    case "gereserveerd":
      return (
        <p>
          <code className="font-mono">{u.pad}</code> valt onder /admin, /api, /auth of /_next en wordt nooit doorverwezen.
        </p>
      );
    case "geen":
      return (
        <p>
          Geen doorverwijzing: <code className="font-mono">{u.pad}</code> toont gewoon de pagina die daar staat (of ‘pagina niet gevonden’).
        </p>
      );
    case "doorverwijzing":
      return (
        <div className="flex flex-col gap-1">
          <p>
            <code className="font-mono">{u.pad}</code> wordt {u.regel.permanent ? "permanent" : "tijdelijk"} doorgestuurd (HTTP {u.status}) naar{" "}
            <code className="break-all font-mono">{u.doel}</code>.
          </p>
          {u.regel.van !== u.pad && (
            <p className="text-xs opacity-80">
              Gevonden via de regel voor <code className="font-mono">{u.regel.van}</code> (hoofdletters tellen niet mee als er geen exacte match is).
            </p>
          )}
          {u.vervolg.length > 0 && (
            <p className="text-xs opacity-80">
              Daarna wordt de bezoeker nog {u.vervolg.length === 1 ? "een keer" : `${u.vervolg.length} keer`} doorgestuurd:{" "}
              {u.vervolg.map((s) => s.naar).join(" → ")}
              {u.lus ? " … en dat blijft rondgaan! Pas een van deze doorverwijzingen aan." : ". Verwijs liever direct naar het eindadres."}
            </p>
          )}
        </div>
      );
  }
}

/** "Test een adres": laat zien wat er gebeurt als iemand dit adres bezoekt. */
export function TestAdres() {
  const [adres, setAdres] = useState("");
  const [uitkomst, setUitkomst] = useState<TestUitkomst | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function test(e: FormEvent) {
    e.preventDefault();
    if (!adres.trim()) return;
    setBezig(true);
    setFout(null);
    try {
      const r = await testDoorverwijzing(adres);
      if (r.ok) setUitkomst(r.uitkomst);
      else {
        setUitkomst(null);
        setFout(r.fout);
      }
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex flex-col gap-3">
      <form onSubmit={test} className="flex flex-wrap items-center gap-2">
        <input
          value={adres}
          onChange={(e) => setAdres(e.target.value)}
          placeholder="/oude-pagina of https://…/oude-pagina?x=1"
          aria-label="Adres om te testen"
          className={`${invoer} flex-1 font-mono`}
        />
        <button disabled={bezig || !adres.trim()} className={kleineKnop}>
          {bezig ? "Bezig…" : "Test"}
        </button>
      </form>
      {fout && <Melding soort="fout">{fout}</Melding>}
      {uitkomst && (
        <div className="rounded-lg bg-black/5 px-4 py-3 text-sm dark:bg-white/10" role="status">
          <Uitleg u={uitkomst} />
        </div>
      )}
    </div>
  );
}
