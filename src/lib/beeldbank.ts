import "server-only";
import sharp, { type Metadata } from "sharp";
import { adminClient } from "./supabase/admin";
import {
  BEELD_BUCKET,
  MAX_UPLOAD_BYTES,
  TOEGESTANE_TYPES,
  controleerAfmetingen,
  eisenUitAfmetingen,
  type Eisen,
} from "./beeldbank-regels";

/** Breedte van de versie die in de PDF komt (ruim voldoende voor print). */
const PDF_MAX_ZIJDE = 1600;
const THUMB_MAX_ZIJDE = 400;

export interface Beeld {
  id: string;
  code: string;
  naam: string | null;
  onderdeel: string | null;
  omschrijving: string | null;
  figuur: string | null;
  advies: string | null;
  bijschrift: string | null;
  status: "origineel" | "vervangen" | "goedgekeurd";
  pad: string;
  thumb_pad: string | null;
  origineel_pad: string | null;
  vorige_pad: string | null;
  breedte: number | null;
  hoogte: number | null;
  verhouding_b: number | null;
  verhouding_h: number | null;
  min_breedte: number | null;
  min_hoogte: number | null;
  bijgewerkt_op: string;
}

export interface Gebruik {
  sectie_id: string;
  type_sleutel: string;
  type_titel: string;
  kop: string;
}

export const BEELD_KOLOMMEN =
  "id, code, naam, onderdeel, omschrijving, figuur, advies, bijschrift, status, pad, thumb_pad, origineel_pad, vorige_pad, breedte, hoogte, verhouding_b, verhouding_h, min_breedte, min_hoogte, bijgewerkt_op";

/** Signed URLs (1 uur) voor een lijst paden in de beeldbank-bucket, in één aanroep. */
export async function beeldUrls(paden: string[]): Promise<Record<string, string>> {
  const uniek = [...new Set(paden.filter(Boolean))];
  if (uniek.length === 0) return {};
  const { data } = await adminClient().storage.from(BEELD_BUCKET).createSignedUrls(uniek, 3600);
  const urls: Record<string, string> = {};
  for (const r of data ?? []) if (r.path && r.signedUrl) urls[r.path] = r.signedUrl;
  return urls;
}

/** Signed URL (1 uur) die het bestand als download aanbiedt (bijv. het origineel). */
export async function downloadUrl(pad: string, bestandsnaam: string): Promise<string | null> {
  const { data } = await adminClient()
    .storage.from(BEELD_BUCKET)
    .createSignedUrl(pad, 3600, { download: bestandsnaam });
  return data?.signedUrl ?? null;
}

/** Waar wordt een beeld gebruikt (type + sectie)? */
export async function gebruikVan(beeldId: string): Promise<Gebruik[]> {
  const { data } = await adminClient()
    .from("sectie_beelden")
    .select("sectie_id, adviessecties!inner(kop, type_sleutel, adviestypes!inner(titel))")
    .eq("beeld_id", beeldId);
  type Rij = {
    sectie_id: string;
    adviessecties: { kop: string; type_sleutel: string; adviestypes: { titel: string } };
  };
  return ((data ?? []) as unknown as Rij[])
    .map((r) => ({
      sectie_id: r.sectie_id,
      type_sleutel: r.adviessecties.type_sleutel,
      type_titel: r.adviessecties.adviestypes.titel,
      kop: r.adviessecties.kop,
    }))
    .sort((a, b) => sorteerSleutel(a.type_sleutel) - sorteerSleutel(b.type_sleutel));
}

/** Sorteert typesleutels als 1X, 1A, ... 12-8 (categorie, dan letter). */
export function sorteerSleutel(sleutel: string): number {
  const m = sleutel.match(/^(\d+)(.)$/);
  if (!m) return 9999;
  return Number(m[1]) * 10 + "XAVH8".indexOf(m[2]);
}

/** Aantal koppelingen per beeld (voor de lijst in de beeldbank). */
export async function gebruiksAantallen(): Promise<Record<string, number>> {
  const telling: Record<string, number> = {};
  const supabase = adminClient();
  // PostgREST geeft maximaal 1000 rijen per verzoek: pagineren.
  for (let van = 0; ; van += 1000) {
    const { data } = await supabase
      .from("sectie_beelden")
      .select("beeld_id")
      .range(van, van + 999);
    for (const r of data ?? []) telling[r.beeld_id] = (telling[r.beeld_id] ?? 0) + 1;
    if (!data || data.length < 1000) break;
  }
  return telling;
}

/** Signed upload-URL voor een nieuw bestand (de browser uploadt rechtstreeks). */
export async function maakUploadUrl(
  extensie: string,
): Promise<{ pad: string; token: string; signedUrl: string }> {
  const ext = extensie.toLowerCase().replace(/[^a-z]/g, "") || "jpg";
  const pad = `beeldbank/uploads/${crypto.randomUUID()}.${ext}`;
  const { data, error } = await adminClient().storage.from(BEELD_BUCKET).createSignedUploadUrl(pad);
  if (error || !data) throw new Error(`Uploadlink maken mislukt: ${error?.message ?? "onbekend"}`);
  return { pad, token: data.token, signedUrl: data.signedUrl };
}

export type UploadUitkomst = { ok: true; beeld: Beeld } | { ok: false; fouten: string[] };

/**
 * Verwerkt een geüpload bestand: controleert type, verhouding en minimaal
 * formaat, maakt een PDF-versie en een miniatuur, en koppelt het aan het beeld.
 * - beeldId gegeven: vervangt dat beeld (eisen van het beeld gelden).
 * - beeldId null: maakt een nieuw beeld (eisen worden van de upload afgeleid).
 */
export async function verwerkUpload(
  uploadPad: string,
  beeldId: string | null,
): Promise<UploadUitkomst> {
  const supabase = adminClient();
  if (!uploadPad.startsWith("beeldbank/uploads/")) return { ok: false, fouten: ["Ongeldig uploadpad."] };

  const { data: blob } = await supabase.storage.from(BEELD_BUCKET).download(uploadPad);
  if (!blob) return { ok: false, fouten: ["Het geüploade bestand is niet gevonden. Probeer het opnieuw."] };
  if (blob.size > MAX_UPLOAD_BYTES) {
    await supabase.storage.from(BEELD_BUCKET).remove([uploadPad]);
    return { ok: false, fouten: ["Het bestand is groter dan 15 MB."] };
  }

  const invoer = Buffer.from(await blob.arrayBuffer());
  let meta: Metadata;
  try {
    meta = await sharp(invoer).metadata();
  } catch {
    await supabase.storage.from(BEELD_BUCKET).remove([uploadPad]);
    return { ok: false, fouten: ["Dit bestand is geen geldige afbeelding."] };
  }
  const mime = `image/${meta.format}`;
  if (!(TOEGESTANE_TYPES as readonly string[]).includes(mime)) {
    await supabase.storage.from(BEELD_BUCKET).remove([uploadPad]);
    return { ok: false, fouten: ["Gebruik een JPG-, PNG- of WebP-bestand."] };
  }
  // Rekening houden met EXIF-rotatie (foto's van een telefoon).
  const gedraaid = (meta.orientation ?? 1) >= 5;
  const breedte = gedraaid ? meta.height! : meta.width!;
  const hoogte = gedraaid ? meta.width! : meta.height!;

  let bestaand: Beeld | null = null;
  if (beeldId) {
    const { data } = await supabase.from("beelden").select(BEELD_KOLOMMEN).eq("id", beeldId).single();
    bestaand = (data as Beeld | null) ?? null;
    if (!bestaand) return { ok: false, fouten: ["Beeld niet gevonden."] };
  }

  const eisen: Eisen =
    bestaand?.verhouding_b && bestaand.verhouding_h && bestaand.min_breedte && bestaand.min_hoogte
      ? {
          verhouding_b: bestaand.verhouding_b,
          verhouding_h: bestaand.verhouding_h,
          min_breedte: bestaand.min_breedte,
          min_hoogte: bestaand.min_hoogte,
        }
      : eisenUitAfmetingen(breedte, hoogte);

  const fouten = controleerAfmetingen(breedte, hoogte, eisen);
  if (fouten.length > 0) {
    await supabase.storage.from(BEELD_BUCKET).remove([uploadPad]);
    return { ok: false, fouten };
  }

  // PDF-versie en miniatuur: gedraaid, op wit (transparantie), als JPEG.
  const basis = () => sharp(invoer).rotate().flatten({ background: "#ffffff" });
  const pdfVersie = await basis()
    .resize({ width: PDF_MAX_ZIJDE, height: PDF_MAX_ZIJDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 85, mozjpeg: true })
    .toBuffer();
  const thumb = await basis()
    .resize({ width: THUMB_MAX_ZIJDE, height: THUMB_MAX_ZIJDE, fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 80 })
    .toBuffer();

  const code = bestaand?.code ?? ((await supabase.rpc("volgende_beeldcode")).data as string);
  if (!code) return { ok: false, fouten: ["Kon geen beeldnummer aanmaken."] };
  const stempel = Date.now();
  const map = `beeldbank/${code}`;
  const pad = `${map}/${stempel}.jpg`;
  const thumbPad = `${map}/${stempel}-thumb.jpg`;
  const origineelPad = `${map}/${stempel}-origineel.${meta.format === "jpeg" ? "jpg" : meta.format}`;

  const opslag = supabase.storage.from(BEELD_BUCKET);
  const r1 = await opslag.upload(pad, pdfVersie, { contentType: "image/jpeg" });
  const r2 = await opslag.upload(thumbPad, thumb, { contentType: "image/jpeg" });
  const r3 = await opslag.move(uploadPad, origineelPad);
  if (r1.error || r2.error || r3.error) {
    return { ok: false, fouten: ["Opslaan van het beeld mislukte. Probeer het opnieuw."] };
  }

  const velden = {
    pad,
    thumb_pad: thumbPad,
    origineel_pad: origineelPad,
    breedte,
    hoogte,
    ...eisen,
  };

  if (bestaand) {
    const { data, error } = await supabase
      .from("beelden")
      .update({ ...velden, vorige_pad: bestaand.pad, status: "vervangen" })
      .eq("id", bestaand.id)
      .select(BEELD_KOLOMMEN)
      .single();
    if (error || !data) return { ok: false, fouten: ["Bijwerken van het beeld mislukte."] };
    return { ok: true, beeld: data as Beeld };
  }

  const { data, error } = await supabase
    .from("beelden")
    .insert({ ...velden, code, status: "vervangen" })
    .select(BEELD_KOLOMMEN)
    .single();
  if (error || !data) return { ok: false, fouten: ["Opslaan van het nieuwe beeld mislukte."] };
  return { ok: true, beeld: data as Beeld };
}

/** Zet de vorige versie van een beeld terug (één stap ongedaan maken). */
export async function zetVorigeVersieTerug(beeldId: string): Promise<boolean> {
  const supabase = adminClient();
  const { data: b } = await supabase.from("beelden").select("pad, vorige_pad").eq("id", beeldId).single();
  if (!b?.vorige_pad) return false;
  const afm = await afmetingenVan(b.vorige_pad);
  const { error } = await supabase
    .from("beelden")
    .update({
      pad: b.vorige_pad,
      vorige_pad: b.pad,
      thumb_pad: null,
      ...(afm ?? {}),
    })
    .eq("id", beeldId);
  return !error;
}

async function afmetingenVan(pad: string): Promise<{ breedte: number; hoogte: number } | null> {
  const { data } = await adminClient().storage.from(BEELD_BUCKET).download(pad);
  if (!data) return null;
  try {
    const m = await sharp(Buffer.from(await data.arrayBuffer())).metadata();
    if (!m.width || !m.height) return null;
    return { breedte: m.width, hoogte: m.height };
  } catch {
    return null;
  }
}

/**
 * Bepaalt afmetingen (en, als die nog ontbreken, de eisen) van beelden waarvan
 * die nog onbekend zijn. Verwerkt maximaal `aantal` beelden per aanroep.
 * Geeft terug hoeveel er verwerkt zijn en hoeveel er nog openstaan.
 */
export async function bepaalOntbrekendeAfmetingen(
  aantal = 150,
): Promise<{ verwerkt: number; open: number }> {
  const supabase = adminClient();
  const { data } = await supabase
    .from("beelden")
    .select("id, pad, verhouding_b")
    .is("breedte", null)
    .limit(aantal);
  let verwerkt = 0;
  const rijen = data ?? [];
  // In kleine groepen parallel om de opslag niet te overbelasten.
  for (let i = 0; i < rijen.length; i += 10) {
    await Promise.all(
      rijen.slice(i, i + 10).map(async (r) => {
        const afm = await afmetingenVan(r.pad);
        if (!afm) return;
        const eisen = r.verhouding_b ? {} : eisenUitAfmetingen(afm.breedte, afm.hoogte);
        const { error } = await supabase
          .from("beelden")
          .update({ ...afm, ...eisen })
          .eq("id", r.id);
        if (!error) verwerkt++;
      }),
    );
  }
  const { count } = await supabase
    .from("beelden")
    .select("id", { count: "exact", head: true })
    .is("breedte", null);
  return { verwerkt, open: count ?? 0 };
}
