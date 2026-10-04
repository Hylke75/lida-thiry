"use client";

import { useState, type ReactNode } from "react";

/**
 * Invoerveld voor een afbeelding: een https-adres met voorbeeld.
 *
 * >>> PLEK VOOR DE MEDIAKIEZER <<<
 * Zodra src/components/admin/MediaKiezer.tsx bestaat, kan die hieronder bij
 * "Kiezer" worden ingeplugd, bijvoorbeeld:
 *
 *   <MediaKiezer onKies={({ url }) => onChange(url)} />
 *
 * Het tekstveld blijft daarnaast bestaan (handig voor een adres van elders).
 */
export function AfbeeldingVeld({
  id,
  label,
  waarde,
  onChange,
  uitleg,
  fout,
  voorbeeldKlasse = "h-16 w-auto max-w-[16rem]",
  voorbeeldAlt,
}: {
  id: string;
  label: string;
  waarde: string;
  onChange: (url: string) => void;
  uitleg?: ReactNode;
  fout?: string | null;
  /** Grootte/vorm van het voorbeeld, bijv. een vierkantje voor de favicon. */
  voorbeeldKlasse?: string;
  voorbeeldAlt?: string;
}) {
  const [kapot, setKapot] = useState<string | null>(null);
  const url = waarde.trim();
  const toonVoorbeeld = url !== "" && (url.startsWith("https://") || url.startsWith("/")) && kapot !== url;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          id={id}
          type="url"
          inputMode="url"
          value={waarde}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value)}
          aria-invalid={fout ? true : undefined}
          aria-describedby={`${id}-uitleg`}
          className="w-full rounded-lg border border-black/15 bg-kaart px-3 py-2 outline-none focus:border-accent aria-[invalid=true]:border-red-400 dark:border-white/20"
        />
        {/* Kiezer: hier komt later de MediaKiezer (zie de uitleg bovenaan dit bestand). */}
        {waarde && (
          <button
            type="button"
            onClick={() => onChange("")}
            className="shrink-0 self-start rounded-full border border-black/15 px-3 py-1.5 text-xs hover:border-accent/40 sm:self-auto dark:border-white/20"
          >
            Weghalen
          </button>
        )}
      </div>
      <div id={`${id}-uitleg`} className="flex flex-col gap-1 text-xs leading-relaxed text-black/50 dark:text-white/50">
        {uitleg}
        {fout && <span className="text-red-700 dark:text-red-300">{fout}</span>}
      </div>
      {toonVoorbeeld && (
        <div className="mt-1 flex w-fit items-center justify-center rounded-lg border border-dashed border-black/15 bg-[repeating-conic-gradient(#0000000a_0%_25%,transparent_0%_50%)] bg-[length:16px_16px] p-2 dark:border-white/20">
          {/* eslint-disable-next-line @next/next/no-img-element -- voorbeeld van een vrij adres */}
          <img
            src={url}
            alt={voorbeeldAlt ?? `Voorbeeld: ${label}`}
            className={`object-contain ${voorbeeldKlasse}`}
            onError={() => setKapot(url)}
          />
        </div>
      )}
      {url !== "" && kapot === url && (
        <p className="text-xs text-amber-700 dark:text-amber-300">Deze afbeelding kon niet worden geladen. Klopt het adres?</p>
      )}
    </div>
  );
}
