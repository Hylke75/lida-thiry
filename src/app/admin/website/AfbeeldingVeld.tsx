"use client";

import { useState, type ReactNode } from "react";
import { MediaKiezer } from "@/components/admin/MediaKiezer";
import { invoerBreed, tekstFout } from "@/components/admin/stijl";

/**
 * Invoerveld voor een afbeelding: kiezen uit de mediabibliotheek (of uploaden),
 * of een https-adres van elders plakken; met voorbeeld.
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
  soort = "afbeelding",
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
  /** Welke bestanden de mediakiezer toont: favicon = "icoon", deelafbeelding = "foto". */
  soort?: "afbeelding" | "icoon" | "foto";
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
          className={invoerBreed}
        />
        <MediaKiezer
          onKies={({ url: gekozen }) => onChange(gekozen)}
          accept={soort}
          map={soort === "foto" ? "algemeen" : "logo"}
          knopTekst="Kies of upload"
          titel={label}
          knopKlasse="shrink-0 self-start rounded-full border border-accent/40 px-3 py-1.5 text-xs text-accent hover:bg-accent-zacht sm:self-auto"
        />
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
      <div id={`${id}-uitleg`} className="flex flex-col gap-1 text-xs leading-relaxed text-foreground/70">
        {uitleg}
        {fout && <span className={tekstFout}>{fout}</span>}
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
