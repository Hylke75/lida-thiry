"use client";

import { useCallback, useEffect, useId, useMemo, useState, type FormEvent, type ReactNode } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { AFSPRAKEN_BOEKEN } from "@/lib/inhoud/groepen/afspraken";
import { bedragLabel, duurLabel, MAX, valideerBoeking, type BoekVeld } from "@/lib/afspraken/regels";
import { datumPlusDagen, kalenderdatumLabel, weekdagVan } from "@/lib/afspraken/tijd";
import type { Dag, Tijdslot } from "@/lib/afspraken/slots";

export type AfspraakBoekenTeksten = SectieWaarden<typeof AFSPRAKEN_BOEKEN>;

/** Wat een bezoeker van een soort afspraak te zien krijgt. */
export interface PubliekeSoort {
  id: string;
  naam: string;
  omschrijving: string;
  duur_minuten: number;
  prijs_cent: number;
  aanbetaling_cent: number;
  locatie: string;
  online: boolean;
}

const MAANDEN = ["januari", "februari", "maart", "april", "mei", "juni", "juli", "augustus", "september", "oktober", "november", "december"];
const DAGKOPPEN = ["ma", "di", "wo", "do", "vr", "za", "zo"];
const VELD_VOLGORDE: readonly BoekVeld[] = ["naam", "email", "telefoon", "opmerking", "privacy"];

const invoerStijl = (fout: boolean) =>
  `w-full rounded-lg border bg-kaart px-3 py-2 outline-none focus:ring-2 ${
    fout
      ? "border-red-400 focus:border-red-500 focus:ring-red-500/20 dark:border-red-500"
      : "border-foreground/15 focus:border-accent focus:ring-accent/20"
  }`;

function Stap({ nummer, titel, children }: { nummer: number; titel: string; children: ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h3 className="flex items-center gap-3 text-lg font-semibold">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent text-sm text-background" aria-hidden="true">
          {nummer}
        </span>
        {titel}
      </h3>
      {children}
    </section>
  );
}

/** Maandkalender met de dagen waarop iets vrij is. */
function Kalender({
  dagen,
  gekozen,
  kies,
}: {
  dagen: readonly Dag[];
  gekozen: string | null;
  kies: (datum: string) => void;
}) {
  const vrij = useMemo(() => new Set(dagen.map((d) => d.datum)), [dagen]);
  const maanden = useMemo(() => [...new Set(dagen.map((d) => d.datum.slice(0, 7)))], [dagen]);
  const [index, setIndex] = useState(() => Math.max(0, gekozen ? maanden.indexOf(gekozen.slice(0, 7)) : 0));
  const maand = maanden[Math.min(index, maanden.length - 1)];
  if (!maand) return null;
  const [jaar, mnd] = maand.split("-").map(Number);
  const eerste = `${maand}-01`;
  const aantal = new Date(Date.UTC(jaar, mnd, 0)).getUTCDate();
  const leeg = weekdagVan(eerste) - 1;
  const cellen: (string | null)[] = [...Array<null>(leeg).fill(null), ...Array.from({ length: aantal }, (_, i) => datumPlusDagen(eerste, i))];

  return (
    <div className="w-full max-w-sm rounded-2xl border border-foreground/10 bg-kaart p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={() => setIndex((i) => Math.max(0, i - 1))}
          disabled={index === 0}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-25"
          aria-label="Vorige maand"
        >
          ‹
        </button>
        <p className="font-medium" aria-live="polite">
          {MAANDEN[mnd - 1]} {jaar}
        </p>
        <button
          type="button"
          onClick={() => setIndex((i) => Math.min(maanden.length - 1, i + 1))}
          disabled={index >= maanden.length - 1}
          className="rounded-full px-3 py-1 text-lg disabled:opacity-25"
          aria-label="Volgende maand"
        >
          ›
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center text-sm" role="grid">
        {DAGKOPPEN.map((d) => (
          <span key={d} className="pb-1 text-xs text-foreground/50" role="columnheader">
            {d}
          </span>
        ))}
        {cellen.map((datum, i) => {
          if (!datum) return <span key={`leeg-${i}`} />;
          const dag = Number(datum.slice(8));
          const beschikbaar = vrij.has(datum);
          const actief = datum === gekozen;
          return (
            <button
              key={datum}
              type="button"
              disabled={!beschikbaar}
              onClick={() => kies(datum)}
              aria-pressed={actief}
              aria-label={`${kalenderdatumLabel(datum)}${beschikbaar ? "" : " (niet beschikbaar)"}`}
              className={`aspect-square rounded-full text-sm tabular-nums transition-colors ${
                actief
                  ? "bg-accent font-semibold text-background"
                  : beschikbaar
                    ? "bg-accent-zacht font-medium text-foreground hover:bg-accent/20"
                    : "text-foreground/30"
              }`}
            >
              {dag}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Het boekingsformulier: soort → dag → tijd → gegevens → bevestigen. Gebruikt op
 * /afspraak en als blok {afspraak} op een pagina. Met een aanbetaling gaat de
 * bezoeker daarna naar de betaalpagina van Mollie.
 */
export function AfspraakBoeken({
  teksten,
  privacy,
  soorten,
}: {
  teksten: AfspraakBoekenTeksten;
  privacy: ReactNode;
  soorten: readonly PubliekeSoort[];
}) {
  const id = useId();
  const [soortId, setSoortId] = useState<string | null>(soorten.length === 1 ? soorten[0].id : null);
  const [dagen, setDagen] = useState<Dag[] | null>(null);
  const [laden, setLaden] = useState(false);
  const [laadFout, setLaadFout] = useState<string | null>(null);
  const [datum, setDatum] = useState<string | null>(null);
  const [tijd, setTijd] = useState<Tijdslot | null>(null);
  const [velden, setVelden] = useState<Partial<Record<BoekVeld, string>>>({});
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [klaar, setKlaar] = useState<{ status: string; token?: string } | null>(null);

  const soort = soorten.find((s) => s.id === soortId) ?? null;
  const tijden = dagen?.find((d) => d.datum === datum)?.tijden ?? [];

  const laadTijden = useCallback(async (sid: string) => {
    setLaden(true);
    setLaadFout(null);
    try {
      const res = await fetch(`/api/afspraak/tijden?soort=${encodeURIComponent(sid)}`, { cache: "no-store" });
      const data = (await res.json().catch(() => ({}))) as { dagen?: Dag[]; fout?: string };
      if (!res.ok || !data.dagen) throw new Error(data.fout || "laden mislukt");
      setDagen(data.dagen);
      return data.dagen;
    } catch (e) {
      setDagen(null);
      setLaadFout(e instanceof Error && e.message !== "laden mislukt" ? e.message : teksten.fout);
      return null;
    } finally {
      setLaden(false);
    }
  }, [teksten.fout]);

  useEffect(() => {
    if (!soortId) return;
    let actief = true;
    // Bij een andere soort: keuze wissen en de tijden (opnieuw) laden.
    void (async () => {
      const d = await laadTijden(soortId);
      if (!actief) return;
      if (d && d.length) setDatum((huidig) => (huidig && d.some((x) => x.datum === huidig) ? huidig : null));
    })();
    return () => {
      actief = false;
    };
  }, [soortId, laadTijden]);

  function kiesSoort(sid: string) {
    if (sid === soortId) return;
    setDagen(null);
    setDatum(null);
    setTijd(null);
    setFout(null);
    setSoortId(sid);
  }

  const veldId = (v: BoekVeld) => `${id}-${v}`;
  const foutId = (v: BoekVeld) => `${id}-${v}-fout`;

  async function verstuur(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!soort || !tijd) return;
    const f = new FormData(e.currentTarget);
    const gegevens = {
      soort: soort.id,
      start: tijd.start,
      naam: String(f.get("naam") || ""),
      email: String(f.get("email") || ""),
      telefoon: String(f.get("telefoon") || ""),
      opmerking: String(f.get("opmerking") || ""),
      privacy: f.get("privacy") === "on",
    };
    setFout(null);
    const controle = valideerBoeking(gegevens);
    if (!controle.ok) {
      setVelden(controle.fouten);
      const eerste = VELD_VOLGORDE.find((v) => controle.fouten[v]);
      if (eerste) document.getElementById(veldId(eerste))?.focus();
      return;
    }
    setVelden({});
    setBezig(true);
    try {
      const res = await fetch("/api/afspraak", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...gegevens, website: String(f.get("website") || "") }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        fout?: string;
        velden?: Partial<Record<BoekVeld, string>>;
        bezet?: boolean;
        checkoutUrl?: string;
        token?: string;
        status?: string;
      };
      if (res.ok && data.checkoutUrl) {
        window.location.assign(data.checkoutUrl);
        return;
      }
      if (res.ok) {
        setKlaar({ status: data.status ?? "bevestigd", token: data.token });
        return;
      }
      if (data.bezet) {
        setTijd(null);
        setFout(data.fout ?? teksten.bezet);
        await laadTijden(soort.id);
      } else if (data.velden && Object.keys(data.velden).length) {
        setVelden(data.velden);
      } else {
        setFout(data.fout ?? teksten.fout);
      }
    } catch {
      setFout(teksten.fout);
    }
    setBezig(false);
  }

  if (!soorten.length) {
    return (
      <div className="flex flex-col gap-3">
        {teksten.titel && <h2 className="text-3xl font-semibold tracking-tight">{teksten.titel}</h2>}
        <p className="text-foreground/70">{teksten.geen_soorten}</p>
      </div>
    );
  }

  if (klaar) {
    return (
      <div role="status" className="flex flex-col gap-2 rounded-2xl bg-accent-zacht px-5 py-5 text-foreground/80">
        <p className="text-lg font-medium">{teksten.succes_titel}</p>
        <p>{klaar.status === "aangevraagd" ? teksten.succes_aanvraag : teksten.succes}</p>
        {soort && tijd && (
          <p className="font-medium">
            {soort.naam} · {kalenderdatumLabel(datum ?? "")} om {tijd.label}
          </p>
        )}
        {klaar.token && (
          <a href={`/afspraak/${klaar.token}`} className="w-fit text-sm text-accent underline underline-offset-4">
            Bekijk je afspraak
          </a>
        )}
      </div>
    );
  }

  const veldFout = (v: BoekVeld) =>
    velden[v] ? (
      <span id={foutId(v)} className="text-sm text-red-700 dark:text-red-300">
        {velden[v]}
      </span>
    ) : null;
  const aria = (v: BoekVeld) => ({
    id: veldId(v),
    "aria-invalid": velden[v] ? true : undefined,
    "aria-describedby": velden[v] ? foutId(v) : undefined,
  });
  const ster = (
    <span className="text-accent" aria-hidden="true">
      {" "}
      *
    </span>
  );

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-8">
      <header className="flex flex-col gap-2">
        {teksten.titel && <h2 className="text-3xl font-semibold tracking-tight">{teksten.titel}</h2>}
        {teksten.intro && <p className="text-foreground/70">{teksten.intro}</p>}
      </header>

      {soorten.length > 1 && (
        <Stap nummer={1} titel={teksten.stap_soort}>
          <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={teksten.stap_soort}>
            {soorten.map((s) => {
              const actief = s.id === soortId;
              return (
                <button
                  key={s.id}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  onClick={() => kiesSoort(s.id)}
                  className={`flex flex-col gap-1 rounded-2xl border p-4 text-left transition-colors ${
                    actief ? "border-accent bg-accent-zacht" : "border-foreground/10 bg-kaart hover:border-accent/50"
                  }`}
                >
                  <span className="font-semibold">{s.naam}</span>
                  <span className="text-sm text-foreground/60">
                    {duurLabel(s.duur_minuten)}
                    {s.prijs_cent > 0 ? ` · ${bedragLabel(s.prijs_cent)}` : ""}
                    {s.online ? " · online" : s.locatie ? ` · ${s.locatie}` : ""}
                  </span>
                  {s.omschrijving && <span className="text-sm whitespace-pre-line text-foreground/70">{s.omschrijving}</span>}
                </button>
              );
            })}
          </div>
        </Stap>
      )}
      {soorten.length === 1 && soort && (
        <div className="flex flex-col gap-1 rounded-2xl border border-foreground/10 bg-kaart p-4">
          <span className="font-semibold">{soort.naam}</span>
          <span className="text-sm text-foreground/60">
            {duurLabel(soort.duur_minuten)}
            {soort.prijs_cent > 0 ? ` · ${bedragLabel(soort.prijs_cent)}` : ""}
            {soort.online ? " · online" : soort.locatie ? ` · ${soort.locatie}` : ""}
          </span>
          {soort.omschrijving && <span className="text-sm whitespace-pre-line text-foreground/70">{soort.omschrijving}</span>}
        </div>
      )}

      {soort && (
        <Stap nummer={soorten.length > 1 ? 2 : 1} titel={teksten.stap_datum}>
          {laden && !dagen ? (
            <p className="text-sm text-foreground/60" role="status">
              Beschikbare dagen laden…
            </p>
          ) : laadFout ? (
            <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
              {laadFout}
            </p>
          ) : dagen && dagen.length === 0 ? (
            <p className="text-foreground/70">{teksten.geen_tijden}</p>
          ) : dagen ? (
            <Kalender
              key={soort.id}
              dagen={dagen}
              gekozen={datum}
              kies={(d) => {
                setDatum(d);
                setTijd(null);
                setFout(null);
              }}
            />
          ) : null}
        </Stap>
      )}

      {soort && datum && tijden.length > 0 && (
        <Stap nummer={soorten.length > 1 ? 3 : 2} titel={teksten.stap_tijd}>
          <p className="text-sm text-foreground/60 first-letter:uppercase">{kalenderdatumLabel(datum)}</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5" role="radiogroup" aria-label={teksten.stap_tijd}>
            {tijden.map((t) => {
              const actief = tijd?.start === t.start;
              return (
                <button
                  key={t.start}
                  type="button"
                  role="radio"
                  aria-checked={actief}
                  onClick={() => {
                    setTijd(t);
                    setFout(null);
                  }}
                  className={`rounded-full border px-3 py-2 text-sm tabular-nums transition-colors ${
                    actief ? "border-accent bg-accent font-semibold text-background" : "border-foreground/15 bg-kaart hover:border-accent"
                  }`}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        </Stap>
      )}

      {fout && !tijd && (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
          {fout}
        </p>
      )}

      {soort && datum && tijd && (
        <Stap nummer={soorten.length > 1 ? 4 : 3} titel={teksten.stap_gegevens}>
          <p className="rounded-xl bg-accent-zacht px-4 py-3 text-sm">
            <strong>{soort.naam}</strong> op <span className="first-letter:lowercase">{kalenderdatumLabel(datum)}</span> om{" "}
            <strong>{tijd.label}</strong> ({duurLabel(soort.duur_minuten)})
          </p>
          <form onSubmit={verstuur} noValidate className="flex flex-col gap-4">
            <input
              type="text"
              name="website"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] h-px w-px overflow-hidden opacity-0"
            />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor={veldId("naam")} className="text-foreground/70">
                  Naam{ster}
                </label>
                <input name="naam" autoComplete="name" required maxLength={MAX.naam} className={invoerStijl(!!velden.naam)} {...aria("naam")} />
                {veldFout("naam")}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor={veldId("email")} className="text-foreground/70">
                  E-mailadres{ster}
                </label>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  maxLength={MAX.email}
                  className={invoerStijl(!!velden.email)}
                  {...aria("email")}
                />
                {veldFout("email")}
              </div>
              <div className="flex flex-col gap-1 text-sm">
                <label htmlFor={veldId("telefoon")} className="text-foreground/70">
                  Telefoonnummer (optioneel)
                </label>
                <input
                  name="telefoon"
                  type="tel"
                  autoComplete="tel"
                  maxLength={MAX.telefoon}
                  className={invoerStijl(!!velden.telefoon)}
                  {...aria("telefoon")}
                />
                {veldFout("telefoon")}
              </div>
            </div>
            <div className="flex flex-col gap-1 text-sm">
              <label htmlFor={veldId("opmerking")} className="text-foreground/70">
                {teksten.opmerking_label}
              </label>
              <textarea
                name="opmerking"
                rows={4}
                maxLength={MAX.opmerking}
                className={`${invoerStijl(!!velden.opmerking)} resize-y`}
                {...aria("opmerking")}
              />
              {veldFout("opmerking")}
            </div>
            <div className="flex flex-col gap-1 text-sm">
              {/* De privacytekst bevat een link en alinea's; daarom geen <label> eromheen maar aria-labelledby. */}
              <div className="flex items-start gap-3 text-foreground/80">
                <input
                  type="checkbox"
                  name="privacy"
                  className="mt-1 h-4 w-4 shrink-0 accent-accent"
                  aria-labelledby={`${id}-privacy-tekst`}
                  {...aria("privacy")}
                />
                <div id={`${id}-privacy-tekst`} className="[&_a]:text-accent [&_a]:underline">
                  {privacy}
                </div>
              </div>
              {veldFout("privacy")}
            </div>
            {soort.aanbetaling_cent > 0 && (
              <p className="text-sm text-foreground/70">
                {teksten.aanbetaling_uitleg.replace(/\{bedrag\}/g, bedragLabel(soort.aanbetaling_cent))}
              </p>
            )}
            {fout && (
              <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {fout}
              </p>
            )}
            <button
              disabled={bezig}
              className="w-fit rounded-full bg-accent px-7 py-3 text-sm font-medium text-background shadow-sm transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {bezig ? "Bezig…" : soort.aanbetaling_cent > 0 ? teksten.knop_betalen : teksten.knop}
            </button>
          </form>
        </Stap>
      )}
    </div>
  );
}
