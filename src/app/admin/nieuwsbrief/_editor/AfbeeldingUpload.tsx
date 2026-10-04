"use client";

import { useRef, useState } from "react";
import { registreerEditorUpload } from "@/components/admin/mediaUpload";
import { createClient } from "@/lib/supabase/client";
import { maakAfbeeldingUpload } from "./acties";
import { AFBEELDING_MAX_BYTES, AFBEELDING_TYPES, BUCKET } from "./regels";
import { knopRand } from "./stijl";

/** Knop om een afbeelding te kiezen; geeft na het uploaden de openbare URL terug. */
export function AfbeeldingUpload({ heeftAfbeelding, onUrl }: { heeftAfbeelding: boolean; onUrl: (url: string) => void }) {
  const invoer = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function upload(bestand: File) {
    setFout(null);
    if (!AFBEELDING_TYPES[bestand.type]) return setFout("Kies een afbeelding van het type JPG, PNG, GIF of WebP.");
    if (bestand.size > AFBEELDING_MAX_BYTES) return setFout("De afbeelding is te groot. Kies een bestand van maximaal 5 MB.");
    setBezig(true);
    try {
      const u = await maakAfbeeldingUpload(bestand.type, bestand.size);
      if (!u.ok) return setFout(u.fouten.join(" "));
      const { error } = await createClient()
        .storage.from(BUCKET)
        .uploadToSignedUrl(u.pad, u.token, bestand, { contentType: bestand.type });
      if (error) return setFout(`Uploaden is niet gelukt (${error.message}).`);
      onUrl(u.url);
      // Ook in de mediabibliotheek zetten (op de achtergrond; de upload zelf is al gelukt).
      void registreerEditorUpload(bestand, "nieuwsbrief", u.pad, "nieuwsbrief");
    } catch {
      setFout("Uploaden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      setBezig(false);
      if (invoer.current) invoer.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={invoer}
        type="file"
        accept={Object.keys(AFBEELDING_TYPES).join(",")}
        className="hidden"
        onChange={(e) => {
          const bestand = e.target.files?.[0];
          if (bestand) void upload(bestand);
        }}
      />
      <button type="button" disabled={bezig} onClick={() => invoer.current?.click()} className={`${knopRand} w-fit`}>
        {bezig ? "Bezig met uploaden…" : heeftAfbeelding ? "Andere afbeelding uploaden" : "Afbeelding uploaden"}
      </button>
      {fout && <p className="text-sm text-red-600 dark:text-red-400">{fout}</p>}
    </div>
  );
}
