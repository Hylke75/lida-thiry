"use server";

import { revalidatePath } from "next/cache";
import { vereisBeheerder } from "@/lib/admin-auth";
import {
  haalMedia,
  importeerBestaande,
  maakUpload,
  mediaMappen,
  registreerMedia,
  verwijderMedia,
  werkMediaBij,
  zoekGebruik,
  zoekMedia,
  type MediaItem,
  type Registratie,
  type Uitkomst,
  type UploadPlek,
  type VerwijderUitkomst,
  type ZoekResultaat,
} from "@/lib/media/beheer";
import { leesTypeFilter, SOORT_MIMES, type Gebruik, type MediaSoort } from "@/lib/media/regels";

const MEDIA_PAD = "/admin/media";

const foutTekst = (e: unknown) => (e instanceof Error ? e.message : "onbekende fout");

export interface ZoekVraag {
  q?: string;
  map?: string;
  type?: string;
  /** Alleen bestanden die bij deze soort passen (voor de kiezer). */
  soort?: MediaSoort;
  pagina?: number;
  perPagina?: number;
}

/** Zoeken in de bibliotheek (voor de kiezer). */
export async function zoekInMedia(v: ZoekVraag): Promise<Uitkomst<{ resultaat: ZoekResultaat; mappen: string[] }>> {
  await vereisBeheerder();
  try {
    const [resultaat, mappen] = await Promise.all([
      zoekMedia({
        q: v.q,
        map: v.map || null,
        type: leesTypeFilter(v.type),
        mimes: v.soort && v.soort in SOORT_MIMES ? SOORT_MIMES[v.soort] : undefined,
        pagina: v.pagina,
        perPagina: v.perPagina,
      }),
      mediaMappen(),
    ]);
    return { ok: true, resultaat, mappen };
  } catch (e) {
    return { ok: false, fout: `Zoeken is niet gelukt (${foutTekst(e)}).` };
  }
}

/** Stap 1 van uploaden: een eenmalige upload-URL in de bucket "media". */
export async function maakMediaUpload(mime: string, grootte: number, map: string): Promise<Uitkomst<UploadPlek>> {
  await vereisBeheerder();
  return maakUpload(String(mime ?? ""), Number(grootte), String(map ?? ""));
}

/** Stap 2: het geüploade bestand in de bibliotheek zetten (ook voor uploads uit de editors). */
export async function registreerUpload(r: Registratie): Promise<Uitkomst<{ media: MediaItem; webUrl: string | null }>> {
  await vereisBeheerder();
  if (!r || typeof r !== "object") return { ok: false, fout: "Onbekend bestand." };
  try {
    const u = await registreerMedia(r);
    if (u.ok) revalidatePath(MEDIA_PAD);
    return u;
  } catch (e) {
    return { ok: false, fout: `Opslaan in de bibliotheek is niet gelukt (${foutTekst(e)}).` };
  }
}

export async function werkMediaGegevensBij(id: string, w: { naam?: string; alt?: string; map?: string }): Promise<Uitkomst<{ media: MediaItem }>> {
  await vereisBeheerder();
  const u = await werkMediaBij(String(id ?? ""), {
    naam: typeof w?.naam === "string" ? w.naam : undefined,
    alt: typeof w?.alt === "string" ? w.alt : undefined,
    map: typeof w?.map === "string" ? w.map : undefined,
  });
  if (u.ok) revalidatePath(MEDIA_PAD, "layout");
  return u;
}

/** Waar de afbeelding gebruikt wordt. */
export async function gebruikVanMedia(id: string): Promise<Uitkomst<{ gebruik: Gebruik[] }>> {
  await vereisBeheerder();
  try {
    const m = await haalMedia(String(id ?? ""));
    if (!m) return { ok: false, fout: "Deze afbeelding bestaat niet meer." };
    return { ok: true, gebruik: await zoekGebruik(m) };
  } catch (e) {
    return { ok: false, fout: `Zoeken naar gebruik is niet gelukt (${foutTekst(e)}).` };
  }
}

/** Verwijderen; geblokkeerd zolang de afbeelding nog gebruikt wordt, tenzij `forceer`. */
export async function verwijderMediaBestand(id: string, forceer = false): Promise<VerwijderUitkomst> {
  await vereisBeheerder();
  try {
    const u = await verwijderMedia(String(id ?? ""), forceer === true);
    if (u.ok) revalidatePath(MEDIA_PAD, "layout");
    return u;
  } catch (e) {
    return { ok: false, fout: `Verwijderen is niet gelukt (${foutTekst(e)}).` };
  }
}

/** Zet oudere uploads uit de buckets "blog" en "nieuwsbrief" in de bibliotheek. */
export async function importeerBestaandeMedia(): Promise<Uitkomst<{ nieuw: number; bekeken: number }>> {
  await vereisBeheerder();
  try {
    const r = await importeerBestaande();
    revalidatePath(MEDIA_PAD);
    return { ok: true, ...r };
  } catch (e) {
    return { ok: false, fout: `Importeren is niet gelukt (${foutTekst(e)}).` };
  }
}
