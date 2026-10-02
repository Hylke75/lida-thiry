"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { MAAT_VELDEN } from "@/lib/test-config";
import { MEET_BUCKET, MEET_MAX_BYTES, MEET_TYPES } from "@/lib/meetbeelden-regels";

type Uitkomst<T = object> = ({ ok: true } & T) | { ok: false; fout: string };

function geldigeMaat(sleutel: string): boolean {
  return MAAT_VELDEN.some((v) => v.sleutel === sleutel);
}

/**
 * Stap 1: maakt een eenmalige upload-URL. De browser uploadt de foto daarna
 * rechtstreeks naar Supabase Storage (zo omzeilen we de limiet op de grootte van
 * serververzoeken). De bucket zelf bewaakt ook het type en de maximale grootte.
 */
export async function maakUploadUrl(
  sleutel: string,
  type: string,
  grootte: number,
): Promise<Uitkomst<{ pad: string; token: string }>> {
  await vereisBeheerder();
  if (!geldigeMaat(sleutel)) return { ok: false, fout: "Onbekende maat." };
  const ext = MEET_TYPES[type];
  if (!ext) return { ok: false, fout: "Kies een foto van het type JPG, PNG of WebP." };
  if (!(grootte > 0) || grootte > MEET_MAX_BYTES) {
    return { ok: false, fout: "De foto is te groot. Kies een foto van maximaal 5 MB." };
  }
  // Unieke naam per upload, zodat browsers nooit een oude versie uit hun cache tonen.
  const pad = `${sleutel}/${Date.now()}-${randomBytes(4).toString("hex")}.${ext}`;
  const { data, error } = await adminClient().storage.from(MEET_BUCKET).createSignedUploadUrl(pad);
  if (error || !data) return { ok: false, fout: `Uploaden is niet gelukt (${error?.message ?? "onbekend"}).` };
  return { ok: true, pad, token: data.token };
}

/** Stap 2: na een geslaagde upload de foto koppelen aan de maat en de oude opruimen. */
export async function bevestigUpload(sleutel: string, pad: string): Promise<Uitkomst> {
  await vereisBeheerder();
  if (!geldigeMaat(sleutel)) return { ok: false, fout: "Onbekende maat." };
  const m = new RegExp(`^${sleutel}/([\\w-]+\\.(?:jpg|png|webp))$`).exec(pad);
  if (!m) return { ok: false, fout: "Ongeldige bestandsnaam." };

  const supabase = adminClient();
  const { data: bestanden } = await supabase.storage.from(MEET_BUCKET).list(sleutel, { search: m[1] });
  if (!bestanden?.some((b) => b.name === m[1])) {
    return { ok: false, fout: "De foto is niet goed aangekomen. Probeer het opnieuw." };
  }

  const { data: oud } = await supabase
    .from("meetinstructie_beelden")
    .select("pad")
    .eq("maat_sleutel", sleutel)
    .maybeSingle();

  const { error } = await supabase
    .from("meetinstructie_beelden")
    .upsert({ maat_sleutel: sleutel, pad, bijgewerkt_op: new Date().toISOString() });
  if (error) return { ok: false, fout: `Opslaan is niet gelukt (${error.message}).` };

  if (oud?.pad && oud.pad !== pad) await supabase.storage.from(MEET_BUCKET).remove([oud.pad]);
  revalidatePath("/admin/meetinstructies");
  return { ok: true };
}

/** Verwijdert de foto van een maat; de test toont dan weer de tekening. */
export async function verwijderFoto(formData: FormData) {
  await vereisBeheerder();
  const sleutel = String(formData.get("sleutel") ?? "");
  if (!geldigeMaat(sleutel)) redirect("/admin/meetinstructies");
  const supabase = adminClient();
  const { data: oud } = await supabase
    .from("meetinstructie_beelden")
    .select("pad")
    .eq("maat_sleutel", sleutel)
    .maybeSingle();
  await supabase.from("meetinstructie_beelden").delete().eq("maat_sleutel", sleutel);
  if (oud?.pad) await supabase.storage.from(MEET_BUCKET).remove([oud.pad]);
  revalidatePath("/admin/meetinstructies");
  redirect(`/admin/meetinstructies?verwijderd=${sleutel}`);
}
