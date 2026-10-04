"use client";

import { useRouter } from "next/navigation";
import { useState, type ChangeEvent } from "react";
import { Melding } from "../Melding";
import { controleerImport, voerImportUit, type ImportVoorbeeld } from "./acties";
import { heelZacht, hoofdknop } from "./stijl";

const MAX_BYTES = 800_000;

/** Leest het bestand als UTF-8, of als Windows-1252 (zoals Excel een ‘CSV’ vaak opslaat). */
async function leesTekst(bestand: File): Promise<string> {
  const buffer = await bestand.arrayBuffer();
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder("windows-1252").decode(buffer);
  }
}

/** CSV-import: eerst controleren (voorbeeld), dan importeren. */
export function ImportDoorverwijzingen() {
  const router = useRouter();
  const [tekst, setTekst] = useState<string | null>(null);
  const [voorbeeld, setVoorbeeld] = useState<ImportVoorbeeld | null>(null);
  const [fout, setFout] = useState<string | null>(null);
  const [klaar, setKlaar] = useState<string | null>(null);
  const [bezig, setBezig] = useState(false);

  async function kies(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    setTekst(null);
    setVoorbeeld(null);
    setFout(null);
    setKlaar(null);
    if (!f) return;
    if (f.size > MAX_BYTES) {
      setFout("Het bestand is te groot (maximaal 800 kB).");
      return;
    }
    setBezig(true);
    try {
      const t = await leesTekst(f);
      const r = await controleerImport(t);
      if (!r.ok) setFout(r.fout);
      else {
        setTekst(t);
        setVoorbeeld(r.voorbeeld);
      }
    } catch (err) {
      setFout(`Het bestand kon niet gelezen worden: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(false);
    }
  }

  async function importeer() {
    if (!tekst) return;
    setBezig(true);
    setFout(null);
    try {
      const r = await voerImportUit(tekst);
      if (!r.ok) setFout(r.fout);
      else {
        const v = r.voorbeeld;
        setKlaar(`Import klaar: ${v.nieuw} nieuw, ${v.bijgewerkt} bijgewerkt, ${v.ongewijzigd} ongewijzigd${v.ongeldig.length ? `, ${v.ongeldig.length} overgeslagen` : ""}.`);
        setTekst(null);
        setVoorbeeld(null);
        router.refresh();
      }
    } catch (err) {
      setFout(`Importeren mislukt: ${err instanceof Error ? err.message : String(err)}`);
    } finally {
      setBezig(false);
    }
  }

  const teDoen = voorbeeld ? voorbeeld.nieuw + voorbeeld.bijgewerkt : 0;

  return (
    <div className="flex flex-col gap-3 text-sm">
      <p className={heelZacht}>
        Kolommen <code>van</code>, <code>naar</code> en <code>permanent</code> (ja/nee; leeg = ja), met ; of , als scheidingsteken. Een bestaand oud
        adres wordt bijgewerkt.
      </p>
      <input type="file" accept=".csv,.txt,text/csv,text/plain" onChange={kies} disabled={bezig} className="min-w-0 text-sm" />
      {bezig && <p className={heelZacht}>Bezig…</p>}
      {fout && <Melding soort="fout">{fout}</Melding>}
      {klaar && <Melding soort="ok">{klaar}</Melding>}
      {voorbeeld && (
        <>
          <p>
            {voorbeeld.nieuw} nieuw · {voorbeeld.bijgewerkt} bijgewerkt · {voorbeeld.ongewijzigd} ongewijzigd · {voorbeeld.ongeldig.length} ongeldig
            {voorbeeld.dubbel ? ` · ${voorbeeld.dubbel} dubbel in het bestand (de laatste telt)` : ""}
          </p>
          {voorbeeld.voorbeeld.length > 0 && (
            <ul className="flex flex-col gap-1 font-mono text-xs">
              {voorbeeld.voorbeeld.map((r) => (
                <li key={r.van} className="break-all">
                  {r.van} → {r.naar} {r.permanent ? "" : "(tijdelijk)"}
                </li>
              ))}
              {teDoen > voorbeeld.voorbeeld.length && <li>… en nog {teDoen - voorbeeld.voorbeeld.length}</li>}
            </ul>
          )}
          {voorbeeld.ongeldig.length > 0 && (
            <details>
              <summary className="cursor-pointer">Ongeldige rijen bekijken ({voorbeeld.ongeldig.length})</summary>
              <ul className="mt-2 flex flex-col gap-1 text-xs">
                {voorbeeld.ongeldig.slice(0, 100).map((o) => (
                  <li key={`${o.regel}-${o.reden}`}>
                    Regel {o.regel}: {o.reden}
                  </li>
                ))}
              </ul>
            </details>
          )}
          <div>
            <button type="button" onClick={importeer} disabled={bezig || teDoen === 0} className={hoofdknop}>
              {teDoen ? `Importeren (${teDoen})` : "Niets te importeren"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
