"use client";

import { useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { BLOG_AFBEELDING_MAX_BYTES, BLOG_AFBEELDING_TYPES, BLOG_BUCKET, type UploadMap } from "@/lib/blog/beheer";
import { maakPaginaUpload } from "../acties";
import { knopRand } from "../../nieuwsbrief/_editor/stijl";

/** Knop om een foto te kiezen; uploadt naar de bucket "blog" (map paginas/) en geeft de openbare URL terug. */
export function PaginaUpload({
  map,
  label,
  disabled,
  onUrl,
}: {
  map: UploadMap;
  label: string;
  disabled?: boolean;
  onUrl: (url: string) => void;
}) {
  const invoer = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState(false);
  const [fout, setFout] = useState<string | null>(null);

  async function upload(bestand: File) {
    setFout(null);
    if (!BLOG_AFBEELDING_TYPES[bestand.type]) return setFout("Kies een foto van het type JPG, PNG, GIF of WebP.");
    if (bestand.size > BLOG_AFBEELDING_MAX_BYTES) return setFout("De foto is te groot. Kies een bestand van maximaal 5 MB.");
    setBezig(true);
    try {
      const u = await maakPaginaUpload(bestand.type, bestand.size, map);
      if (!u.ok) return setFout(u.fouten.join(" "));
      const { error } = await createClient()
        .storage.from(BLOG_BUCKET)
        .uploadToSignedUrl(u.pad, u.token, bestand, { contentType: bestand.type });
      if (error) return setFout(`Uploaden is niet gelukt (${error.message}).`);
      onUrl(u.url);
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
        accept={Object.keys(BLOG_AFBEELDING_TYPES).join(",")}
        className="hidden"
        onChange={(e) => {
          const bestand = e.target.files?.[0];
          if (bestand) void upload(bestand);
        }}
      />
      <button type="button" disabled={bezig || disabled} onClick={() => invoer.current?.click()} className={`${knopRand} w-fit`}>
        {bezig ? "Bezig met uploaden…" : label}
      </button>
      {fout && <p className="text-sm text-red-600 dark:text-red-400">{fout}</p>}
    </div>
  );
}
