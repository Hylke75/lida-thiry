import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminClient } from "@/lib/supabase/admin";
import { AdviesPdf, type PdfSectie } from "./document";

const BUCKET = "adviezen-pdf";

/**
 * Genereert de advies-PDF voor een order met een toegekend type, slaat 'm op in
 * de privé-bucket en bewaart het pad op de order. Geeft het pad terug, of null
 * als er (nog) geen type/advies is.
 */
export async function genereerAdviesPdf(orderId: string): Promise<string | null> {
  const supabase = adminClient();

  const { data: order } = await supabase
    .from("orders")
    .select("id, klantnaam, toegekend_type, afgerond_op")
    .eq("id", orderId)
    .single();
  if (!order?.toegekend_type) return null;

  const { data: type } = await supabase
    .from("adviestypes")
    .select("sleutel, titel")
    .eq("sleutel", order.toegekend_type)
    .single();
  if (!type) return null; // Adviesdocument nog niet geïmporteerd.

  const { data: secties } = await supabase
    .from("adviessecties")
    .select("kop, tekst")
    .eq("type_sleutel", order.toegekend_type)
    .order("volgorde", { ascending: true });

  const { data: res } = await supabase
    .from("testresultaten")
    .select("lengte_cm, gewicht_kg, borst, taille, hoge_heup, heup, binnenbeen, schouder")
    .eq("order_id", orderId)
    .single();

  const datum = new Date(order.afgerond_op ?? Date.now()).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const buffer = await renderToBuffer(
    <AdviesPdf
      klantnaam={order.klantnaam}
      datum={datum}
      sleutel={type.sleutel}
      titel={type.titel}
      maten={{
        lengte_cm: res?.lengte_cm ?? null,
        gewicht_kg: res?.gewicht_kg ?? null,
        borst: res?.borst ?? null,
        taille: res?.taille ?? null,
        hoge_heup: res?.hoge_heup ?? null,
        heup: res?.heup ?? null,
        binnenbeen: res?.binnenbeen ?? null,
        schouder: res?.schouder ?? null,
      }}
      secties={(secties ?? []) as PdfSectie[]}
    />,
  );

  const pad = `${orderId}.pdf`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(pad, buffer, { contentType: "application/pdf", upsert: true });
  if (error) throw new Error(`PDF uploaden: ${error.message}`);

  await supabase.from("orders").update({ pdf_pad: pad }).eq("id", orderId);
  return pad;
}

/** Tijdelijke signed URL om de PDF te downloaden (standaard 1 uur geldig). */
export async function signedPdfUrl(pad: string, secondenGeldig = 3600): Promise<string | null> {
  const supabase = adminClient();
  const { data } = await supabase.storage.from(BUCKET).createSignedUrl(pad, secondenGeldig);
  return data?.signedUrl ?? null;
}

/** Haalt de PDF-bytes op uit de privé-bucket (voor mailbijlage). */
export async function haalPdfBytes(pad: string): Promise<Buffer | null> {
  const supabase = adminClient();
  const { data } = await supabase.storage.from(BUCKET).download(pad);
  if (!data) return null;
  return Buffer.from(await data.arrayBuffer());
}
