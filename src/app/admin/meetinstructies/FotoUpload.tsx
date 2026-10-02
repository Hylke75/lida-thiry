"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { MEET_BUCKET, MEET_MAX_BYTES, MEET_TYPES } from "@/lib/meetbeelden-regels";
import { bevestigUpload, maakUploadUrl } from "./acties";

/** Knop om een meetfoto te kiezen en direct te uploaden. */
export function FotoUpload({ sleutel, heeftFoto }: { sleutel: string; heeftFoto: boolean }) {
  const router = useRouter();
  const invoer = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);
  const [gelukt, setGelukt] = useState(false);

  async function upload(bestand: File) {
    setFout(null);
    setGelukt(false);
    if (!MEET_TYPES[bestand.type]) return setFout("Kies een foto van het type JPG, PNG of WebP.");
    if (bestand.size > MEET_MAX_BYTES) return setFout("De foto is te groot. Kies een foto van maximaal 5 MB.");

    setBezig(true);
    try {
      const url = await maakUploadUrl(sleutel, bestand.type, bestand.size);
      if (!url.ok) return setFout(url.fout);
      const { error } = await createClient()
        .storage.from(MEET_BUCKET)
        .uploadToSignedUrl(url.pad, url.token, bestand, { contentType: bestand.type });
      if (error) return setFout(`Uploaden is niet gelukt (${error.message}).`);
      const klaar = await bevestigUpload(sleutel, url.pad);
      if (!klaar.ok) return setFout(klaar.fout);
      setGelukt(true);
      router.refresh();
    } catch {
      setFout("Uploaden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw.");
    } finally {
      setBezig(false);
      if (invoer.current) invoer.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={invoer}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const bestand = e.target.files?.[0];
          if (bestand) void upload(bestand);
        }}
      />
      <button
        type="button"
        disabled={bezig}
        onClick={() => invoer.current?.click()}
        className="w-fit rounded-full bg-accent px-5 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
      >
        {bezig ? "Bezig met uploaden…" : heeftFoto ? "Andere foto kiezen" : "Foto uploaden"}
      </button>
      {fout && <p className="text-sm text-red-600 dark:text-red-400">{fout}</p>}
      {gelukt && <p className="text-sm text-emerald-700 dark:text-emerald-400">✓ Foto opgeslagen.</p>}
    </div>
  );
}
