// Uploaden naar de mediabibliotheek vanuit de browser (rechtstreeks naar de opslag).

import { maakMediaUpload, registreerUpload } from "@/lib/media/acties";
import { altUitNaam, controleerBestand, mimeVoorNaam, schoneBestandsnaam, type MediaItem, type MediaSoort } from "@/lib/media/regels";

/** Leest de afmetingen van een afbeelding in de browser; null als dat niet lukt (bijv. sommige SVG/ICO). */
async function leesAfmetingen(bestand: Blob): Promise<{ breedte: number; hoogte: number } | null> {
  if (typeof createImageBitmap === "function" && bestand.type !== "image/svg+xml") {
    try {
      const bitmap = await createImageBitmap(bestand);
      const afm = { breedte: bitmap.width, hoogte: bitmap.height };
      bitmap.close();
      if (afm.breedte > 0 && afm.hoogte > 0) return afm;
    } catch {
      // Val terug op een <img>-element.
    }
  }
  const url = URL.createObjectURL(bestand);
  try {
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve(img.naturalWidth > 0 && img.naturalHeight > 0 ? { breedte: img.naturalWidth, hoogte: img.naturalHeight } : null);
      img.onerror = () => resolve(null);
      img.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Het MIME-type; sommige browsers geven bij .ico een leeg type. */
function bestandsType(bestand: File): string {
  return bestand.type || mimeVoorNaam(bestand.name) || "";
}

/** PUT naar de eenmalige upload-URL, met voortgang (0–1). */
function stuurNaarOpslag(signedUrl: string, bestand: File, mime: string, opVoortgang?: (fractie: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    const sleutel = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (sleutel) {
      xhr.setRequestHeader("apikey", sleutel);
      xhr.setRequestHeader("Authorization", `Bearer ${sleutel}`);
    }
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) opVoortgang?.(e.loaded / e.total);
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      let tekst = `status ${xhr.status}`;
      try {
        const j = JSON.parse(xhr.responseText) as { message?: string; error?: string };
        tekst = j.message || j.error || tekst;
      } catch {
        // geen JSON
      }
      reject(new Error(tekst));
    };
    xhr.onerror = () => reject(new Error("geen verbinding"));
    const formulier = new FormData();
    formulier.append("cacheControl", "3600");
    formulier.append("", mime === bestand.type ? bestand : new Blob([bestand], { type: mime }), bestand.name);
    xhr.send(formulier);
  });
}

export type UploadResultaat = { ok: true; media: MediaItem } | { ok: false; fout: string };

/**
 * Controleert, uploadt en registreert één bestand in de mediabibliotheek.
 * Pad in de bucket "media": "<map>/<uuid>.<ext>".
 */
export async function uploadNaarMedia(
  bestand: File,
  o: { map: string; soort?: MediaSoort; alt?: string; opVoortgang?: (fractie: number) => void },
): Promise<UploadResultaat> {
  const mime = bestandsType(bestand);
  const probleem = controleerBestand({ type: mime, size: bestand.size }, o.soort ?? "afbeelding");
  if (probleem) return { ok: false, fout: probleem };
  try {
    const afm = await leesAfmetingen(bestand);
    if (!afm && mime !== "image/svg+xml" && !mime.includes("icon")) {
      return { ok: false, fout: "Dit bestand kon niet als afbeelding worden geopend. Kies een ander bestand." };
    }
    const plek = await maakMediaUpload(mime, bestand.size, o.map);
    if (!plek.ok) return plek;
    await stuurNaarOpslag(plek.signedUrl, bestand, mime, o.opVoortgang);
    o.opVoortgang?.(1);
    const naam = schoneBestandsnaam(bestand.name);
    return await registreerUpload({
      bucket: plek.bucket,
      pad: plek.pad,
      naam,
      alt: o.alt ?? altUitNaam(naam),
      map: o.map,
      breedte: afm?.breedte ?? null,
      hoogte: afm?.hoogte ?? null,
    });
  } catch (e) {
    return { ok: false, fout: `Uploaden is niet gelukt (${e instanceof Error ? e.message : "onbekend"}). Controleer je internetverbinding en probeer het opnieuw.` };
  }
}

/**
 * Zet een upload uit een bestaande editor (bucket "blog" of "nieuwsbrief") ook in de
 * bibliotheek. Daarbij maakt de server een verkleinde webversie zonder EXIF/GPS
 * (voor de nieuwsbrief in JPG/PNG); geeft het adres daarvan terug, zodat de editor
 * die invoegt in plaats van het (grote) origineel. Mislukt dit, dan null: de editor
 * gebruikt dan gewoon het origineel en de gebruiker merkt er niets van.
 */
export async function registreerEditorUpload(bestand: File, bucket: "blog" | "nieuwsbrief", pad: string, map: string, alt = ""): Promise<string | null> {
  try {
    const afm = await leesAfmetingen(bestand);
    const u = await registreerUpload({ bucket, pad, naam: schoneBestandsnaam(bestand.name), alt, map, breedte: afm?.breedte ?? null, hoogte: afm?.hoogte ?? null });
    return u.ok ? u.webUrl : null;
  } catch {
    // Niet erg: met "Importeer bestaande afbeeldingen" komt hij er later alsnog in.
    return null;
  }
}
