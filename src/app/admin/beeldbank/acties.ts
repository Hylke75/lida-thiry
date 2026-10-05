"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BEELD_BUCKET, MAX_UPLOAD_BYTES, TOEGESTANE_TYPES } from "@/lib/beeldbank-regels";
import { controleerMetadata } from "@/lib/beeldbank-beheer";
import {
  bepaalOntbrekendeAfmetingen,
  maakUploadUrl,
  verwerkUpload,
  zetVorigeVersieTerug,
} from "@/lib/beeldbank";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const EXTENSIES: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export type FormulierStatus = { ok: boolean; fouten: string[]; melding?: string };

/** Stap 1 van een upload: eenmalige upload-URL (de browser uploadt rechtstreeks). */
export async function vraagUploadUrl(
  type: string,
  grootte: number,
): Promise<{ ok: true; pad: string; token: string } | { ok: false; fout: string }> {
  await vereisBeheerder("advies");
  if (!(TOEGESTANE_TYPES as readonly string[]).includes(type)) {
    return { ok: false, fout: "Gebruik een JPG-, PNG- of WebP-bestand." };
  }
  if (!(grootte > 0) || grootte > MAX_UPLOAD_BYTES) {
    return { ok: false, fout: "Het bestand is groter dan 15 MB. Kies een kleiner bestand." };
  }
  try {
    const { pad, token } = await maakUploadUrl(EXTENSIES[type]);
    return { ok: true, pad, token };
  } catch {
    return { ok: false, fout: "Uploaden kon niet worden gestart. Probeer het later opnieuw." };
  }
}

/**
 * Stap 2: het geüploade bestand controleren en verwerken. Bij vervangen
 * (beeldId gegeven) worden ook de bestanden opgeruimd die nergens meer naar
 * verwijzen (de oude miniatuur en de versie van vóór de vorige).
 */
export async function verwerkBeeld(
  pad: string,
  beeldId: string | null,
): Promise<{ ok: true; id: string } | { ok: false; fouten: string[] }> {
  await vereisBeheerder("advies");
  if (beeldId && !UUID.test(beeldId)) return { ok: false, fouten: ["Beeld niet gevonden."] };
  const supabase = adminClient();

  let oud: { thumb_pad: string | null; vorige_pad: string | null } | null = null;
  if (beeldId) {
    const { data } = await supabase.from("beelden").select("thumb_pad, vorige_pad").eq("id", beeldId).maybeSingle();
    oud = data;
  }

  const uitkomst = await verwerkUpload(pad, beeldId);
  if (!uitkomst.ok) return uitkomst;

  if (oud) {
    const nieuw = uitkomst.beeld;
    const inGebruik = new Set([nieuw.pad, nieuw.thumb_pad, nieuw.origineel_pad, nieuw.vorige_pad]);
    const opruimen = [oud.thumb_pad, oud.vorige_pad].filter(
      (p): p is string => Boolean(p && p.startsWith("beeldbank/") && !inGebruik.has(p)),
    );
    if (opruimen.length) await supabase.storage.from(BEELD_BUCKET).remove(opruimen);
  }

  revalidatePath("/admin/beeldbank");
  revalidatePath(`/admin/beeldbank/${uitkomst.beeld.id}`);
  return { ok: true, id: uitkomst.beeld.id };
}

/** Bepaalt de afmetingen van (een deel van) de beelden waarvan ze nog ontbreken. */
export async function bepaalAfmetingen() {
  await vereisBeheerder("advies");
  const { verwerkt, onleesbaar, open } = await bepaalOntbrekendeAfmetingen(150);
  revalidatePath("/admin/beeldbank");
  redirect(`/admin/beeldbank?bepaald=${verwerkt}&open=${open}${onleesbaar ? `&onleesbaar=${onleesbaar}` : ""}`);
}

/** Slaat naam, onderdeel, omschrijving, figuur, advies, bijschrift en status op. */
export async function slaGegevensOp(_vorige: FormulierStatus, fd: FormData): Promise<FormulierStatus> {
  await vereisBeheerder("advies");
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) return { ok: false, fouten: ["Beeld niet gevonden."] };
  const { waarden, fouten } = controleerMetadata(fd);
  if (fouten.length) return { ok: false, fouten };

  const supabase = adminClient();
  if (waarden.naam) {
    const { data: ander } = await supabase
      .from("beelden")
      .select("code")
      .eq("naam", waarden.naam)
      .neq("id", id)
      .maybeSingle();
    if (ander) {
      return {
        ok: false,
        fouten: [
          `De naam ‘${waarden.naam}’ is al in gebruik bij beeld ${ander.code}. Kies een andere naam, bijvoorbeeld door er een cijfer of extra woord aan toe te voegen.`,
        ],
      };
    }
  }

  const { error } = await supabase.from("beelden").update(waarden).eq("id", id);
  if (error) {
    if (error.code === "23505") {
      return { ok: false, fouten: [`De naam ‘${waarden.naam}’ is al in gebruik. Kies een andere naam.`] };
    }
    return { ok: false, fouten: [`Opslaan is niet gelukt (${error.message}).`] };
  }
  revalidatePath("/admin/beeldbank");
  revalidatePath(`/admin/beeldbank/${id}`);
  return { ok: true, fouten: [], melding: "De gegevens zijn opgeslagen." };
}

export async function zetTerug(fd: FormData) {
  await vereisBeheerder("advies");
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/beeldbank");
  const gelukt = await zetVorigeVersieTerug(id);
  revalidatePath("/admin/beeldbank");
  revalidatePath(`/admin/beeldbank/${id}`);
  redirect(`/admin/beeldbank/${id}?${gelukt ? "teruggezet=1" : "fout=terugzetten"}`);
}

/** Verwijdert een beeld dat nergens gebruikt wordt, inclusief de bestanden. */
export async function verwijderBeeld(fd: FormData) {
  await vereisBeheerder("advies");
  const id = String(fd.get("id") ?? "");
  if (!UUID.test(id)) redirect("/admin/beeldbank");
  const supabase = adminClient();

  const { count } = await supabase
    .from("sectie_beelden")
    .select("beeld_id", { count: "exact", head: true })
    .eq("beeld_id", id);
  if ((count ?? 0) > 0) redirect(`/admin/beeldbank/${id}?fout=in-gebruik`);

  const { data: b } = await supabase
    .from("beelden")
    .select("code, pad, thumb_pad, origineel_pad, vorige_pad")
    .eq("id", id)
    .maybeSingle();
  if (!b) redirect("/admin/beeldbank");

  const { error } = await supabase.from("beelden").delete().eq("id", id);
  if (error) redirect(`/admin/beeldbank/${id}?fout=verwijderen`);

  const paden = [b.pad, b.thumb_pad, b.origineel_pad, b.vorige_pad].filter((p): p is string => Boolean(p));
  if (paden.length) await supabase.storage.from(BEELD_BUCKET).remove([...new Set(paden)]);

  revalidatePath("/admin/beeldbank");
  redirect(`/admin/beeldbank?verwijderd=${encodeURIComponent(b.code)}`);
}
