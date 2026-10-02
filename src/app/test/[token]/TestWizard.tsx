"use client";

import { useState } from "react";
import { MAAT_VELDEN, SILHOUETTEN, PASVORMVRAGEN, MEET_TIP } from "@/lib/test-config";

interface Bevinding {
  code: string;
  ernst: string;
  bericht: string;
}
type Resultaat = { soort: "type"; sleutel: string };

export function TestWizard({ token, klantnaam }: { token: string; klantnaam: string }) {
  const [stap, setStap] = useState(1);
  const [lengte, setLengte] = useState("");
  const [gewicht, setGewicht] = useState("");
  const [maten, setMaten] = useState<Record<string, string>>({});
  const [controle, setControle] = useState<Record<string, string>>({});
  const [silhouet, setSilhouet] = useState("");
  const [pasvorm, setPasvorm] = useState<Record<string, string>>({});

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [bevindingen, setBevindingen] = useState<Bevinding[]>([]);
  const [hermeting, setHermeting] = useState(false);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);

  function verplichteMatenIngevuld(): boolean {
    return MAAT_VELDEN.filter((v) => v.verplicht).every((v) => {
      const okWaarde = Boolean(maten[v.sleutel]);
      const okControle = !v.controle || Boolean(controle[v.sleutel]);
      return okWaarde && okControle;
    });
  }

  async function verstuur() {
    setBezig(true);
    setFout(null);
    setBevindingen([]);
    const num = (v: string) => (v === "" ? undefined : Number(v));
    const payload = {
      lengte_cm: Number(lengte),
      gewicht_kg: Number(gewicht),
      maten: {
        borst: num(maten.borst),
        taille: num(maten.taille),
        hoge_heup: num(maten.hoge_heup),
        heup: num(maten.heup),
        binnenbeen: num(maten.binnenbeen ?? ""),
        schouder: num(maten.schouder ?? ""),
      },
      controlemetingen: {
        borst: num(controle.borst ?? ""),
        taille: num(controle.taille ?? ""),
        hoge_heup: num(controle.hoge_heup ?? ""),
        heup: num(controle.heup ?? ""),
      },
      gekozen_silhouet: silhouet,
      pasvormantwoorden: pasvorm,
      hermeting,
    };

    try {
      const res = await fetch(`/api/test/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const d = await res.json();
      if (!res.ok) {
        setFout(d.fout || "Er ging iets mis.");
      } else if (d.soort === "opnieuw_meten") {
        setBevindingen(d.bevindingen);
        setStap(2);
      } else if (d.soort === "silhouet_verschil") {
        setHermeting(true);
        setStap(2);
        setFout(
          "Je gekozen silhouet komt niet helemaal overeen met je maten. Controleer je maten nog een keer en ga verder.",
        );
      } else {
        setResultaat(d);
      }
    } catch {
      setFout("Kon de test niet versturen. Probeer het opnieuw.");
    }
    setBezig(false);
  }

  if (resultaat) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Klaar, {klantnaam}!</h1>
        <p className="text-black/60 dark:text-white/60">
          Op basis van je antwoorden is jouw type <strong>{resultaat.sleutel}</strong>.
          Je ontvangt je persoonlijke advies-PDF per e-mail.
        </p>
        <a
          href={`/api/test/${token}/pdf`}
          className="mx-auto mt-2 rounded-full bg-foreground px-6 py-3 text-sm font-medium text-background transition-opacity hover:opacity-90"
        >
          Download je advies (PDF)
        </a>
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col gap-6 p-8">
      <div>
        <p className="text-xs uppercase tracking-widest text-black/40 dark:text-white/40">
          Stap {stap} van 3
        </p>
        <h1 className="mt-1 text-2xl font-semibold tracking-tight">
          {stap === 1 && "Lengte en gewicht"}
          {stap === 2 && "Je lichaamsmaten"}
          {stap === 3 && "Beeldvragen"}
        </h1>
        <p className="mt-1 text-sm text-black/50 dark:text-white/50">
          Vul hele centimeters en kilo&apos;s in; we ronden automatisch af.
        </p>
      </div>

      {fout && (
        <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
          {fout}
        </p>
      )}
      {bevindingen.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bevindingen.map((b, i) => (
            <li
              key={i}
              className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300"
            >
              {b.bericht}
            </li>
          ))}
        </ul>
      )}

      {stap === 1 && (
        <div className="flex flex-col gap-4">
          <Invoer label="Lengte (cm)" waarde={lengte} zet={setLengte} />
          <Invoer label="Gewicht (kg)" waarde={gewicht} zet={setGewicht} />
        </div>
      )}

      {stap === 2 && (
        <div className="flex flex-col gap-6">
          <p className="rounded-lg bg-black/5 px-4 py-3 text-sm text-black/70 dark:bg-white/10 dark:text-white/70">
            💡 {MEET_TIP}
          </p>
          {MAAT_VELDEN.map((v) => (
            <div key={v.sleutel} className="flex flex-col gap-2">
              <div className="rounded-lg border border-dashed border-black/15 px-3 py-2 text-xs text-black/50 dark:border-white/20 dark:text-white/50">
                📏 {v.instructie}
                <span className="ml-1 opacity-60">(video/animatie volgt)</span>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <Invoer
                  label={`${v.label}${v.verplicht ? " *" : ""} (cm)`}
                  waarde={maten[v.sleutel] ?? ""}
                  zet={(w) => setMaten((s) => ({ ...s, [v.sleutel]: w }))}
                />
                {v.controle && (
                  <Invoer
                    label="Controlemeting (cm)"
                    waarde={controle[v.sleutel] ?? ""}
                    zet={(w) => setControle((s) => ({ ...s, [v.sleutel]: w }))}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {stap === 3 && (
        <div className="flex flex-col gap-6">
          <div>
            <p className="mb-2 text-sm font-medium">Welk silhouet lijkt het meest op het jouwe?</p>
            <div className="grid gap-2">
              {SILHOUETTEN.map((s) => (
                <label
                  key={s.letter}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-sm ${
                    silhouet === s.letter
                      ? "border-black bg-black/5 dark:border-white dark:bg-white/10"
                      : "border-black/15 dark:border-white/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="silhouet"
                    value={s.letter}
                    checked={silhouet === s.letter}
                    onChange={() => setSilhouet(s.letter)}
                  />
                  <span>
                    <strong>{s.naam}</strong>
                    <span className="block text-black/50 dark:text-white/50">{s.omschrijving}</span>
                  </span>
                </label>
              ))}
            </div>
          </div>

          {PASVORMVRAGEN.map((q) => (
            <div key={q.sleutel}>
              <p className="mb-2 text-sm font-medium">{q.vraag}</p>
              <div className="flex flex-wrap gap-2">
                {q.opties.map((optie) => (
                  <label
                    key={optie}
                    className={`cursor-pointer rounded-full border px-3 py-1.5 text-sm ${
                      pasvorm[q.sleutel] === optie
                        ? "border-black bg-black/5 dark:border-white dark:bg-white/10"
                        : "border-black/15 dark:border-white/20"
                    }`}
                  >
                    <input
                      type="radio"
                      name={q.sleutel}
                      value={optie}
                      checked={pasvorm[q.sleutel] === optie}
                      onChange={() => setPasvorm((s) => ({ ...s, [q.sleutel]: optie }))}
                      className="hidden"
                    />
                    {optie}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setStap((s) => Math.max(1, s - 1))}
          disabled={stap === 1 || bezig}
          className="rounded-full border border-black/15 px-5 py-2.5 text-sm disabled:opacity-40 dark:border-white/20"
        >
          Terug
        </button>

        {stap < 3 ? (
          <button
            type="button"
            onClick={() => {
              setFout(null);
              if (stap === 1 && (!lengte || !gewicht)) return setFout("Vul lengte en gewicht in.");
              if (stap === 2 && !verplichteMatenIngevuld())
                return setFout("Vul alle verplichte maten en controlemetingen in.");
              setStap((s) => s + 1);
            }}
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:opacity-90"
          >
            Volgende
          </button>
        ) : (
          <button
            type="button"
            onClick={() => {
              if (!silhouet) return setFout("Kies een silhouet.");
              if (PASVORMVRAGEN.some((q) => !pasvorm[q.sleutel]))
                return setFout("Beantwoord de pasvormvragen.");
              verstuur();
            }}
            disabled={bezig}
            className="rounded-full bg-foreground px-6 py-2.5 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {bezig ? "Bezig…" : "Test afronden"}
          </button>
        )}
      </div>
    </main>
  );
}

function Invoer({
  label,
  waarde,
  zet,
}: {
  label: string;
  waarde: string;
  zet: (w: string) => void;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      <input
        inputMode="numeric"
        value={waarde}
        onChange={(e) => zet(e.target.value.replace(/[^0-9.,]/g, "").replace(",", "."))}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 outline-none focus:border-black/40 dark:border-white/20 dark:focus:border-white/50"
      />
    </label>
  );
}
