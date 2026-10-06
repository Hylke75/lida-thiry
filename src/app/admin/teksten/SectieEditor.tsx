"use client";

import { useEffect, useState, useTransition } from "react";
import { Opmaak } from "@/components/Opmaak";
import { MediaKiezer } from "@/components/admin/MediaKiezer";
import { bevatPlaceholder, nieuweId, type EnkelVeld, type LijstVeld, type Sectie } from "@/lib/inhoud/schema";
import { Geschiedenis } from "../versies/Geschiedenis";
import { zetTekstVersieTerug } from "../versies/acties";
import { slaSectieOp, zetSectieTerug } from "./acties";

type Item = Record<string, string>;
type Waarden = Record<string, string | Item[]>;

const invoerKlasse =
  "w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 text-sm outline-none focus:border-accent dark:border-white/20";
const knopKlein =
  "rounded-full border border-black/15 px-2.5 py-1 text-xs hover:bg-black/5 disabled:opacity-30 dark:border-white/20 dark:hover:bg-white/5";

function EnkelInvoer({
  id,
  veld,
  waarde,
  onChange,
}: {
  id: string;
  veld: EnkelVeld;
  waarde: string;
  onChange: (w: string) => void;
}) {
  const [voorbeeld, setVoorbeeld] = useState(false);
  if (veld.soort === "tekst") {
    return <input id={id} value={waarde} onChange={(e) => onChange(e.target.value)} className={invoerKlasse} />;
  }
  if (veld.soort === "afbeelding") {
    // Adres uit de mediabibliotheek (kiezen of uploaden) of een eigen https-adres.
    return (
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="url"
          inputMode="url"
          value={waarde}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
          className={invoerKlasse}
        />
        <MediaKiezer
          onKies={({ url }) => onChange(url)}
          accept="foto"
          knopTekst="Kies of upload"
          knopKlasse={`${knopKlein} shrink-0 self-start sm:self-auto`}
        />
        {waarde && (
          <button type="button" onClick={() => onChange("")} className={`${knopKlein} shrink-0 self-start sm:self-auto`}>
            Weghalen
          </button>
        )}
      </div>
    );
  }
  const vak = (
    <textarea
      id={id}
      value={waarde}
      onChange={(e) => onChange(e.target.value)}
      rows={veld.regels ?? (veld.soort === "opmaak" ? 8 : 3)}
      className={`${invoerKlasse} leading-relaxed ${veld.soort === "opmaak" ? "font-mono text-[13px]" : ""}`}
    />
  );
  if (veld.soort === "tekstvak") return vak;
  return (
    <div className="flex flex-col gap-1.5">
      {voorbeeld ? (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-black/15 p-4 text-sm leading-relaxed dark:border-white/20 [&_a]:text-accent [&_a]:underline [&_h2]:text-lg [&_h2]:font-semibold [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
          <Opmaak tekst={waarde} />
        </div>
      ) : (
        vak
      )}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-black/50 dark:text-white/50">
        <span>
          Opmaak: <code>## Kop</code> · <code>- opsomming</code> · <code>**vet**</code> ·{" "}
          <code>[tekst](https://…)</code> · lege regel = nieuwe alinea
        </span>
        <button type="button" onClick={() => setVoorbeeld((v) => !v)} className={knopKlein}>
          {voorbeeld ? "Bewerken" : "Voorbeeld"}
        </button>
      </div>
    </div>
  );
}

function LijstInvoer({
  id,
  veld,
  items,
  onChange,
}: {
  id: string;
  veld: LijstVeld;
  items: Item[];
  onChange: (items: Item[]) => void;
}) {
  const max = veld.max ?? 50;
  const naam = veld.itemNaam.charAt(0).toUpperCase() + veld.itemNaam.slice(1);
  const wijzig = (i: number, sleutel: string, w: string) =>
    onChange(items.map((item, j) => (j === i ? { ...item, [sleutel]: w } : item)));
  const verplaats = (i: number, richting: -1 | 1) => {
    const nieuw = [...items];
    [nieuw[i], nieuw[i + richting]] = [nieuw[i + richting], nieuw[i]];
    onChange(nieuw);
  };
  const voegToe = () => {
    const leeg: Item = { _id: nieuweId() };
    for (const k of Object.keys(veld.velden)) leeg[k] = "";
    onChange([...items, leeg]);
  };

  return (
    <div className="flex flex-col gap-3">
      {items.length === 0 && (
        <p className="rounded-lg border border-dashed border-black/15 px-4 py-3 text-sm text-black/50 dark:border-white/20 dark:text-white/50">
          Nog geen {veld.itemNaam}. Zolang de lijst leeg is, wordt dit onderdeel niet getoond.
        </p>
      )}
      {items.map((item, i) => (
        <fieldset
          key={item._id}
          className="flex flex-col gap-3 rounded-xl border border-black/10 p-4 dark:border-white/15"
        >
          <div className="flex items-center justify-between gap-2">
            <legend className="text-xs font-medium uppercase tracking-wide text-black/50 dark:text-white/50">
              {naam} {i + 1}
            </legend>
            <div className="flex gap-1">
              <button type="button" onClick={() => verplaats(i, -1)} disabled={i === 0} className={knopKlein} aria-label={`${naam} ${i + 1} omhoog`}>
                ↑
              </button>
              <button
                type="button"
                onClick={() => verplaats(i, 1)}
                disabled={i === items.length - 1}
                className={knopKlein}
                aria-label={`${naam} ${i + 1} omlaag`}
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => onChange(items.filter((_, j) => j !== i))}
                disabled={items.length <= (veld.min ?? 0)}
                className={`${knopKlein} text-red-700 dark:text-red-300`}
              >
                Verwijderen
              </button>
            </div>
          </div>
          {Object.entries(veld.velden).map(([sleutel, def]) => {
            const veldId = `${id}-${item._id}-${sleutel}`;
            return (
              <div key={sleutel} className="flex flex-col gap-1">
                <label htmlFor={veldId} className="text-xs font-medium text-black/70 dark:text-white/70">
                  {def.label}
                </label>
                <EnkelInvoer id={veldId} veld={def} waarde={item[sleutel] ?? ""} onChange={(w) => wijzig(i, sleutel, w)} />
                {def.uitleg && <p className="text-xs text-black/50 dark:text-white/50">{def.uitleg}</p>}
              </div>
            );
          })}
        </fieldset>
      ))}
      {items.length < max && (
        <div>
          <button type="button" onClick={voegToe} className="rounded-full border border-accent/40 px-4 py-1.5 text-sm text-accent hover:bg-accent-zacht">
            + {naam} toevoegen
          </button>
        </div>
      )}
    </div>
  );
}

/** Bewerkt de teksten van één sectie; slaat op zonder de pagina te verlaten. */
export function SectieEditor({
  sectie,
  beginWaarden,
  beginAangepast,
}: {
  sectie: Sectie;
  beginWaarden: Waarden;
  beginAangepast: boolean;
}) {
  const [waarden, setWaarden] = useState<Waarden>(beginWaarden);
  const [aangepast, setAangepast] = useState(beginAangepast);
  const [gewijzigd, setGewijzigd] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string[] } | null>(null);
  const [bezig, start] = useTransition();
  const anker = sectie.sleutel.replace(/\./g, "-");

  useEffect(() => {
    if (!gewijzigd) return;
    const waarschuw = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", waarschuw);
    return () => window.removeEventListener("beforeunload", waarschuw);
  }, [gewijzigd]);

  const zet = (sleutel: string, w: string | Item[]) => {
    setWaarden((oud) => ({ ...oud, [sleutel]: w }));
    setGewijzigd(true);
    setMelding(null);
  };

  const verwerk = (r: Awaited<ReturnType<typeof slaSectieOp>>) => {
    if (r.ok) {
      setWaarden(r.waarden as Waarden);
      setAangepast(r.aangepast);
      setGewijzigd(false);
      setMelding({ soort: "ok", tekst: [r.bericht] });
    } else {
      setMelding({ soort: "fout", tekst: r.fouten });
    }
  };

  const opslaan = () => start(async () => verwerk(await slaSectieOp(sectie.sleutel, waarden)));

  /** Zet een versie uit de geschiedenis terug; null = gelukt, anders de foutmeldingen. */
  async function versieTerugzetten(versieId: string): Promise<string[] | null> {
    const r = await zetTekstVersieTerug(versieId);
    if (!r.ok) return r.fouten;
    verwerk(r);
    return null;
  }
  const terugzetten = () => {
    if (!confirm("De standaardtekst terugzetten? Je eigen tekst voor dit onderdeel gaat dan verloren.")) return;
    start(async () => verwerk(await zetSectieTerug(sectie.sleutel)));
  };

  return (
    <section id={anker} className="scroll-mt-6 rounded-2xl border border-black/10 bg-kaart p-5 dark:border-white/15">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          opslaan();
        }}
        className="flex flex-col gap-5"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <h2 className="text-lg font-semibold">{sectie.titel}</h2>
            {sectie.uitleg && <p className="text-sm text-black/60 dark:text-white/60">{sectie.uitleg}</p>}
          </div>
          <div className="flex flex-wrap gap-1.5 text-xs">
            {bevatPlaceholder(waarden) && (
              <span className="rounded-full bg-amber-100 px-2.5 py-1 text-amber-900 dark:bg-amber-950/50 dark:text-amber-200">
                Nog aan te vullen
              </span>
            )}
            <span
              className={`rounded-full px-2.5 py-1 ${
                aangepast
                  ? "bg-accent-zacht text-accent"
                  : "bg-black/5 text-black/60 dark:bg-white/10 dark:text-white/60"
              }`}
            >
              {aangepast ? "Eigen tekst" : "Standaardtekst"}
            </span>
          </div>
        </div>

        {sectie.variabelen && (
          <div className="rounded-lg bg-black/[0.03] px-4 py-3 text-xs leading-relaxed text-black/60 dark:bg-white/5 dark:text-white/60">
            <p className="font-medium">Invulwaarden die je in deze teksten kunt gebruiken:</p>
            <ul className="mt-1">
              {Object.entries(sectie.variabelen).map(([naam, uitleg]) => (
                <li key={naam}>
                  <code className="text-accent">{`{${naam}}`}</code> — {uitleg}
                </li>
              ))}
            </ul>
          </div>
        )}

        {Object.entries(sectie.velden).map(([sleutel, veld]) => {
          const id = `${anker}-${sleutel}`;
          return (
            <div key={sleutel} className="flex flex-col gap-1.5">
              <label htmlFor={veld.soort === "lijst" ? undefined : id} className="text-sm font-medium">
                {veld.label}
              </label>
              {veld.uitleg && <p className="text-xs text-black/50 dark:text-white/50">{veld.uitleg}</p>}
              {veld.soort === "lijst" ? (
                <LijstInvoer
                  id={id}
                  veld={veld}
                  items={(waarden[sleutel] as Item[]) ?? []}
                  onChange={(items) => zet(sleutel, items)}
                />
              ) : (
                <EnkelInvoer
                  id={id}
                  veld={veld}
                  waarde={(waarden[sleutel] as string) ?? ""}
                  onChange={(w) => zet(sleutel, w)}
                />
              )}
            </div>
          );
        })}

        {melding && (
          <div
            role={melding.soort === "fout" ? "alert" : "status"}
            className={`rounded-lg px-4 py-3 text-sm ${
              melding.soort === "ok"
                ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300"
                : "bg-red-50 text-red-800 dark:bg-red-950/40 dark:text-red-300"
            }`}
          >
            {melding.tekst.map((t) => (
              <p key={t}>{t}</p>
            ))}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <button
            disabled={bezig || !gewijzigd}
            className="rounded-full bg-accent px-6 py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:opacity-40"
          >
            {bezig ? "Bezig…" : "Opslaan"}
          </button>
          {gewijzigd && <span className="text-xs text-black/50 dark:text-white/50">Niet opgeslagen wijzigingen</span>}
          <Geschiedenis
            soort="tekst"
            refId={sectie.sleutel}
            onTerugzetten={versieTerugzetten}
            gewijzigd={gewijzigd}
            knopKlasse="text-xs text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50"
          />
          {aangepast && (
            <button
              type="button"
              onClick={terugzetten}
              disabled={bezig}
              className="ml-auto text-xs text-black/50 underline underline-offset-4 hover:text-black/80 dark:text-white/50"
            >
              Standaardtekst terugzetten
            </button>
          )}
        </div>
      </form>
    </section>
  );
}
