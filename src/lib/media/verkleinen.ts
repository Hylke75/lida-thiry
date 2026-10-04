import "server-only";
import sharp, { type Sharp } from "sharp";
import { adminClient } from "@/lib/supabase/admin";
import {
  gedraaideAfmetingen,
  JPEG_KWALITEIT,
  planVerkleining,
  WEBP_KWALITEIT,
  type Afmetingen,
  type DoelFormaat,
  type Plan,
} from "./verkleinen-regels";

// Maakt na een upload de web- en miniversie (zie verkleinen-regels.ts) en zet die
// in de opslag. Het origineel blijft ongewijzigd staan.

export interface Versies {
  /** Afmetingen van het origineel (na EXIF-rotatie). */
  origineel: Afmetingen;
  /** Afmetingen van de webversie. */
  web: Afmetingen;
  webPad: string;
  miniPad: string;
  webUrl: string;
  miniUrl: string;
}

function codeer(beeld: Sharp, formaat: DoelFormaat): Sharp {
  switch (formaat) {
    case "webp":
      return beeld.webp({ quality: WEBP_KWALITEIT });
    case "jpeg":
      // Mailprogramma's tonen geen transparantie in JPG: eerst op wit.
      return beeld.flatten({ background: "#ffffff" }).jpeg({ quality: JPEG_KWALITEIT, mozjpeg: true });
    case "png":
      return beeld.png({ compressionLevel: 9, palette: false });
  }
}

export interface Verkleind {
  plan: Plan;
  /** Afmetingen van het origineel (na EXIF-rotatie). */
  origineel: Afmetingen;
  web: { data: Buffer; breedte: number; hoogte: number };
  mini: { data: Buffer; breedte: number; hoogte: number };
}

/**
 * Verkleint een afbeelding (zonder opslag; los te testen). `rotate()` zet foto's
 * van een telefoon rechtop; sharp neemt standaard GEEN metadata mee (geen EXIF,
 * GPS of cameragegevens), dus de versies zijn ook privacyvriendelijk. Geeft null
 * als het bestand niet te verkleinen is (SVG, ICO, GIF) of niet te lezen is.
 */
export async function verkleinAfbeelding(invoer: Buffer, o: { pad: string; bucket: string; mime: string }): Promise<Verkleind | null> {
  let origineel: Afmetingen | null = null;
  try {
    origineel = gedraaideAfmetingen(await sharp(invoer).metadata());
  } catch {
    return null;
  }
  const plan = planVerkleining({ ...o, afmetingen: origineel });
  if (!plan || !origineel) return null;
  const maak = async (a: Afmetingen) => {
    // Een vierkant kader van de lange kant: zo bepaalt die kant de maat (geen afrondingsverschil).
    const kader = Math.max(a.breedte, a.hoogte);
    const { data, info } = await codeer(
      sharp(invoer).rotate().resize({ width: kader, height: kader, fit: "inside", withoutEnlargement: true }),
      plan.formaat,
    ).toBuffer({ resolveWithObject: true });
    return { data, breedte: info.width, hoogte: info.height };
  };
  const [web, mini] = await Promise.all([maak(plan.web), maak(plan.mini)]);
  return { plan, origineel, web, mini };
}

/** Haalt een upload uit de opslag, verkleint hem en zet de versies ernaast (zie boven). */
export async function maakVersies(bucket: string, pad: string, mime: string): Promise<Versies | null> {
  const opslag = adminClient().storage.from(bucket);
  const { data: blob, error } = await opslag.download(pad);
  if (error || !blob) return null;
  const v = await verkleinAfbeelding(Buffer.from(await blob.arrayBuffer()), { pad, bucket, mime });
  if (!v) return null;

  // Paden bevatten de uuid van het origineel en veranderen nooit: lang cachen mag.
  const opties = { contentType: v.plan.mime, upsert: true, cacheControl: "31536000" };
  const [r1, r2] = await Promise.all([
    opslag.upload(v.plan.paden.web, v.web.data, opties),
    opslag.upload(v.plan.paden.mini, v.mini.data, opties),
  ]);
  if (r1.error || r2.error) {
    console.error("Verkleinde versies opslaan mislukt", r1.error?.message ?? r2.error?.message);
    return null;
  }
  return {
    origineel: v.origineel,
    web: { breedte: v.web.breedte, hoogte: v.web.hoogte },
    webPad: v.plan.paden.web,
    miniPad: v.plan.paden.mini,
    webUrl: opslag.getPublicUrl(v.plan.paden.web).data.publicUrl,
    miniUrl: opslag.getPublicUrl(v.plan.paden.mini).data.publicUrl,
  };
}
