"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  BEELD_BUCKET,
  MAX_UPLOAD_BYTES,
  TOEGESTANE_TYPES,
  controleerUpload,
} from "@/lib/beeldbank-regels";
import { verwerkBeeld, vraagUploadUrl } from "./acties";
import { knop, tekstSucces } from "@/components/admin/stijl";

/** Leest de werkelijke afmetingen van een afbeelding in de browser. */
async function leesAfmetingen(bestand: File): Promise<{ breedte: number; hoogte: number }> {
  if (typeof createImageBitmap === "function") {
    try {
      const bitmap = await createImageBitmap(bestand);
      const afm = { breedte: bitmap.width, hoogte: bitmap.height };
      bitmap.close();
      return afm;
    } catch {
      // Val terug op een <img>-element.
    }
  }
  const url = URL.createObjectURL(bestand);
  try {
    return await new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve({ breedte: img.naturalWidth, hoogte: img.naturalHeight });
      img.onerror = () => reject(new Error("geen afbeelding"));
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Knop om een beeld te kiezen en te uploaden.
 * - beeldId gegeven: vervangt dat beeld (eerst controle in de browser).
 * - beeldId null: voegt een nieuw beeld toe en opent daarna de detailpagina.
 */
export function BeeldUpload({
  beeldId,
  label,
}: {
  beeldId: string | null;
  label: string;
}) {
  const router = useRouter();
  const invoer = useRef<HTMLInputElement>(null);
  const [bezig, setBezig] = useState<string | null>(null);
  const [fouten, setFouten] = useState<string[]>([]);
  const [gelukt, setGelukt] = useState(false);
  const [melding, setMelding] = useState<string | null>(null);

  async function upload(bestand: File) {
    setFouten([]);
    setGelukt(false);
    setMelding(null);
    if (!(TOEGESTANE_TYPES as readonly string[]).includes(bestand.type)) {
      return setFouten(["Dit bestandstype wordt niet ondersteund. Gebruik een JPG-, PNG- of WebP-bestand."]);
    }
    if (bestand.size > MAX_UPLOAD_BYTES) {
      return setFouten(["Het bestand is groter dan 15 MB. Sla het kleiner op en probeer het opnieuw."]);
    }

    setBezig("Beeld controleren…");
    try {
      let afm: { breedte: number; hoogte: number };
      try {
        afm = await leesAfmetingen(bestand);
      } catch {
        return setFouten(["Dit bestand kon niet als afbeelding worden geopend. Kies een ander bestand."]);
      }
      const controle = controleerUpload(afm.breedte, afm.hoogte);
      if (controle.fouten.length) {
        return setFouten([...controle.fouten, "Er is niets geüpload; het huidige beeld blijft gewoon staan."]);
      }
      setMelding(controle.melding);

      setBezig("Bezig met uploaden…");
      const url = await vraagUploadUrl(bestand.type, bestand.size);
      if (!url.ok) return setFouten([url.fout]);
      const { error } = await createClient()
        .storage.from(BEELD_BUCKET)
        .uploadToSignedUrl(url.pad, url.token, bestand, { contentType: bestand.type });
      if (error) return setFouten([`Uploaden is niet gelukt (${error.message}). Probeer het opnieuw.`]);

      setBezig("Beeld verwerken…");
      const klaar = await verwerkBeeld(url.pad, beeldId);
      if (!klaar.ok) return setFouten(klaar.fouten);

      if (beeldId) {
        setGelukt(true);
        router.refresh();
      } else {
        router.push(`/admin/beeldbank/${klaar.id}?nieuw=1`);
      }
    } catch {
      setFouten(["Uploaden is niet gelukt. Controleer je internetverbinding en probeer het opnieuw."]);
    } finally {
      setBezig(null);
      if (invoer.current) invoer.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={invoer}
        type="file"
        accept={TOEGESTANE_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const bestand = e.target.files?.[0];
          if (bestand) void upload(bestand);
        }}
      />
      <button
        type="button"
        disabled={bezig !== null}
        onClick={() => invoer.current?.click()}
        className={`${knop} w-fit`}
      >
        {bezig ?? label}
      </button>
      {fouten.length > 0 && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-800 dark:bg-red-950/40 dark:text-red-300">
          <span className="block font-medium">Dit beeld kan niet worden gebruikt:</span>
          {fouten.map((f) => (
            <span key={f} className="block">
              • {f}
            </span>
          ))}
        </div>
      )}
      {melding && !fouten.length && (
        <p role="status" className="text-sm text-foreground/70">
          {melding}
        </p>
      )}
      {gelukt && (
        <p role="status" className={`text-sm ${tekstSucces}`}>
          ✓ Het beeld is vervangen. Alle adviestypes gebruiken nu het nieuwe beeld.
        </p>
      )}
    </div>
  );
}
