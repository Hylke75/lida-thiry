"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { analyseerImport, MAX_IMPORT_BYTES, MAX_IMPORT_RIJEN, type ImportAnalyse } from "@/lib/nieuwsbrief/csv";
import { STATUS_LABEL } from "@/lib/nieuwsbrief/doelgroep";
import type { ImportResultaat, ImportVoorbeeld } from "@/lib/nieuwsbrief/beheer";
import { controleerImport, voerImportUit } from "../acties";
import { Melding } from "../../../AdminNav";
import { hoofdknop, invoer } from "../stijl";

/** Leest het bestand als UTF-8, of als Windows-1252 (zoals Excel een ‘CSV’ vaak opslaat). */
async function leesTekst(bestand: File): Promise<string> {
  const buffer = await bestand.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

function Telling({ getal, label, nadruk }: { getal: number; label: string; nadruk?: "goed" | "let op" }) {
  const kleur =
    nadruk === "goed"
      ? "text-emerald-700 dark:text-emerald-300"
      : nadruk === "let op" && getal > 0
        ? "text-red-700 dark:text-red-300"
        : "";
  return (
    <div className="flex flex-col rounded-lg border border-black/10 bg-kaart px-3 py-2 dark:border-white/15">
      <span className={`text-xl font-semibold tabular-nums ${kleur}`}>{getal}</span>
      <span className="text-xs text-black/60 dark:text-white/60">{label}</span>
    </div>
  );
}

export function ImportFormulier({ tags }: { tags: string[] }) {
  const [bestand, setBestand] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<ImportAnalyse | null>(null);
  const [voorbeeld, setVoorbeeld] = useState<ImportVoorbeeld | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);
  const [toestemming, setToestemming] = useState(false);
  const [tag, setTag] = useState("");
  const [resultaat, setResultaat] = useState<ImportResultaat | null>(null);

  async function kies(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setAnalyse(null);
    setVoorbeeld(null);
    setResultaat(null);
    setFout(null);
    setBestand(f?.name ?? null);
    if (!f) return;
    if (f.size > MAX_IMPORT_BYTES) {
      setFout(`Het bestand is te groot (maximaal ${MAX_IMPORT_BYTES / 1024 / 1024} MB). Splits het in kleinere bestanden.`);
      return;
    }
    setBezig(true);
    try {
      const a = analyseerImport(await leesTekst(f));
      setAnalyse(a);
      if (a.teVeel) {
        setFout(`Het bestand bevat meer dan ${MAX_IMPORT_RIJEN.toLocaleString("nl-NL")} rijen. Splits het in kleinere bestanden.`);
        return;
      }
      if (!a.rijen.length) {
        setFout("Er staan geen geldige e-mailadressen in dit bestand.");
        return;
      }
      const r = await controleerImport(a.rijen.map((x) => x.email));
      if (r.ok) setVoorbeeld(r.voorbeeld);
      else setFout(r.fout);
    } catch (err) {
      setFout(`Het bestand kon niet gelezen worden: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(false);
    }
  }

  async function importeer() {
    if (!analyse || !toestemming) return;
    setBezig(true);
    setFout(null);
    try {
      const r = await voerImportUit({
        rijen: analyse.rijen.map(({ regel, email, naam, tags: t }) => ({ regel, email, naam, tags: t })),
        tag: tag.trim() || undefined,
        toestemming,
      });
      if (r.ok) setResultaat(r.resultaat);
      else setFout(r.fout);
    } catch (err) {
      setFout(`Importeren mislukt: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(false);
    }
  }

  if (resultaat) {
    return (
      <section className="flex flex-col gap-4">
        <Melding soort="ok">
          Import klaar: {resultaat.toegevoegd} nieuw aangemeld, {resultaat.bijgewerkt} bestaande bijgewerkt
          {resultaat.overgeslagen.length ? `, ${resultaat.overgeslagen.length} overgeslagen` : ""}.
        </Melding>
        {resultaat.overgeslagen.length > 0 && <Overgeslagen lijst={resultaat.overgeslagen} />}
        <div className="flex gap-3">
          <Link href="/admin/nieuwsbrief/contacten" className={hoofdknop}>
            Naar de contacten
          </Link>
          <button
            type="button"
            onClick={() => {
              setResultaat(null);
              setAnalyse(null);
              setVoorbeeld(null);
              setBestand(null);
              setToestemming(false);
            }}
            className="text-sm underline underline-offset-4"
          >
            Nog een bestand importeren
          </button>
        </div>
      </section>
    );
  }

  const kanImporteren = Boolean(analyse && voorbeeld && !analyse.teVeel && analyse.rijen.length && toestemming && !bezig);

  return (
    <section className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 rounded-xl border border-dashed border-black/20 bg-kaart p-5 text-sm dark:border-white/20">
        <span className="font-medium">CSV-bestand kiezen</span>
        <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={kies} className="text-sm" />
        {bestand && <span className="text-black/50 dark:text-white/50">{bestand}</span>}
      </label>

      {bezig && <p className="text-sm text-black/50 dark:text-white/50">Bezig…</p>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      {analyse && !analyse.teVeel && analyse.rijen.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Telling getal={voorbeeld?.nieuw ?? 0} label="nieuw" nadruk="goed" />
            <Telling getal={voorbeeld?.bestaand ?? 0} label="bestaat al (tags worden aangevuld)" />
            <Telling getal={voorbeeld?.geblokkeerd.length ?? 0} label="overgeslagen (afgemeld e.d.)" nadruk="let op" />
            <Telling getal={analyse.ongeldig.length} label="ongeldig" nadruk="let op" />
            <Telling getal={analyse.dubbel} label="dubbel in bestand" />
          </div>

          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-left text-sm">
              <caption className="px-3 py-2 text-left text-xs text-black/50 dark:text-white/50">
                Voorbeeld van de eerste {Math.min(10, analyse.rijen.length)} van {analyse.rijen.length} geldige rijen
                {analyse.heeftKoprij ? " (koprij herkend)" : " (geen koprij: eerste kolom met @ is het e-mailadres)"}
              </caption>
              <thead className="bg-black/5 text-xs uppercase tracking-wide text-black/50 dark:bg-white/5 dark:text-white/50">
                <tr>
                  <th className="px-3 py-2 font-medium">Regel</th>
                  <th className="px-3 py-2 font-medium">E-mail</th>
                  <th className="px-3 py-2 font-medium">Naam</th>
                  <th className="px-3 py-2 font-medium">Tags</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {analyse.rijen.slice(0, 10).map((r) => (
                  <tr key={r.email}>
                    <td className="px-3 py-1.5 tabular-nums text-black/50 dark:text-white/50">{r.regel}</td>
                    <td className="px-3 py-1.5">{r.email}</td>
                    <td className="px-3 py-1.5">{r.naam ?? ""}</td>
                    <td className="px-3 py-1.5">{r.tags.join(", ")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {analyse.ongeldig.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-black/60 dark:text-white/60">
                Ongeldige rijen bekijken ({analyse.ongeldig.length})
              </summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {analyse.ongeldig.slice(0, 100).map((o) => (
                  <li key={o.regel}>
                    Regel {o.regel}: {o.reden}
                    {o.waarde ? ` (“${o.waarde}”)` : ""}
                  </li>
                ))}
                {analyse.ongeldig.length > 100 && <li>… en nog {analyse.ongeldig.length - 100}</li>}
              </ul>
            </details>
          )}
          {voorbeeld && voorbeeld.geblokkeerd.length > 0 && <Overgeslagen lijst={voorbeeld.geblokkeerd} />}

          <div className="flex flex-col gap-3 rounded-xl border border-black/10 bg-kaart p-5 dark:border-white/15">
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-black/70 dark:text-white/70">Tag voor iedereen in dit bestand (optioneel)</span>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                list="import-tags"
                placeholder="bijv. beurs-2026"
                className={invoer}
              />
              <datalist id="import-tags">
                {tags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <label className="flex items-start gap-2 text-sm">
              <input
                type="checkbox"
                checked={toestemming}
                onChange={(e) => setToestemming(e.target.checked)}
                className="mt-1 accent-accent"
              />
              <span>
                Iedereen in dit bestand heeft toestemming gegeven om de nieuwsbrief te ontvangen.{" "}
                <span className="text-black/50 dark:text-white/50">
                  Dit wordt met je naam en de datum bij elk contact vastgelegd.
                </span>
              </span>
            </label>
            <div>
              <button type="button" disabled={!kanImporteren} onClick={importeer} className={hoofdknop}>
                {bezig ? "Bezig…" : `Importeren (${voorbeeld ? voorbeeld.nieuw + voorbeeld.bestaand : analyse.rijen.length} adressen)`}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

function Overgeslagen({ lijst }: { lijst: ImportVoorbeeld["geblokkeerd"] }) {
  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-black/60 dark:text-white/60">
        Overgeslagen adressen bekijken ({lijst.length})
      </summary>
      <ul className="mt-2 flex flex-col gap-1 text-xs">
        {lijst.slice(0, 200).map((o) => (
          <li key={o.email}>
            {o.email} — {STATUS_LABEL[o.status]}
          </li>
        ))}
        {lijst.length > 200 && <li>… en nog {lijst.length - 200}</li>}
      </ul>
    </details>
  );
}
