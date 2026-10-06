"use client";

import { useId, useRef, useState } from "react";
import { MEDIA_MAX_BYTES, SOORT_MIMES, SOORT_UITLEG, formatGrootte, type MediaItem, type MediaSoort } from "@/lib/media/regels";
import { uploadNaarMedia } from "./mediaUpload";
import { tekstFout } from "@/components/admin/stijl";

interface Regel {
  sleutel: string;
  naam: string;
  grootte: number;
  voortgang: number;
  status: "wacht" | "bezig" | "klaar" | "fout";
  fout?: string;
}

/**
 * Sleep- en kiesvak voor één of meer afbeeldingen, met voortgang per bestand.
 * Bestanden gaan rechtstreeks van de browser naar de opslag en komen in de bibliotheek.
 */
export function MediaUploader({
  map,
  soort = "afbeelding",
  meerdere = true,
  onKlaar,
}: {
  map: string;
  soort?: MediaSoort;
  meerdere?: boolean;
  /** Na afloop, met de gelukte uploads (in volgorde). */
  onKlaar?: (items: MediaItem[]) => void;
}) {
  const invoerId = useId();
  const invoer = useRef<HTMLInputElement>(null);
  const [regels, setRegels] = useState<Regel[]>([]);
  const [slepen, setSlepen] = useState(false);
  const [bezig, setBezig] = useState(false);

  const wijzig = (sleutel: string, w: Partial<Regel>) => setRegels((rs) => rs.map((r) => (r.sleutel === sleutel ? { ...r, ...w } : r)));

  async function verwerk(lijst: FileList | File[]) {
    const bestanden = Array.from(lijst).slice(0, meerdere ? 50 : 1);
    if (!bestanden.length || bezig) return;
    const nieuw: Regel[] = bestanden.map((b, i) => ({
      sleutel: `${Date.now()}-${i}-${b.name}`,
      naam: b.name,
      grootte: b.size,
      voortgang: 0,
      status: "wacht",
    }));
    setRegels(nieuw);
    setBezig(true);
    const gelukt: MediaItem[] = [];
    // Twee tegelijk: snel genoeg, zonder een trage verbinding te overbelasten.
    let volgende = 0;
    async function werker() {
      while (volgende < bestanden.length) {
        const i = volgende++;
        const r = nieuw[i];
        wijzig(r.sleutel, { status: "bezig" });
        const u = await uploadNaarMedia(bestanden[i], { map, soort, opVoortgang: (f) => wijzig(r.sleutel, { voortgang: f }) });
        if (u.ok) {
          gelukt[i] = u.media;
          wijzig(r.sleutel, { status: "klaar", voortgang: 1 });
        } else {
          wijzig(r.sleutel, { status: "fout", fout: u.fout });
        }
      }
    }
    try {
      await Promise.all([werker(), werker()]);
    } finally {
      setBezig(false);
      if (invoer.current) invoer.current.value = "";
    }
    onKlaar?.(gelukt.filter(Boolean));
  }

  const aantalKlaar = regels.filter((r) => r.status === "klaar").length;

  return (
    <div className="flex flex-col gap-3">
      <label
        htmlFor={invoerId}
        onDragOver={(e) => {
          e.preventDefault();
          setSlepen(true);
        }}
        onDragLeave={() => setSlepen(false)}
        onDrop={(e) => {
          e.preventDefault();
          setSlepen(false);
          if (e.dataTransfer.files.length) void verwerk(e.dataTransfer.files);
        }}
        className={`flex cursor-pointer flex-col items-center justify-center gap-1 rounded-2xl border-2 border-dashed px-4 py-8 text-center text-sm transition-colors ${
          slepen ? "border-accent bg-accent-zacht" : "border-black/15 hover:border-accent/60 dark:border-white/20"
        } ${bezig ? "pointer-events-none opacity-60" : ""}`}
      >
        <span aria-hidden className="text-2xl">
          ⬆️
        </span>
        <span className="font-medium">{meerdere ? "Sleep afbeeldingen hierheen" : "Sleep een afbeelding hierheen"}</span>
        <span className="text-foreground/70">
          of <span className="text-accent underline underline-offset-2">kies {meerdere ? "bestanden" : "een bestand"}</span> · {SOORT_UITLEG[soort]}, max.{" "}
          {formatGrootte(MEDIA_MAX_BYTES)}
        </span>
        <input
          id={invoerId}
          ref={invoer}
          type="file"
          multiple={meerdere}
          accept={[...SOORT_MIMES[soort], ...(SOORT_MIMES[soort].includes("image/x-icon") ? [".ico"] : [])].join(",")}
          className="sr-only"
          disabled={bezig}
          onChange={(e) => {
            if (e.target.files?.length) void verwerk(e.target.files);
          }}
        />
      </label>

      {regels.length > 0 && (
        <div className="flex flex-col gap-2" aria-live="polite">
          <p className="text-xs text-foreground/70">
            {bezig ? "Bezig met uploaden…" : `${aantalKlaar} van ${regels.length} geüpload.`}
          </p>
          <ul className="flex flex-col gap-2">
            {regels.map((r) => (
              <li key={r.sleutel} className="flex min-w-0 flex-col gap-1 rounded-lg border border-black/10 px-3 py-2 text-sm dark:border-white/15">
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <span className="truncate">{r.naam}</span>
                  <span
                    className={`shrink-0 text-xs ${
                      r.status === "fout"
                        ? "text-red-700 dark:text-red-300"
                        : r.status === "klaar"
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-foreground/70"
                    }`}
                  >
                    {r.status === "wacht" && "Wacht…"}
                    {r.status === "bezig" && `${Math.round(r.voortgang * 100)}%`}
                    {r.status === "klaar" && "✓ Klaar"}
                    {r.status === "fout" && "Mislukt"}
                  </span>
                </div>
                {r.status !== "fout" && (
                  <div
                    className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10"
                    role="progressbar"
                    aria-label={`Voortgang ${r.naam}`}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-valuenow={Math.round(r.voortgang * 100)}
                  >
                    <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(r.voortgang * 100)}%` }} />
                  </div>
                )}
                {r.fout && <p className={`text-xs ${tekstFout}`}>{r.fout}</p>}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
