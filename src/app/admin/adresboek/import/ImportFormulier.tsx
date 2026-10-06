"use client";

import Link from "next/link";
import { useState, type ChangeEvent } from "react";
import { analyseerRelatieImport, MAX_IMPORT_BYTES, MAX_IMPORT_RIJEN, type RelatieImportAnalyse, type RelatieImportRij } from "@/lib/relaties/csv";
import { volledigeNaam } from "@/lib/relaties/regels";
import { Melding } from "../../Melding";
import { controleerRelatieImport, voerRelatieImportUit } from "../acties";
import { PAD } from "../ui";
import { invoer, kaart, knop, tekstZacht } from "@/components/admin/stijl";

/** Zoveel rijen per aanroep naar de server (houdt elk verzoek klein). */
const DEEL = 1000;

interface Telling {
  nieuw: number;
  bijgewerkt: number;
  ongewijzigd: number;
}

/** Leest het bestand als UTF-8, of als Windows-1252 (zoals Excel een ‘CSV’ vaak opslaat). */
async function leesTekst(bestand: File): Promise<string> {
  const buffer = await bestand.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** Voert een serveractie uit per deel van DEEL rijen en telt de uitkomsten op. */
async function perDeel(
  rijen: RelatieImportRij[],
  actie: (deel: unknown, tag?: string) => Promise<{ ok: true; telling: Telling } | { ok: false; fout: string }>,
  tag: string,
  voortgang?: (klaar: number) => void,
): Promise<Telling> {
  const som: Telling = { nieuw: 0, bijgewerkt: 0, ongewijzigd: 0 };
  for (let i = 0; i < rijen.length; i += DEEL) {
    const deel = rijen.slice(i, i + DEEL).map(({ gegevens, tags }) => ({ gegevens, tags }));
    const r = await actie(deel, tag || undefined);
    if (!r.ok) throw new Error(r.fout);
    som.nieuw += r.telling.nieuw;
    som.bijgewerkt += r.telling.bijgewerkt;
    som.ongewijzigd += r.telling.ongewijzigd;
    voortgang?.(Math.min(rijen.length, i + DEEL));
  }
  return som;
}

function Getal({ getal, label, nadruk }: { getal: number; label: string; nadruk?: "goed" | "let op" }) {
  const kleur =
    nadruk === "goed" ? "text-emerald-700 dark:text-emerald-300" : nadruk === "let op" && getal > 0 ? "text-red-700 dark:text-red-300" : "";
  return (
    <div className="flex flex-col rounded-lg border border-black/10 bg-kaart px-3 py-2 dark:border-white/15">
      <span className={`text-xl font-semibold tabular-nums ${kleur}`}>{getal}</span>
      <span className={`text-xs ${tekstZacht}`}>{label}</span>
    </div>
  );
}

export function ImportFormulier({ tags }: { tags: string[] }) {
  const [bestand, setBestand] = useState<string | null>(null);
  const [analyse, setAnalyse] = useState<RelatieImportAnalyse | null>(null);
  const [voorbeeld, setVoorbeeld] = useState<Telling | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [tag, setTag] = useState("");
  const [gecontroleerdMetTag, setGecontroleerdMetTag] = useState("");
  const [resultaat, setResultaat] = useState<Telling | null>(null);

  async function controleer(a: RelatieImportAnalyse, metTag: string) {
    setBezig("Controleren…");
    setFout(null);
    try {
      setVoorbeeld(await perDeel(a.rijen, controleerRelatieImport, metTag));
      setGecontroleerdMetTag(metTag);
    } catch (err) {
      setFout(err instanceof Error ? err.message : String(err));
    } finally {
      setBezig(null);
    }
  }

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
    try {
      const a = analyseerRelatieImport(await leesTekst(f));
      setAnalyse(a);
      if (a.geenKoprij) {
        setFout("Geen koprij met een kolom ‘email’ gevonden. Zet de kolomnamen op de eerste regel.");
        return;
      }
      if (a.teVeel) {
        setFout(`Het bestand bevat meer dan ${MAX_IMPORT_RIJEN.toLocaleString("nl-NL")} rijen. Splits het in kleinere bestanden.`);
        return;
      }
      if (!a.rijen.length) {
        setFout("Er staan geen rijen met een geldig e-mailadres in dit bestand.");
        return;
      }
      await controleer(a, tag.trim());
    } catch (err) {
      setFout(`Het bestand kon niet gelezen worden: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  async function importeer() {
    if (!analyse) return;
    setFout(null);
    setBezig("Importeren…");
    try {
      setResultaat(await perDeel(analyse.rijen, voerRelatieImportUit, tag.trim(), (n) => setBezig(`Importeren… ${n} van ${analyse.rijen.length}`)));
    } catch (err) {
      setFout(`Importeren mislukt: ${err instanceof Error ? err.message : String(err)}. Wat al verwerkt was, is bewaard; je kunt het bestand gerust opnieuw importeren.`);
    } finally {
      setBezig(null);
    }
  }

  if (resultaat) {
    return (
      <section className="flex flex-col gap-4">
        <Melding soort="ok">
          Import klaar: {resultaat.nieuw} nieuw, {resultaat.bijgewerkt} aangevuld, {resultaat.ongewijzigd} ongewijzigd.
        </Melding>
        <div className="flex flex-wrap items-center gap-3">
          <Link href={PAD} className={knop}>
            Naar het adresboek
          </Link>
          <button
            type="button"
            onClick={() => {
              setResultaat(null);
              setAnalyse(null);
              setVoorbeeld(null);
              setBestand(null);
            }}
            className="text-sm underline underline-offset-4"
          >
            Nog een bestand importeren
          </button>
        </div>
      </section>
    );
  }

  const klaarVoorImport = Boolean(analyse && voorbeeld && !analyse.teVeel && !analyse.geenKoprij && analyse.rijen.length && !bezig);
  const tagGewijzigd = tag.trim() !== gecontroleerdMetTag;

  return (
    <section className="flex flex-col gap-5">
      <label className="flex flex-col gap-2 rounded-xl border border-dashed border-black/20 bg-kaart p-5 text-sm dark:border-white/25">
        <span className="font-medium">CSV-bestand kiezen</span>
        <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={kies} className="min-w-0 text-sm" />
        {bestand && <span className={tekstZacht}>{bestand}</span>}
      </label>

      {bezig && <p className={`text-sm ${tekstZacht}`}>{bezig}</p>}
      {fout && <Melding soort="fout">{fout}</Melding>}

      {analyse && !analyse.teVeel && !analyse.geenKoprij && analyse.rijen.length > 0 && (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <Getal getal={voorbeeld?.nieuw ?? 0} label="nieuw" nadruk="goed" />
            <Getal getal={voorbeeld?.bijgewerkt ?? 0} label="bijgewerkt (lege velden aangevuld)" />
            <Getal getal={voorbeeld?.ongewijzigd ?? 0} label="bestaat al, niets nieuws" />
            <Getal getal={analyse.ongeldig.length} label="ongeldig" nadruk="let op" />
            <Getal getal={analyse.dubbel} label="dubbel in bestand" />
          </div>

          <div className="flex flex-col gap-2">
            <p className={`text-xs ${tekstZacht}`}>
              Voorbeeld van de eerste {Math.min(10, analyse.rijen.length)} van {analyse.rijen.length} geldige rijen
            </p>
            <ul className="flex flex-col divide-y divide-black/5 rounded-lg border border-black/10 bg-kaart text-sm dark:divide-white/10 dark:border-white/15">
              {analyse.rijen.slice(0, 10).map((r) => {
                const g = r.gegevens;
                return (
                  <li key={g.email} className="flex flex-col gap-0.5 px-3 py-2">
                    <span className="flex flex-wrap items-baseline gap-x-2">
                      <span className={`text-xs tabular-nums ${tekstZacht}`}>regel {r.regel}</span>
                      <span className="font-medium">{volledigeNaam({ voornaam: g.voornaam ?? null, achternaam: g.achternaam ?? null }) || "(geen naam)"}</span>
                      <span className={`break-all ${tekstZacht}`}>{g.email}</span>
                    </span>
                    <span className={`text-xs ${tekstZacht}`}>
                      {[g.telefoon, g.bedrijf, g.straat, [g.postcode, g.plaats].filter(Boolean).join(" "), g.land, r.tags.length ? `tags: ${r.tags.join(", ")}` : ""]
                        .filter(Boolean)
                        .join(" · ") || "geen verdere gegevens"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>

          {analyse.ongeldig.length > 0 && (
            <details className="text-sm">
              <summary className={`cursor-pointer ${tekstZacht}`}>Ongeldige rijen bekijken ({analyse.ongeldig.length})</summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {analyse.ongeldig.slice(0, 100).map((o) => (
                  <li key={o.regel} className="break-all">
                    Regel {o.regel}: {o.reden}
                    {o.waarde ? ` (“${o.waarde}”)` : ""}
                  </li>
                ))}
                {analyse.ongeldig.length > 100 && <li>… en nog {analyse.ongeldig.length - 100}</li>}
              </ul>
            </details>
          )}

          <div className={kaart}>
            <label className="flex flex-col gap-1 text-sm">
              <span className="text-black/70 dark:text-white/70">Tag voor iedereen in dit bestand (optioneel)</span>
              <input
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                onBlur={() => analyse && tagGewijzigd && controleer(analyse, tag.trim())}
                list="adresboek-import-tags"
                placeholder="bijv. beurs-2026"
                className={invoer}
              />
              <datalist id="adresboek-import-tags">
                {tags.map((t) => (
                  <option key={t} value={t} />
                ))}
              </datalist>
            </label>
            <div>
              <button type="button" disabled={!klaarVoorImport} onClick={importeer} className={knop}>
                {bezig ? "Bezig…" : `Importeren (${analyse.rijen.length} rijen)`}
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
