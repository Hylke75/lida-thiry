"use client";

import { useEffect, useRef, useState } from "react";
import {
  MAAT_VELDEN,
  MAAT_GROEPEN,
  SILHOUETTEN,
  PASVORMVRAGEN,
  MEET_TIP,
  type MaatVeld,
} from "@/lib/test-config";
import { MAAT_GRENZEN } from "@/rekenkern/config/grenzen";
import { logischeChecks } from "@/rekenkern/plausibiliteit";
import { Lichaam } from "./Lichaam";

interface Bevinding {
  code: string;
  ernst: string;
  bericht: string;
}
type Resultaat = { soort: "type"; sleutel: string };

interface Antwoorden {
  lengte: string;
  gewicht: string;
  maten: Record<string, string>;
  controle: Record<string, string>;
  silhouet: string;
  pasvorm: Record<string, string>;
}

const LEEG: Antwoorden = { lengte: "", gewicht: "", maten: {}, controle: {}, silhouet: "", pasvorm: {} };

type Stap =
  | { soort: "jij"; titel: string }
  | { soort: "maten"; titel: string; velden: MaatVeld[] }
  | { soort: "silhouet"; titel: string }
  | { soort: "vragen"; titel: string }
  | { soort: "controle"; titel: string };

const STAPPEN: Stap[] = [
  { soort: "jij", titel: "Over jou" },
  ...MAAT_GROEPEN.map((g) => ({
    soort: "maten" as const,
    titel: g.titel,
    velden: g.velden.map((s) => MAAT_VELDEN.find((v) => v.sleutel === s)!),
  })),
  { soort: "silhouet", titel: "Silhouet" },
  { soort: "vragen", titel: "Vragen" },
  { soort: "controle", titel: "Afronden" },
];
const EERSTE_MATEN_STAP = STAPPEN.findIndex((s) => s.soort === "maten");

const getal = (v: string | undefined) => (v ? Number(v) : NaN);

/** Foutmelding voor één maatveld, of null als het in orde is. */
function maatFout(v: MaatVeld, a: Antwoorden): string | null {
  const waarde = getal(a.maten[v.sleutel]);
  if (Number.isNaN(waarde)) return v.verplicht ? "Vul deze maat in." : null;
  const [min, max] =
    v.sleutel === "binnenbeen"
      ? [MAAT_GRENZEN.binnenbeenMin, MAAT_GRENZEN.binnenbeenMax]
      : [MAAT_GRENZEN.omtrekMin, MAAT_GRENZEN.omtrekMax];
  if (waarde < min || waarde > max) return `Deze maat ligt normaal tussen ${min} en ${max} cm. Meet nog eens.`;
  if (v.controle) {
    const tweede = getal(a.controle[v.sleutel]);
    if (Number.isNaN(tweede)) return "Meet nog een keer en vul de tweede meting in.";
    if (Math.abs(waarde - tweede) > MAAT_GRENZEN.controleVerschilMax)
      return `Je twee metingen verschillen meer dan ${MAAT_GRENZEN.controleVerschilMax} cm. Meet nog een keer goed.`;
  }
  return null;
}

/** Foutmelding voor een hele stap, of null als je verder mag. */
function stapFout(stap: Stap, a: Antwoorden): string | null {
  switch (stap.soort) {
    case "jij": {
      const l = getal(a.lengte);
      const g = getal(a.gewicht);
      if (Number.isNaN(l) || Number.isNaN(g)) return "Vul je lengte en gewicht in.";
      if (l < 120 || l > 220) return "Vul je lengte in centimeters in (bijvoorbeeld 168).";
      if (g < 30 || g > 250) return "Vul je gewicht in kilo's in (bijvoorbeeld 65).";
      return null;
    }
    case "maten":
      return stap.velden.some((v) => maatFout(v, a)) ? "Niet alle maten zijn goed ingevuld; zie hierboven." : null;
    case "silhouet":
      return a.silhouet ? null : "Kies het silhouet dat het meest op het jouwe lijkt.";
    case "vragen":
      return PASVORMVRAGEN.some((q) => !a.pasvorm[q.sleutel]) ? "Beantwoord alle vragen." : null;
    case "controle":
      return null;
  }
}

export function TestWizard({ token, klantnaam }: { token: string; klantnaam: string }) {
  const opslagSleutel = `lida-test-${token}`;
  const [a, setA] = useState<Antwoorden>(LEEG);
  const [stap, setStap] = useState(0);
  const [bereikt, setBereikt] = useState(0);
  const [toonFouten, setToonFouten] = useState(false);
  const [hermeting, setHermeting] = useState(false);
  // Pas opslaan nadat de bewaarde voortgang is hersteld, anders overschrijven we die.
  const [hersteld, setHersteld] = useState(false);

  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [melding, setMelding] = useState<string | null>(null);
  const [bevindingen, setBevindingen] = useState<Bevinding[]>([]);
  const [resultaat, setResultaat] = useState<Resultaat | null>(null);
  const kop = useRef<HTMLDivElement>(null);

  // Voortgang bewaren in de browser, zodat je later via dezelfde link verdergaat.
  useEffect(() => {
    try {
      const opgeslagen = localStorage.getItem(opslagSleutel);
      if (opgeslagen) {
        const o = JSON.parse(opgeslagen);
        /* eslint-disable react-hooks/set-state-in-effect -- eenmalig herstellen uit localStorage */
        setA({ ...LEEG, ...o.a });
        setStap(Math.min(o.stap ?? 0, STAPPEN.length - 1));
        setBereikt(Math.min(o.bereikt ?? 0, STAPPEN.length - 1));
        setHermeting(Boolean(o.hermeting));
      }
    } catch {}
    setHersteld(true);
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [opslagSleutel]);

  useEffect(() => {
    if (!hersteld || resultaat) return;
    try {
      localStorage.setItem(opslagSleutel, JSON.stringify({ a, stap, bereikt, hermeting }));
    } catch {}
  }, [opslagSleutel, hersteld, a, stap, bereikt, hermeting, resultaat]);

  function gaNaar(i: number) {
    setFout(null);
    setToonFouten(false);
    setStap(i);
    setBereikt((b) => Math.max(b, i));
    kop.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function volgende() {
    const f = stapFout(STAPPEN[stap], a);
    if (f) {
      setFout(f);
      setToonFouten(true);
      return;
    }
    gaNaar(stap + 1);
  }

  /** Mag de bezoeker via de tabbladen naar stap i springen? */
  function bereikbaar(i: number): boolean {
    if (i > bereikt) return false;
    return STAPPEN.slice(0, i).every((s) => stapFout(s, a) === null);
  }

  async function verstuur() {
    const eersteFout = STAPPEN.findIndex((s) => stapFout(s, a) !== null);
    if (eersteFout !== -1) {
      gaNaar(eersteFout);
      setFout(stapFout(STAPPEN[eersteFout], a));
      setToonFouten(true);
      return;
    }
    setBezig(true);
    setFout(null);
    setMelding(null);
    setBevindingen([]);
    const num = (v: string | undefined) => (v ? Number(v) : undefined);
    const payload = {
      lengte_cm: Number(a.lengte),
      gewicht_kg: Number(a.gewicht),
      maten: Object.fromEntries(MAAT_VELDEN.map((v) => [v.sleutel, num(a.maten[v.sleutel])])),
      controlemetingen: Object.fromEntries(
        MAAT_VELDEN.filter((v) => v.controle).map((v) => [v.sleutel, num(a.controle[v.sleutel])]),
      ),
      gekozen_silhouet: a.silhouet,
      pasvormantwoorden: a.pasvorm,
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
        setFout(d.fout || "Er ging iets mis. Probeer het opnieuw.");
      } else if (d.soort === "opnieuw_meten") {
        setBevindingen(d.bevindingen);
        gaNaar(EERSTE_MATEN_STAP);
      } else if (d.soort === "silhouet_verschil") {
        setHermeting(true);
        gaNaar(EERSTE_MATEN_STAP);
        setMelding(
          "Het silhouet dat je koos past niet helemaal bij je maten. Loop je maten nog één keer na (en eventueel je silhouetkeuze) en rond daarna opnieuw af.",
        );
      } else {
        try {
          localStorage.removeItem(opslagSleutel);
        } catch {}
        setResultaat(d);
      }
    } catch {
      setFout("Kon de test niet versturen. Controleer je internetverbinding en probeer het opnieuw.");
    }
    setBezig(false);
  }

  if (resultaat) {
    return (
      <main className="mx-auto flex w-full max-w-lg flex-1 flex-col justify-center gap-4 p-8 text-center">
        <p className="text-4xl" aria-hidden>
          🎉
        </p>
        <h1 className="text-2xl font-semibold tracking-tight">Klaar, {klantnaam}!</h1>
        <p className="text-black/60 dark:text-white/60">
          Op basis van je antwoorden is jouw type <strong>{resultaat.sleutel}</strong>. Je persoonlijke
          advies kun je hieronder downloaden; we sturen het ook naar je e-mail.
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

  const huidig = STAPPEN[stap];
  const zet = (veld: "maten" | "controle", sleutel: string, w: string) =>
    setA((s) => ({ ...s, [veld]: { ...s[veld], [sleutel]: w } }));

  return (
    <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-8 sm:px-8">
      <div ref={kop} className="scroll-mt-4">
        <p className="text-sm text-black/50 dark:text-white/50">Hoi {klantnaam}, welkom bij je kledingadviestest.</p>
        <Voortgang stap={stap} bereikbaar={bereikbaar} gaNaar={gaNaar} />
      </div>

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (huidig.soort === "controle") verstuur();
          else volgende();
        }}
      >
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-black/40 dark:text-white/40">
            Stap {stap + 1} van {STAPPEN.length}
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{huidig.titel}</h1>
        </div>

        {melding && (
          <p className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
            {melding}
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

        {huidig.soort === "jij" && (
          <div className="grid items-center gap-6 sm:grid-cols-[140px_1fr]">
            <Lichaam meet="lengte" titel="Lengte meten" className="mx-auto h-56 sm:h-64" />
            <div className="flex flex-col gap-4">
              <p className="text-sm text-black/60 dark:text-white/60">
                We beginnen eenvoudig. Met je lengte en gewicht bepalen we je categorie. Meet je lengte
                zonder schoenen, met je rug tegen een muur.
              </p>
              <Invoer
                label="Lengte"
                eenheid="cm"
                voorbeeld="bijv. 168"
                waarde={a.lengte}
                zet={(w) => setA((s) => ({ ...s, lengte: w }))}
                fout={toonFouten && Number.isNaN(getal(a.lengte)) ? "Vul je lengte in." : null}
              />
              <Invoer
                label="Gewicht"
                eenheid="kg"
                voorbeeld="bijv. 65"
                waarde={a.gewicht}
                zet={(w) => setA((s) => ({ ...s, gewicht: w }))}
                fout={toonFouten && Number.isNaN(getal(a.gewicht)) ? "Vul je gewicht in." : null}
              />
            </div>
          </div>
        )}

        {huidig.soort === "maten" && (
          <div className="flex flex-col gap-5">
            {stap === EERSTE_MATEN_STAP && (
              <p className="rounded-lg bg-black/5 px-4 py-3 text-sm text-black/70 dark:bg-white/10 dark:text-white/70">
                💡 {MEET_TIP}
              </p>
            )}
            {huidig.velden.map((v) => (
              <MaatKaart
                key={v.sleutel}
                veld={v}
                waarde={a.maten[v.sleutel] ?? ""}
                controle={a.controle[v.sleutel] ?? ""}
                zetWaarde={(w) => zet("maten", v.sleutel, w)}
                zetControle={(w) => zet("controle", v.sleutel, w)}
                fout={toonFouten ? maatFout(v, a) : null}
              />
            ))}
          </div>
        )}

        {huidig.soort === "silhouet" && (
          <fieldset>
            <legend className="mb-3 text-sm text-black/60 dark:text-white/60">
              Ga voor de spiegel staan. Welk silhouet lijkt het meest op het jouwe? Twijfel je, kies dan
              wat het dichtst in de buurt komt.
            </legend>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {SILHOUETTEN.map((s) => {
                const gekozen = a.silhouet === s.letter;
                return (
                  <label
                    key={s.letter}
                    className={`flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 p-3 text-center text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                      gekozen
                        ? "border-accent bg-accent-zacht"
                        : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
                    }`}
                  >
                    <input
                      type="radio"
                      name="silhouet"
                      value={s.letter}
                      checked={gekozen}
                      onChange={() => setA((x) => ({ ...x, silhouet: s.letter }))}
                      className="sr-only"
                    />
                    <Lichaam vorm={s.vorm} armen={false} titel={s.naam} className="h-40" />
                    <strong>{s.naam}</strong>
                    <span className="text-xs text-black/50 dark:text-white/50">{s.omschrijving}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        )}

        {huidig.soort === "vragen" && (
          <div className="flex flex-col gap-6">
            {PASVORMVRAGEN.map((q) => (
              <fieldset key={q.sleutel}>
                <legend className="mb-2 text-sm font-medium">{q.vraag}</legend>
                <div className="flex flex-wrap gap-2">
                  {q.opties.map((optie) => {
                    const gekozen = a.pasvorm[q.sleutel] === optie;
                    return (
                      <label
                        key={optie}
                        className={`cursor-pointer rounded-full border-2 px-4 py-2 text-sm transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent ${
                          gekozen
                            ? "border-accent bg-accent-zacht"
                            : "border-black/10 hover:border-black/30 dark:border-white/15 dark:hover:border-white/40"
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.sleutel}
                          value={optie}
                          checked={gekozen}
                          onChange={() => setA((s) => ({ ...s, pasvorm: { ...s.pasvorm, [q.sleutel]: optie } }))}
                          className="sr-only"
                        />
                        {optie}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {huidig.soort === "controle" && <Overzicht a={a} gaNaar={gaNaar} />}

        {fout && (
          <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
            {fout}
          </p>
        )}

        <div className="flex items-center justify-between gap-3 border-t border-black/10 pt-5 dark:border-white/10">
          <button
            type="button"
            onClick={() => gaNaar(stap - 1)}
            disabled={stap === 0 || bezig}
            className="rounded-full border border-black/15 px-5 py-3 text-sm disabled:invisible dark:border-white/20"
          >
            ← Terug
          </button>
          <button
            type="submit"
            disabled={bezig}
            className="rounded-full bg-foreground px-7 py-3 text-sm font-medium text-background hover:opacity-90 disabled:opacity-50"
          >
            {huidig.soort === "controle"
              ? bezig
                ? "Even geduld, je advies wordt gemaakt…"
                : "Test afronden"
              : `Volgende: ${STAPPEN[stap + 1].titel} →`}
          </button>
        </div>
      </form>
    </main>
  );
}

function Voortgang({
  stap,
  bereikbaar,
  gaNaar,
}: {
  stap: number;
  bereikbaar: (i: number) => boolean;
  gaNaar: (i: number) => void;
}) {
  const actiefRef = useRef<HTMLLIElement>(null);
  useEffect(() => {
    actiefRef.current?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [stap]);

  return (
    <nav aria-label="Voortgang" className="mt-4">
      <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
        <div
          className="h-full rounded-full bg-accent transition-[width] duration-500"
          style={{ width: `${((stap + 1) / STAPPEN.length) * 100}%` }}
        />
      </div>
      <ol className="mt-3 flex items-center gap-0.5 overflow-x-auto [scrollbar-width:none]">
        {STAPPEN.map((s, i) => {
          const klaar = i < stap;
          const actief = i === stap;
          return (
            <li key={s.titel} ref={actief ? actiefRef : undefined} className="shrink-0">
              <button
                type="button"
                onClick={() => gaNaar(i)}
                disabled={!bereikbaar(i) || actief}
                aria-current={actief ? "step" : undefined}
                aria-label={`Stap ${i + 1}: ${s.titel}`}
                title={s.titel}
                className={`flex items-center gap-2 rounded-full px-2 py-1.5 text-xs ${
                  actief
                    ? "bg-foreground px-3 font-medium text-background"
                    : bereikbaar(i)
                      ? "text-black/70 hover:bg-black/5 dark:text-white/70 dark:hover:bg-white/10"
                      : "text-black/30 dark:text-white/30"
                }`}
              >
                <span
                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] ${
                    actief
                      ? "bg-background text-foreground"
                      : klaar
                        ? "bg-accent text-background"
                        : "border border-current"
                  }`}
                >
                  {klaar ? "✓" : i + 1}
                </span>
                {actief && <span>{s.titel}</span>}
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

function MaatKaart({
  veld,
  waarde,
  controle,
  zetWaarde,
  zetControle,
  fout,
}: {
  veld: MaatVeld;
  waarde: string;
  controle: string;
  zetWaarde: (w: string) => void;
  zetControle: (w: string) => void;
  fout: string | null;
}) {
  const label = veld.label.replace(" (optioneel)", "");
  const beideIngevuld = veld.controle && waarde !== "" && controle !== "";
  const komtOvereen =
    beideIngevuld && Math.abs(Number(waarde) - Number(controle)) <= MAAT_GRENZEN.controleVerschilMax;

  return (
    <section
      className={`grid gap-4 rounded-2xl border p-4 sm:grid-cols-[130px_1fr] sm:p-5 ${
        fout ? "border-red-300 dark:border-red-800" : "border-black/10 dark:border-white/15"
      }`}
    >
      <Lichaam meet={veld.sleutel} titel={`Zo meet je je ${label.toLowerCase()}`} className="mx-auto h-40 sm:h-56" />
      <div className="flex flex-col gap-3">
        <h2 className="font-semibold">
          {label}
          {!veld.verplicht && (
            <span className="ml-2 text-xs font-normal text-black/40 dark:text-white/40">optioneel</span>
          )}
        </h2>
        <p className="text-sm leading-relaxed text-black/60 dark:text-white/60">{veld.instructie}</p>
        <div className="grid grid-cols-2 gap-3">
          <Invoer label={veld.controle ? "1e meting" : "Meting"} eenheid="cm" waarde={waarde} zet={zetWaarde} />
          {veld.controle && <Invoer label="2e meting (controle)" eenheid="cm" waarde={controle} zet={zetControle} />}
        </div>
        {fout ? (
          <p className="text-sm text-red-600 dark:text-red-400">{fout}</p>
        ) : beideIngevuld ? (
          <p className={`text-sm ${komtOvereen ? "text-emerald-700 dark:text-emerald-400" : "text-amber-700 dark:text-amber-300"}`}>
            {komtOvereen ? "✓ Je metingen komen overeen." : "Je metingen verschillen te veel. Meet nog een keer."}
          </p>
        ) : veld.controle ? (
          <p className="text-xs text-black/40 dark:text-white/40">Meet twee keer, zo weten we zeker dat de maat klopt.</p>
        ) : null}
      </div>
    </section>
  );
}

function Overzicht({ a, gaNaar }: { a: Antwoorden; gaNaar: (i: number) => void }) {
  const stapVan = (sleutel: string) =>
    STAPPEN.findIndex((s) => s.soort === "maten" && s.velden.some((v) => v.sleutel === sleutel));
  const silhouet = SILHOUETTEN.find((s) => s.letter === a.silhouet);
  const n = (v: string | undefined) => Number(v);
  const meldingen = logischeChecks({
    borst: n(a.maten.borst),
    taille: n(a.maten.taille),
    hogeHeup: n(a.maten.hoge_heup),
    heup: n(a.maten.heup),
  });

  const rijen: { label: string; waarde: string; stap: number }[] = [
    { label: "Lengte", waarde: `${a.lengte} cm`, stap: 0 },
    { label: "Gewicht", waarde: `${a.gewicht} kg`, stap: 0 },
    ...MAAT_VELDEN.map((v) => ({
      label: v.label.replace(" (optioneel)", ""),
      waarde: a.maten[v.sleutel] ? `${a.maten[v.sleutel]} cm` : "—",
      stap: stapVan(v.sleutel),
    })),
    { label: "Silhouet", waarde: silhouet?.naam ?? "—", stap: STAPPEN.findIndex((s) => s.soort === "silhouet") },
    ...PASVORMVRAGEN.map((q) => ({
      label: q.vraag,
      waarde: a.pasvorm[q.sleutel] ?? "—",
      stap: STAPPEN.findIndex((s) => s.soort === "vragen"),
    })),
  ];

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-black/60 dark:text-white/60">
        Bijna klaar! Kijk je antwoorden nog even na. Klopt alles, klik dan op <strong>Test afronden</strong>.
        Je krijgt direct je type en je persoonlijke advies.
      </p>
      {meldingen.map((m) => (
        <p
          key={m.code}
          className="rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800 dark:bg-amber-950/40 dark:text-amber-200"
        >
          {m.bericht}
        </p>
      ))}
      <dl className="divide-y divide-black/10 rounded-2xl border border-black/10 dark:divide-white/10 dark:border-white/15">
        {rijen.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-2.5 text-sm">
            <dt className="text-black/60 dark:text-white/60">{r.label}</dt>
            <dd className="flex items-center gap-3 text-right font-medium">
              {r.waarde}
              <button
                type="button"
                onClick={() => gaNaar(r.stap)}
                className="text-xs font-normal text-accent underline underline-offset-2"
              >
                wijzig
              </button>
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Invoer({
  label,
  eenheid,
  voorbeeld,
  waarde,
  zet,
  fout,
}: {
  label: string;
  eenheid: string;
  voorbeeld?: string;
  waarde: string;
  zet: (w: string) => void;
  fout?: string | null;
}) {
  return (
    <label className="flex flex-col gap-1 text-sm">
      <span className="text-black/70 dark:text-white/70">{label}</span>
      <span
        className={`flex items-center rounded-lg border focus-within:border-black/50 dark:focus-within:border-white/60 ${
          fout ? "border-red-400" : "border-black/15 dark:border-white/20"
        }`}
      >
        <input
          inputMode="decimal"
          placeholder={voorbeeld}
          value={waarde}
          onChange={(e) => zet(e.target.value.replace(",", ".").replace(/[^0-9.]/g, ""))}
          className="w-full min-w-0 bg-transparent px-3 py-2.5 text-base outline-none placeholder:text-black/30 dark:placeholder:text-white/30"
        />
        <span className="pr-3 text-black/40 dark:text-white/40">{eenheid}</span>
      </span>
      {fout && <span className="text-xs text-red-600 dark:text-red-400">{fout}</span>}
    </label>
  );
}
