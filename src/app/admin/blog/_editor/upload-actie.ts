"use server";

import { randomUUID } from "node:crypto";
import { vereisBeheerder } from "@/lib/admin-auth";
import { adminClient } from "@/lib/supabase/admin";
import { BLOG_AFBEELDING_MAX_BYTES, BLOG_AFBEELDING_TYPES, BLOG_BUCKET, type UploadMap } from "@/lib/blog/beheer";

/** Voor welke editor: blog (map omslag/ of afbeeldingen/) of pagina's (onder paginas/). */
export type EditorUploadSoort = "blog" | "paginas";

type Uitkomst = { ok: true; pad: string; token: string; url: string } | { ok: false; fouten: string[] };

/**
 * Stap 1 van een foto uploaden in de blog- of pagina-editor: een eenmalige
 * upload-URL in de openbare bucket "blog". De browser uploadt daarna zelf.
 */
export async function maakEditorUpload(soort: EditorUploadSoort, type: string, grootte: number, map: UploadMap): Promise<Uitkomst> {
  const paginas = soort === "paginas";
  await vereisBeheerder(paginas ? "paginas" : "blog");
  const ext = BLOG_AFBEELDING_TYPES[type];
  if (!ext) return { ok: false, fouten: ["Kies een afbeelding van het type JPG, PNG, GIF of WebP."] };
  if (!(grootte > 0) || grootte > BLOG_AFBEELDING_MAX_BYTES) {
    return { ok: false, fouten: ["De afbeelding is te groot. Kies een bestand van maximaal 5 MB."] };
  }
  const pad = `${paginas ? "paginas/" : ""}${map === "omslag" ? "omslag" : "afbeeldingen"}/${randomUUID()}.${ext}`;
  const supabase = adminClient();
  const { data, error } = await supabase.storage.from(BLOG_BUCKET).createSignedUploadUrl(pad);
  if (error || !data) return { ok: false, fouten: [`Uploaden is niet gelukt (${error?.message ?? "onbekend"}).`] };
  const url = supabase.storage.from(BLOG_BUCKET).getPublicUrl(pad).data.publicUrl;
  return { ok: true, pad, token: data.token, url };
}
