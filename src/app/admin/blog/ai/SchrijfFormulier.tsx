"use client";

import { useEffect, useState, useTransition } from "react";
import { LENGTES, TONEN, type Lengte, type Toon } from "@/lib/blog/ai-prompt";
import { invoerKlasse, kaart, knopHoofd, knopKlein, zacht } from "../../nieuwsbrief/_editor/stijl";
import { schrijfMetAi } from "./acties";

const TOON_LABEL: Record<Toon, string> = {
  warm: "Warm en persoonlijk",
  inspirerend: "Inspirerend",
  zakelijk: "Helder en deskundig",
  speels: "Luchtig en speels",
};

const STAPPEN = [
  "Opdracht doorgeven…",
  "De AI denkt na over de opbouw…",
  "De tekst wordt geschreven…",
  "Titel, samenvatting en SEO-teksten bedenken…",
  "Bijna klaar, nog even geduld…",
];

export function SchrijfFormulier({ figuurtypes }: { figuurtypes: string[] }) {
  const [steekwoorden, setSteekwoorden] = useState<string[]>([]);
  const [nieuw, setNieuw] = useState("");
  const [onderwerp, setOnderwerp] = useState("");
  const [toon, setToon] = useState<Toon>("warm");
  const [lengte, setLengte] = useState<Lengte>("middel");
  const [doelgroep, setDoelgroep] = useState("");
  const [types, setTypes] = useState<string[]>([]);
  const [extra, setExtra] = useState("");
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, start] = useTransition();
  const [seconden, setSeconden] = useState(0);

  useEffect(() => {
    if (!bezig) return;
    const begin = Date.now();
    const t = setInterval(() => setSeconden(Math.floor((Date.now() - begin) / 1000)), 1000);
    return () => clearInterval(t);
  }, [bezig]);

  const voegToe = (tekst: string) => {
    const delen = tekst
      .split(/[,;\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (delen.length) setSteekwoorden((oud) => [...new Set([...oud, ...delen.map((d) => d.slice(0, 60))])].slice(0, 12));
    setNieuw("");
  };

  const alleSteekwoorden = nieuw.trim() ? [...steekwoorden, nieuw.trim()] : steekwoorden;

  function verstuur() {
    if (bezig) return;
    if (!alleSteekwoorden.length) return setFout("Vul minstens één steekwoord in.");
    if (nieuw.trim()) voegToe(nieuw);
    setFout(null);
    setSeconden(0);
    start(async () => {
      try {
        const r = await schrijfMetAi({ steekwoorden: alleSteekwoorden, onderwerp, toon, lengte, doelgroep, figuurtypes: types, extra });
        if (r && !r.ok) setFout(r.fout);
      } catch {
        setFout("Het schrijven duurde te lang of de verbinding viel weg. Kijk in het overzicht of het concept toch is gemaakt, en probeer het anders opnieuw.");
      }
    });
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verstuur();
      }}
      className="flex min-w-0 flex-col gap-6"
    >
      <fieldset disabled={bezig} className="flex min-w-0 flex-col gap-6">
        <section className={kaart}>
          <h2 className="text-lg font-semibold">Waar gaat het over?</h2>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="steekwoord" className="text-sm font-medium">
              Steekwoorden <span className="text-red-700 dark:text-red-400">*</span>
            </label>
            {steekwoorden.length > 0 && (
              <ul className="flex flex-wrap gap-1.5">
                {steekwoorden.map((s) => (
                  <li key={s} className="flex items-center gap-1 rounded-full bg-accent-zacht py-0.5 pl-3 pr-1 text-sm text-accent">
                    {s}
                    <button
                      type="button"
                      onClick={() => setSteekwoorden((oud) => oud.filter((x) => x !== s))}
                      aria-label={`${s} verwijderen`}
                      className="rounded-full px-1.5 hover:bg-black/10 dark:hover:bg-white/10"
                    >
                      ×
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <input
              id="steekwoord"
              value={nieuw}
              maxLength={200}
              onChange={(e) => (/[,;]/.test(e.target.value) ? voegToe(e.target.value) : setNieuw(e.target.value))}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  voegToe(nieuw);
                } else if (e.key === "Backspace" && !nieuw && steekwoorden.length) {
                  setSteekwoorden((oud) => oud.slice(0, -1));
                }
              }}
              className={invoerKlasse}
              placeholder="Bijv. wikkeljurk, zandloper, feestdagen — druk op Enter of typ een komma"
            />
            <p className={`text-xs ${zacht}`}>Maximaal 12. Hoe concreter, hoe beter het resultaat.</p>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="onderwerp" className="text-sm font-medium">
              Onderwerp of werktitel <span className={`font-normal ${zacht}`}>(optioneel)</span>
            </label>
            <input
              id="onderwerp"
              value={onderwerp}
              maxLength={200}
              onChange={(e) => setOnderwerp(e.target.value)}
              className={invoerKlasse}
              placeholder="Bijv. Wat trek je aan naar een kerstdiner?"
            />
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="doelgroep" className="text-sm font-medium">
              Voor wie <span className={`font-normal ${zacht}`}>(optioneel)</span>
            </label>
            <input
              id="doelgroep"
              value={doelgroep}
              maxLength={120}
              onChange={(e) => setDoelgroep(e.target.value)}
              className={invoerKlasse}
              placeholder="Bijv. vrouwen van 50+ die weer naar kantoor gaan"
            />
          </div>
          {figuurtypes.length > 0 && (
            <fieldset className="flex min-w-0 flex-col gap-1">
              <legend className="text-sm font-medium">
                Figuurtypes <span className={`font-normal ${zacht}`}>(optioneel)</span>
              </legend>
              <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                {figuurtypes.map((t) => (
                  <label key={t} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={types.includes(t)}
                      onChange={(e) => setTypes((oud) => (e.target.checked ? [...oud, t] : oud.filter((x) => x !== t)))}
                      className="size-4"
                    />
                    {t}
                  </label>
                ))}
              </div>
            </fieldset>
          )}
        </section>

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Hoe moet het klinken?</h2>
          <div className="grid min-w-0 gap-4 sm:grid-cols-2">
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="toon" className="text-sm font-medium">
                Toon
              </label>
              <select id="toon" value={toon} onChange={(e) => setToon(e.target.value as Toon)} className={invoerKlasse}>
                {(Object.keys(TONEN) as Toon[]).map((t) => (
                  <option key={t} value={t}>
                    {TOON_LABEL[t] ?? t}
                  </option>
                ))}
              </select>
              <p className={`text-xs ${zacht}`}>{TONEN[toon]}.</p>
            </div>
            <div className="flex min-w-0 flex-col gap-1">
              <label htmlFor="lengte" className="text-sm font-medium">
                Lengte
              </label>
              <select id="lengte" value={lengte} onChange={(e) => setLengte(e.target.value as Lengte)} className={invoerKlasse}>
                {(Object.keys(LENGTES) as Lengte[]).map((l) => (
                  <option key={l} value={l}>
                    {LENGTES[l].label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="flex min-w-0 flex-col gap-1">
            <label htmlFor="extra" className="text-sm font-medium">
              Extra wensen <span className={`font-normal ${zacht}`}>(optioneel)</span>
            </label>
            <textarea
              id="extra"
              value={extra}
              maxLength={1000}
              rows={3}
              onChange={(e) => setExtra(e.target.value)}
              className={invoerKlasse}
              placeholder="Bijv. begin met een herkenbare situatie, en noem dat ik ook persoonlijke afspraken doe."
            />
          </div>
        </section>
      </fieldset>

      {fout && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}

      {bezig ? (
        <div role="status" className="flex flex-col gap-2 rounded-2xl border border-violet-300 bg-violet-50 p-4 text-sm text-violet-950 dark:border-violet-700 dark:bg-violet-950/40 dark:text-violet-100">
          <p className="flex items-center gap-2 font-medium">
            <span aria-hidden className="inline-block size-4 animate-spin rounded-full border-2 border-current border-r-transparent" />
            {STAPPEN[Math.min(STAPPEN.length - 1, Math.floor(seconden / 15))]}
          </p>
          <p className="text-xs">
            Dit duurt meestal 30 seconden tot 2 minuten ({seconden} s). Laat deze pagina open; je gaat vanzelf naar het concept zodra het klaar is.
          </p>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <button className={knopHoofd} disabled={!alleSteekwoorden.length}>
            ✨ Concept laten schrijven
          </button>
          {steekwoorden.length > 0 && (
            <button type="button" onClick={() => setSteekwoorden([])} className={knopKlein}>
              Steekwoorden wissen
            </button>
          )}
        </div>
      )}
      <p className={`text-xs ${zacht}`}>
        De AI verzint geen feiten, cijfers of klantverhalen, maar kan zich vergissen. Waar een foto past, zet hij een regel als [foto: …] in de tekst die
        jij later vervangt.
      </p>
    </form>
  );
}
