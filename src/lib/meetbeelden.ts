import "server-only";
import { adminClient } from "./supabase/admin";
import { MEET_BUCKET } from "./meetbeelden-regels";

export interface MeetBeeld {
  pad: string;
  url: string;
  bijgewerkt_op: string;
}

/** Alle geüploade meetfoto's per maat-sleutel. Bij een fout: leeg (tekening blijft). */
export async function leesMeetBeeldRijen(): Promise<Record<string, MeetBeeld>> {
  try {
    const supabase = adminClient();
    const { data, error } = await supabase
      .from("meetinstructie_beelden")
      .select("maat_sleutel, pad, bijgewerkt_op");
    if (error || !data) return {};
    const uit: Record<string, MeetBeeld> = {};
    for (const rij of data) {
      const { data: pub } = supabase.storage.from(MEET_BUCKET).getPublicUrl(rij.pad);
      uit[rij.maat_sleutel] = { pad: rij.pad, url: pub.publicUrl, bijgewerkt_op: rij.bijgewerkt_op };
    }
    return uit;
  } catch {
    return {};
  }
}

/** Alleen de publieke URL's per maat-sleutel, voor de test. */
export async function leesMeetBeelden(): Promise<Record<string, string>> {
  const rijen = await leesMeetBeeldRijen();
  return Object.fromEntries(Object.entries(rijen).map(([k, v]) => [k, v.url]));
}
