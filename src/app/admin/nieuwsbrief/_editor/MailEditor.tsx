"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { controleerVoorVerzenden, valideerBlokken, VARIABELEN } from "@/lib/nieuwsbrief/blokken";
import { normaliseerDoelgroep } from "@/lib/nieuwsbrief/doelgroep";
import { TRIGGER_LABEL, TRIGGERS, beschrijfMoment, type Trigger } from "@/lib/nieuwsbrief/sjablonen";
import { AB_PERCENTAGE, AB_WACHTUREN, testgroepGrootte, type AbInstelling } from "@/lib/nieuwsbrief/ab-test";
import { BlokEditor } from "./BlokEditor";
import { DoelgroepKiezer } from "./DoelgroepKiezer";
import { Voorbeeld } from "./Voorbeeld";
import { slaMailOp, stuurTest, telOntvangers } from "./acties";
import { LIMIETEN, type MailInhoud, type TypeKeuze } from "./regels";
import { invoerKlasse, kaart, knopHoofd, knopRand, zacht } from "./stijl";

/** Wat een zijpaneel (verzenden of aan/uit) van de editor moet weten. */
export interface EditorStaat {
  gewijzigd: boolean;
  bezig: boolean;
  /** Wat er nog ontbreekt om te verzenden (op basis van de huidige inhoud). */
  problemen: string[];
  /** Aantal ontvangers in de doelgroep (alleen campagnes), null tijdens tellen. */
  aantal: number | null;
  actief: boolean;
  zetActief: (a: boolean) => void;
}

function Melding({ soort, tekst }: { soort: "ok" | "fout"; tekst: string[] }) {
  return (
    <div
      role={soort === "fout" ? "alert" : "status"}
      className={`rounded-lg px-4 py-3 text-sm ${
        soort === "ok"
          ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
          : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
      }`}
    >
      {tekst.map((t) => (
        <p key={t}>{t}</p>
      ))}
    </div>
  );
}

const PERCENTAGES = [10, 20, 30, 40, 50].filter((p) => p >= AB_PERCENTAGE.min && p <= AB_PERCENTAGE.max);
const WACHTUREN = [1, 2, 4, 8, 12, 24, 48].filter((u) => u >= AB_WACHTUREN.min && u <= AB_WACHTUREN.max);

/** A/B-test van de onderwerpregel: tweede onderwerp, grootte van de testgroep en wachttijd. */
function AbTestVelden({
  ab,
  aantal,
  onChange,
}: {
  ab: AbInstelling | null;
  aantal: number | null;
  onChange: (ab: AbInstelling | null) => void;
}) {
  const perVariant = ab && aantal !== null ? testgroepGrootte(aantal, ab.percentage) : null;
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-black/10 px-4 py-3 dark:border-white/15">
      <label className="flex items-start gap-2 text-sm font-medium">
        <input
          type="checkbox"
          checked={!!ab}
          onChange={(e) =>
            onChange(
              e.target.checked
                ? { onderwerpB: "", percentage: AB_PERCENTAGE.standaard, wachtUren: AB_WACHTUREN.standaard }
                : null,
            )
          }
          className="mt-0.5 accent-accent"
        />
        <span>
          A/B-test met een tweede onderwerp
          <span className={`block text-xs font-normal ${zacht}`}>
            Een deel van de ontvangers krijgt onderwerp A, een even groot deel onderwerp B. Het onderwerp dat vaker wordt
            geopend, gaat daarna naar de rest.
          </span>
        </span>
      </label>
      {ab && (
        <>
          <div className="flex flex-col gap-1">
            <div className="flex items-baseline justify-between gap-2">
              <label htmlFor="onderwerp-b" className="text-sm font-medium">
                Onderwerp B
              </label>
              <Teller waarde={ab.onderwerpB} max={LIMIETEN.onderwerp} />
            </div>
            <input
              id="onderwerp-b"
              value={ab.onderwerpB}
              maxLength={LIMIETEN.onderwerp}
              onChange={(e) => onChange({ ...ab, onderwerpB: e.target.value })}
              className={invoerKlasse}
              placeholder="Een andere formulering om te vergelijken"
            />
          </div>
          <div className="flex flex-wrap gap-4">
            <div className="flex flex-col gap-1">
              <label htmlFor="ab-percentage" className="text-sm font-medium">
                Testgroep
              </label>
              <select
                id="ab-percentage"
                value={ab.percentage}
                onChange={(e) => onChange({ ...ab, percentage: Number(e.target.value) })}
                className={`${invoerKlasse} w-auto`}
              >
                {PERCENTAGES.map((p) => (
                  <option key={p} value={p}>
                    {p}% ({p / 2}% A, {p / 2}% B)
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1">
              <label htmlFor="ab-wachten" className="text-sm font-medium">
                Wachttijd
              </label>
              <select
                id="ab-wachten"
                value={ab.wachtUren}
                onChange={(e) => onChange({ ...ab, wachtUren: Number(e.target.value) })}
                className={`${invoerKlasse} w-auto`}
              >
                {WACHTUREN.map((u) => (
                  <option key={u} value={u}>
                    {u} uur
                  </option>
                ))}
              </select>
            </div>
          </div>
          <p className={`text-xs ${zacht}`}>
            {perVariant === null
              ? ""
              : perVariant < 1
                ? "Te weinig ontvangers voor een test: iedereen krijgt dan onderwerp A. "
                : `Ongeveer ${perVariant.toLocaleString("nl-NL")} ontvangers per onderwerp. `}
            De winnaar wordt gekozen bij de eerste verzendronde nadat de testgroep is verstuurd en de wachttijd voorbij is
            (de verzendronde loopt minstens dagelijks, en ook als je het beheer opent). Je kunt de winnaar ook eerder kiezen
            met &lsquo;Kies winnaar nu&rsquo;. Wie geopend heeft, telt één keer; bij gelijkspel tellen de kliks.
          </p>
        </>
      )}
    </div>
  );
}

function Teller({ waarde, max }: { waarde: string; max: number }) {
  return (
    <span className={`text-xs ${waarde.length > max * 0.9 ? "text-amber-700 dark:text-amber-300" : zacht}`}>
      {waarde.length}/{max}
    </span>
  );
}

/** De editor voor een campagne of automatische mail: velden, blokken, doelgroep, voorbeeld en testmail. */
export function MailEditor({
  id,
  soort,
  beginInhoud,
  beginActief = false,
  alleenLezen,
  afzender,
  tags,
  typen,
  testAdres,
  zijpaneel,
}: {
  id: string;
  soort: "campagne" | "automatisch";
  beginInhoud: MailInhoud;
  beginActief?: boolean;
  alleenLezen: boolean;
  afzender: { naam: string; adres: string | null };
  tags: string[];
  typen: TypeKeuze[];
  testAdres: string;
  zijpaneel?: (s: EditorStaat) => ReactNode;
}) {
  const [inhoud, setInhoud] = useState<MailInhoud>(beginInhoud);
  const [gewijzigd, setGewijzigd] = useState(false);
  const [actief, setActief] = useState(beginActief);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [bezig, start] = useTransition();
  const [testNaar, setTestNaar] = useState(testAdres);
  const [testMelding, setTestMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [testBezig, startTest] = useTransition();
  const [aantal, setAantal] = useState<number | null>(null);
  const [tellen, setTellen] = useState(soort === "campagne");
  const telNr = useRef(0);
  const router = useRouter();

  // Waarschuwen bij weggaan met niet-opgeslagen wijzigingen.
  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  // Aantal ontvangers live tellen (even wachten tot er niet meer geklikt wordt).
  const doelgroepSleutel = JSON.stringify(normaliseerDoelgroep(inhoud.doelgroep));
  useEffect(() => {
    if (soort !== "campagne") return;
    const nr = ++telNr.current;
    const t = setTimeout(async () => {
      setTellen(true);
      const r = await telOntvangers(JSON.parse(doelgroepSleutel));
      if (nr !== telNr.current) return;
      setAantal(r.ok ? r.aantal : null);
      setTellen(false);
    }, 400);
    return () => clearTimeout(t);
  }, [doelgroepSleutel, soort]);

  const problemen = useMemo(() => {
    const { blokken, fouten } = valideerBlokken(inhoud.blokken);
    return [...fouten, ...controleerVoorVerzenden({ onderwerp: inhoud.onderwerp, blokken })];
  }, [inhoud.blokken, inhoud.onderwerp]);

  const zet = (w: Partial<MailInhoud>) => {
    setInhoud((oud) => ({ ...oud, ...w }));
    setGewijzigd(true);
    setMelding(null);
  };

  const opslaan = () =>
    start(async () => {
      const r = await slaMailOp(id, inhoud);
      if (r.ok) {
        // Alleen overnemen wat de server heeft opgeschoond; ids blijven gelijk.
        setInhoud(r.inhoud);
        setActief(r.actief);
        setGewijzigd(false);
        setMelding({ soort: "ok", tekst: [r.bericht] });
        router.refresh();
      } else {
        setMelding({ soort: "fout", tekst: r.fouten });
      }
    });

  const stuurTestmail = () =>
    startTest(async () => {
      setTestMelding(null);
      const r = await stuurTest({ onderwerp: inhoud.onderwerp, preheader: inhoud.preheader, blokken: inhoud.blokken }, testNaar);
      setTestMelding(r.ok ? { soort: "ok", tekst: [r.bericht] } : { soort: "fout", tekst: r.fouten });
    });

  const staat: EditorStaat = { gewijzigd, bezig, problemen, aantal: tellen ? null : aantal, actief, zetActief: setActief };

  return (
    <div className="grid min-w-0 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <div className="flex min-w-0 flex-col gap-6">
        {zijpaneel?.(staat)}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            opslaan();
          }}
          className="flex min-w-0 flex-col gap-6"
        >
          <fieldset disabled={alleenLezen} className="flex min-w-0 flex-col gap-6">
            {alleenLezen && (
              <p className={`rounded-lg bg-black/[0.03] px-4 py-3 text-sm dark:bg-white/5 ${zacht}`}>
                Deze campagne is (of wordt) verzonden. De inhoud kan daarom niet meer worden aangepast. Wil je iets
                vergelijkbaars versturen? Dupliceer de campagne dan in het overzicht.
              </p>
            )}

            <section className={kaart}>
              <h2 className="text-lg font-semibold">Gegevens</h2>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="naam" className="text-sm font-medium">
                    Interne naam
                  </label>
                  <Teller waarde={inhoud.naam} max={LIMIETEN.naam} />
                </div>
                <input id="naam" value={inhoud.naam} maxLength={LIMIETEN.naam} onChange={(e) => zet({ naam: e.target.value })} className={invoerKlasse} />
                <p className={`text-xs ${zacht}`}>Alleen voor jezelf, ontvangers zien deze naam niet.</p>
              </div>
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="onderwerp" className="text-sm font-medium">
                    Onderwerp
                  </label>
                  <Teller waarde={inhoud.onderwerp} max={LIMIETEN.onderwerp} />
                </div>
                <input
                  id="onderwerp"
                  value={inhoud.onderwerp}
                  maxLength={LIMIETEN.onderwerp}
                  onChange={(e) => zet({ onderwerp: e.target.value })}
                  className={invoerKlasse}
                  placeholder="Bijv. Jouw najaarsgarderobe, {voornaam}"
                />
              </div>
              {soort === "campagne" && (
                <AbTestVelden ab={inhoud.ab} aantal={tellen ? null : aantal} onChange={(ab) => zet({ ab })} />
              )}
              <div className="flex flex-col gap-1">
                <div className="flex items-baseline justify-between gap-2">
                  <label htmlFor="preheader" className="text-sm font-medium">
                    Voorvertoningstekst
                  </label>
                  <Teller waarde={inhoud.preheader} max={LIMIETEN.preheader} />
                </div>
                <input
                  id="preheader"
                  value={inhoud.preheader}
                  maxLength={LIMIETEN.preheader}
                  onChange={(e) => zet({ preheader: e.target.value })}
                  className={invoerKlasse}
                />
                <p className={`text-xs ${zacht}`}>Het grijze regeltje dat veel mailprogramma&apos;s naast of onder het onderwerp tonen.</p>
              </div>
              <div className="rounded-lg bg-black/[0.03] px-4 py-3 text-xs leading-relaxed text-black/60 dark:bg-white/5 dark:text-white/60">
                <p className="font-medium">Persoonlijke invulwaarden (in onderwerp, voorvertoning, koppen en teksten):</p>
                <ul className="mt-1">
                  {Object.entries(VARIABELEN).map(([naam, uitleg]) => (
                    <li key={naam}>
                      <code className="text-accent">{`{${naam}}`}</code> — {uitleg}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className={kaart}>
              <h2 className="text-lg font-semibold">Inhoud</h2>
              <BlokEditor blokken={inhoud.blokken} onChange={(blokken) => zet({ blokken })} />
            </section>

            {soort === "campagne" ? (
              <section className={kaart}>
                <h2 className="text-lg font-semibold">Ontvangers</h2>
                <DoelgroepKiezer
                  doelgroep={inhoud.doelgroep}
                  onChange={(doelgroep) => zet({ doelgroep })}
                  tags={tags}
                  typen={typen}
                  aantal={aantal}
                  tellen={tellen}
                />
              </section>
            ) : (
              <section className={kaart}>
                <h2 className="text-lg font-semibold">Wanneer versturen</h2>
                <div className="flex flex-col gap-1">
                  <label htmlFor="trigger" className="text-sm font-medium">
                    Startmoment
                  </label>
                  <select
                    id="trigger"
                    value={inhoud.trigger ?? ""}
                    onChange={(e) => zet({ trigger: (e.target.value || null) as Trigger | null })}
                    className={invoerKlasse}
                  >
                    {!inhoud.trigger && <option value="">— kies —</option>}
                    {TRIGGERS.map((t) => (
                      <option key={t} value={t}>
                        {TRIGGER_LABEL[t]}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex flex-col gap-1">
                  <label htmlFor="vertraging" className="text-sm font-medium">
                    Aantal dagen wachten
                  </label>
                  <input
                    id="vertraging"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    max={365}
                    value={inhoud.vertraging_dagen}
                    onChange={(e) => zet({ vertraging_dagen: Math.min(365, Math.max(0, Math.floor(Number(e.target.value) || 0))) })}
                    className={`${invoerKlasse} max-w-32`}
                  />
                  <p className={`text-xs ${zacht}`}>0 = zo snel mogelijk. {beschrijfMoment(inhoud.trigger, inhoud.vertraging_dagen)}.</p>
                </div>
                <p className={`rounded-lg bg-black/[0.03] px-4 py-3 text-xs leading-relaxed dark:bg-white/5 ${zacht}`}>
                  Deze mail gaat naar iedereen die aangemeld is voor de nieuwsbrief; je kunt hier geen doelgroep kiezen.
                  Iedereen krijgt hem maar één keer. Contacten die zich lang vóór het aanzetten aanmeldden (of hun advies
                  kregen) krijgen hem niet alsnog.
                </p>
              </section>
            )}
          </fieldset>

          {!alleenLezen && (
            <div className="sticky bottom-0 z-10 -mx-1 flex flex-col gap-3 rounded-2xl border border-black/10 bg-background/95 p-3 shadow-sm backdrop-blur dark:border-white/15">
              {melding && <Melding soort={melding.soort} tekst={melding.tekst} />}
              <div className="flex flex-wrap items-center gap-3">
                <button disabled={bezig || !gewijzigd} className={knopHoofd}>
                  {bezig ? "Bezig…" : "Opslaan"}
                </button>
                <span className={`text-xs ${zacht}`}>{gewijzigd ? "Niet opgeslagen wijzigingen" : "Alles is opgeslagen"}</span>
              </div>
            </div>
          )}
        </form>

        <section className={kaart}>
          <h2 className="text-lg font-semibold">Testmail versturen</h2>
          <p className={`text-sm ${zacht}`}>
            Stuur de huidige versie (ook als die nog niet is opgeslagen) naar jezelf om te zien hoe hij in je mailprogramma
            aankomt. In de testmail wordt niets gemeten.
          </p>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              stuurTestmail();
            }}
            className="flex flex-col gap-2 sm:flex-row"
          >
            <label htmlFor="testnaar" className="sr-only">
              E-mailadres voor de test
            </label>
            <input
              id="testnaar"
              type="email"
              required
              value={testNaar}
              onChange={(e) => setTestNaar(e.target.value)}
              className={invoerKlasse}
              placeholder="jij@voorbeeld.nl"
            />
            <button disabled={testBezig} className={`${knopRand} shrink-0`}>
              {testBezig ? "Versturen…" : "Testmail sturen"}
            </button>
          </form>
          {testMelding && <Melding soort={testMelding.soort} tekst={testMelding.tekst} />}
        </section>
      </div>

      <div className="min-w-0 lg:sticky lg:top-4">
        <section className={kaart}>
          <Voorbeeld onderwerp={inhoud.onderwerp} preheader={inhoud.preheader} blokken={inhoud.blokken} afzender={afzender} />
        </section>
      </div>
    </div>
  );
}
