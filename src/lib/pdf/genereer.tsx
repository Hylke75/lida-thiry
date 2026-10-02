import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminClient } from "@/lib/supabase/admin";
import { AdviesPdf, type PdfSectie, type PdfSilhouet } from "./document";
import { silhouetVoorSleutel } from "@/lib/test-config";
import { vormUitMaten } from "@/lib/lichaam-pad";

const BUCKET = "adviezen-pdf";
const BEELD_BUCKET = "advies-beelden";

/** Downloadt een adviesbeeld en geeft het als data-URI terug (voor de PDF). */
async function beeldDataUri(
  supabase: ReturnType<typeof adminClient>,
  pad: string,
): Promise<string | null> {
  const { data } = await supabase.storage.from(BEELD_BUCKET).download(pad);
  if (!data) return null;
  const mime = pad.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${mime};base64,${base64}`;
}

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

  const { data: sectieRijen } = await supabase
    .from("adviessecties")
    .select("kop, tekst, afbeeldingen")
    .eq("type_sleutel", order.toegekend_type)
    .order("volgorde", { ascending: true });

  // Alle beelden parallel downloaden (veel sneller dan serieel).
  const secties: PdfSectie[] = await Promise.all(
    (sectieRijen ?? []).map(async (s) => {
      const paden = (s.afbeeldingen as string[]) ?? [];
      const beelden = (
        await Promise.all(paden.map((pad) => beeldDataUri(supabase, pad)))
      ).filter((uri): uri is string => uri !== null);
      return { kop: s.kop, tekst: s.tekst, beelden };
    }),
  );

  const { data: res } = await supabase
    .from("testresultaten")
    .select("lengte_cm, gewicht_kg, borst, taille, hoge_heup, heup, binnenbeen, schouder")
    .eq("order_id", orderId)
    .single();

  // Silhouet op de voorpagina: getekend naar de eigen maten als die er (nog)
  // zijn; na anonimisering valt het terug op het standaardsilhouet van de letter.
  const optie = silhouetVoorSleutel(order.toegekend_type);
  const eigenMaten =
    res?.borst != null && res.taille != null && res.hoge_heup != null && res.heup != null;
  const silhouet: PdfSilhouet | null = optie
    ? {
        naam: optie.naam,
        uitleg: optie.uitleg,
        eigenMaten,
        vorm: eigenMaten
          ? vormUitMaten({
              borst: res.borst,
              taille: res.taille,
              hogeHeup: res.hoge_heup,
              heup: res.heup,
              schouder: res.schouder,
            })
          : optie.vorm,
      }
    : null;

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
      secties={secties}
      silhouet={silhouet}
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
