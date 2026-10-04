"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { MediaUploader } from "@/components/admin/MediaUploader";
import { MAP_SUGGESTIES, normaliseerMap, STANDAARD_MAP } from "@/lib/media/regels";
import { Melding } from "../Melding";
import { invoerKlasse, kaart, knopRand, zacht } from "../nieuwsbrief/_editor/stijl";
import { importeerBestaandeMedia } from "./acties";

/** Uploadvak met een map-veld; ververst daarna het overzicht. */
export function UploadPaneel({ mappen }: { mappen: string[] }) {
  const router = useRouter();
  const id = useId();
  const [map, setMap] = useState(STANDAARD_MAP);
  const geldig = normaliseerMap(map) ?? STANDAARD_MAP;

  return (
    <section className={kaart} aria-labelledby={`${id}-kop`}>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 id={`${id}-kop`} className="text-lg font-semibold">
          Uploaden
        </h2>
        <label className="flex w-full flex-col gap-1 text-xs font-medium text-black/70 sm:w-56 dark:text-white/70">
          In map
          <input
            list={`${id}-mappen`}
            value={map}
            onChange={(e) => setMap(e.target.value)}
            onBlur={() => setMap(geldig)}
            className={invoerKlasse}
          />
          <datalist id={`${id}-mappen`}>
            {[...new Set([...MAP_SUGGESTIES, ...mappen])].map((m) => (
              <option key={m} value={m} />
            ))}
          </datalist>
        </label>
      </div>
      <MediaUploader map={geldig} soort="alle" onKlaar={(items) => items.length && router.refresh()} />
      <p className={`text-xs ${zacht}`}>
        Tip: geef elke afbeelding daarna een korte omschrijving (alt-tekst). Die wordt gebruikt voor slechtzienden en door Google.
      </p>
    </section>
  );
}

/** Zet oudere uploads uit blog en nieuwsbrief in de bibliotheek. */
export function ImporteerKnop() {
  const router = useRouter();
  const [bezig, setBezig] = useState(false);
  const [melding, setMelding] = useState<{ soort: "ok" | "fout"; tekst: string } | null>(null);

  async function importeer() {
    setBezig(true);
    setMelding(null);
    try {
      const r = await importeerBestaandeMedia();
      if (!r.ok) return setMelding({ soort: "fout", tekst: r.fout });
      setMelding({
        soort: "ok",
        tekst: r.nieuw
          ? `${r.nieuw} ${r.nieuw === 1 ? "afbeelding" : "afbeeldingen"} toegevoegd aan de bibliotheek.`
          : r.bekeken
            ? "Alle bestaande afbeeldingen staan al in de bibliotheek."
            : "Er zijn geen eerdere uploads gevonden.",
      });
      if (r.nieuw) router.refresh();
    } catch {
      setMelding({ soort: "fout", tekst: "Importeren is niet gelukt. Probeer het opnieuw." });
    } finally {
      setBezig(false);
    }
  }

  return (
    <div className="flex max-w-sm flex-col items-start gap-2 sm:items-end">
      <button type="button" onClick={importeer} disabled={bezig} className={knopRand} title="Zoekt afbeeldingen die eerder bij blog, pagina's en nieuwsbrief zijn geüpload">
        {bezig ? "Bezig met importeren…" : "Importeer bestaande afbeeldingen"}
      </button>
      {melding && <Melding soort={melding.soort}>{melding.tekst}</Melding>}
    </div>
  );
}
