"use client";

import { useState } from "react";
import { controleerBackup, isGzip, leesbareGrootte, type BackupControle as Controle } from "@/lib/backup/formaat";
import { Melding } from "../Melding";
import { huidigeTellingen } from "./acties";
import { TIJDZONE } from "@/lib/datum";

/** Leest het bestand (gzip of gewone JSON) in de browser; er wordt niets geüpload. */
async function leesBestand(bestand: File): Promise<unknown> {
  const begin = new Uint8Array(await bestand.slice(0, 2).arrayBuffer());
  const tekst = isGzip(begin)
    ? await new Response(
        bestand.stream().pipeThrough(new DecompressionStream("gzip") as unknown as TransformStream<Uint8Array, Uint8Array>),
      ).text()
    : await bestand.text();
  return JSON.parse(tekst);
}

/**
 * "Back-up controleren": leest een back-upbestand in de browser, controleert de
 * opbouw en zet de aantallen naast die in de database van nu. Zet niets terug.
 */
export function BackupControle() {
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [uitkomst, setUitkomst] = useState<{ controle: Controle; nu: Record<string, number | null> | null } | null>(
    null,
  );

  const kies = async (bestand: File | undefined) => {
    setFout(null);
    setUitkomst(null);
    if (!bestand) return;
    setBezig(true);
    try {
      let data: unknown;
      try {
        data = await leesBestand(bestand);
      } catch {
        setFout("Dit bestand is niet te lezen: geen (gzip-)JSON, of het is beschadigd of onvolledig.");
        return;
      }
      const controle = controleerBackup(data);
      const nu = controle.ok ? await huidigeTellingen().catch(() => null) : null;
      setUitkomst({ controle, nu });
    } finally {
      setBezig(false);
    }
  };

  const c = uitkomst?.controle;
  return (
    <div className="flex flex-col gap-3">
      <label className="flex flex-col gap-1 text-sm">
        <span>Kies een back-upbestand (.json.gz of .json)</span>
        <input
          type="file"
          accept=".gz,.json,application/gzip,application/json"
          disabled={bezig}
          onChange={(e) => void kies(e.currentTarget.files?.[0])}
          className="text-sm file:mr-3 file:rounded-full file:border file:border-black/15 file:bg-transparent file:px-3 file:py-1 file:text-sm dark:file:border-white/20"
        />
      </label>
      {bezig && <p className="text-sm text-black/60 dark:text-white/60">Bezig met controleren…</p>}
      {fout && <Melding soort="fout">{fout}</Melding>}
      {c && !c.ok && (
        <Melding soort="fout">
          De back-up is niet in orde:
          <span className="mt-1 block">
            {c.fouten.slice(0, 10).map((f) => (
              <span key={f} className="block">
                • {f}
              </span>
            ))}
          </span>
        </Melding>
      )}
      {c && c.ok && (
        <>
          <Melding soort="ok">
            De back-up is in orde: gemaakt op{" "}
            {new Date(c.gemaakt_op).toLocaleString("nl-NL", { timeZone: TIJDZONE })}
            {c.project ? ` (project ${c.project})` : ""}, {c.tabellen.length} tabellen,{" "}
            {c.tabellen.reduce((n, t) => n + t.inBestand, 0).toLocaleString("nl-NL")} rijen.
          </Melding>
          {c.waarschuwingen.length > 0 && (
            <ul className="list-inside list-disc text-sm text-amber-800 dark:text-amber-300">
              {c.waarschuwingen.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          )}
          <div className="overflow-x-auto rounded-lg border border-black/10 dark:border-white/15">
            <table className="w-full text-sm">
              <thead className="bg-black/[0.03] text-left dark:bg-white/[0.04]">
                <tr>
                  <th className="px-3 py-2 font-medium">Tabel</th>
                  <th className="px-3 py-2 text-right font-medium">In back-up</th>
                  <th className="px-3 py-2 text-right font-medium">Nu in database</th>
                  <th className="px-3 py-2 text-right font-medium">Verschil</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/5 dark:divide-white/10">
                {c.tabellen.map((t) => {
                  const nu = uitkomst?.nu?.[t.naam];
                  const verschil = typeof nu === "number" ? nu - t.inBestand : null;
                  return (
                    <tr key={t.naam}>
                      <td className="px-3 py-1.5 font-mono text-xs">{t.naam}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">{t.inBestand.toLocaleString("nl-NL")}</td>
                      <td className="px-3 py-1.5 text-right tabular-nums">
                        {typeof nu === "number" ? nu.toLocaleString("nl-NL") : "—"}
                      </td>
                      <td
                        className={`px-3 py-1.5 text-right tabular-nums ${
                          verschil ? "text-amber-800 dark:text-amber-300" : "text-black/40 dark:text-white/40"
                        }`}
                      >
                        {verschil === null ? "—" : verschil > 0 ? `+${verschil}` : verschil}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {c.opslag.length > 0 && (
            <p className="text-xs text-black/50 dark:text-white/50">
              Opslag op het moment van de back-up (bestanden zelf zitten er niet in):{" "}
              {c.opslag.map((b) => `${b.naam} ${b.bestanden} bestanden, ${leesbareGrootte(b.bytes)}${b.onvolledig ? " (onvolledig geteld)" : ""}`).join(" · ")}
            </p>
          )}
        </>
      )}
    </div>
  );
}
