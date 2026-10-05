import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminClient } from "@/lib/supabase/admin";
import { AdviesPdf, type PdfMaten, type PdfSectie, type PdfSilhouet } from "./document";
import { haalAdviesInhoud } from "@/lib/advies-inhoud";
import { BEELD_BUCKET } from "@/lib/beeldbank-regels";
import { silhouetVoorSleutel } from "@/lib/lichaamstypes";
import { vormUitMaten } from "@/lib/lichaam-pad";

const BUCKET = "adviezen-pdf";

/**
 * Downloadt een adviesbeeld en geeft het als data-URI terug (voor de PDF).
 * Streng: gooit als het beeld niet te downloaden is; anders null.
 */
async function beeldDataUri(
  supabase: ReturnType<typeof adminClient>,
  pad: string,
  streng: boolean,
): Promise<string | null> {
  const { data, error } = await supabase.storage.from(BEELD_BUCKET).download(pad);
  if (!data) {
    if (streng) throw new Error(`Adviesbeeld ${pad} downloaden mislukt: ${error?.message ?? "geen data"}`);
    return null;
  }
  const mime = pad.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg";
  const base64 = Buffer.from(await data.arrayBuffer()).toString("base64");
  return `data:${mime};base64,${base64}`;
}

/**
 * Zet de secties van een adviestype om naar PDF-secties (beelden als data-URI).
 * Streng (voor de klant-PDF): gooit als er geen secties zijn of een beeld
 * ontbreekt, zodat er nooit een leeg of onvolledig advies wordt verstuurd.
 */
async function pdfSecties(
  supabase: ReturnType<typeof adminClient>,
  inhoud: NonNullable<Awaited<ReturnType<typeof haalAdviesInhoud>>>,
  streng = false,
): Promise<PdfSectie[]> {
  if (streng && inhoud.secties.length === 0) {
    throw new Error(`Adviestype ${inhoud.sleutel} heeft geen secties (adviesdocument niet geïmporteerd?).`);
  }
  // Alle beelden parallel downloaden; een beeld dat in meerdere secties staat maar één keer.
  const uris = new Map<string, Promise<string | null>>();
  for (const s of inhoud.secties)
    for (const b of s.beelden) if (!uris.has(b.pad)) uris.set(b.pad, beeldDataUri(supabase, b.pad, streng));
  return Promise.all(
    inhoud.secties.map(async (s) => ({
      kop: s.kop,
      tekst: s.tekst,
      beelden: (
        await Promise.all(
          s.beelden.map(async (b) => {
            const src = await uris.get(b.pad)!;
            return src ? { src, bijschrift: b.bijschrift } : null;
          }),
        )
      ).filter((b): b is NonNullable<typeof b> => b !== null),
    })),
  );
}

/**
 * Voorbeeld-PDF van een adviestype voor beheer (met voorbeeldmaten en het
 * standaardsilhouet). Wordt niet opgeslagen.
 */
export async function genereerVoorbeeldPdf(sleutel: string): Promise<Buffer | null> {
  const supabase = adminClient();
  const inhoud = await haalAdviesInhoud(sleutel);
  if (!inhoud) return null;
  const secties = await pdfSecties(supabase, inhoud);
  const optie = await silhouetVoorSleutel(sleutel);
  const maten: PdfMaten = {
    lengte_cm: null,
    gewicht_kg: null,
    borst: null,
    taille: null,
    hoge_heup: null,
    heup: null,
    binnenbeen: null,
    schouder: null,
  };
  return renderToBuffer(
    <AdviesPdf
      klantnaam="Voorbeeldklant"
      datum={new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
      sleutel={inhoud.sleutel}
      titel={inhoud.titel}
      maten={maten}
      secties={secties}
      silhouet={optie ? { naam: optie.naam, uitleg: optie.uitleg, eigenMaten: false, vorm: optie.vorm } : null}
    />,
  );
}

/**
 * Genereert de advies-PDF voor een order met een toegekend type, slaat 'm op in
 * de privé-bucket en bewaart het pad op de order. Geeft het pad terug, of null
 * als er (nog) geen type/advies is.
 */
export async function genereerAdviesPdf(orderId: string): Promise<string | null> {
  const supabase = adminClient();

  const { data: order, error: orderFout } = await supabase
    .from("orders")
    .select("id, klantnaam, toegekend_type, afgerond_op")
    .eq("id", orderId)
    .maybeSingle();
  if (orderFout) throw new Error(`Order lezen mislukt: ${orderFout.message}`);
  if (!order?.toegekend_type) return null;

  const inhoud = await haalAdviesInhoud(order.toegekend_type);
  if (!inhoud) return null; // Adviestype bestaat (nog) niet.
  const secties = await pdfSecties(supabase, inhoud, true);

  const { data: res, error: resFout } = await supabase
    .from("testresultaten")
    .select("lengte_cm, gewicht_kg, borst, taille, hoge_heup, heup, binnenbeen, schouder")
    .eq("order_id", orderId)
    .maybeSingle();
  if (resFout) throw new Error(`Testresultaat lezen mislukt: ${resFout.message}`);

  // Silhouet op de voorpagina: getekend naar de eigen maten als die er (nog)
  // zijn; na anonimisering valt het terug op het standaardsilhouet van de letter.
  const optie = await silhouetVoorSleutel(order.toegekend_type);
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
      sleutel={inhoud.sleutel}
      titel={inhoud.titel}
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

  const { error: padFout } = await supabase.from("orders").update({ pdf_pad: pad }).eq("id", orderId);
  if (padFout) throw new Error(`PDF-pad opslaan mislukt: ${padFout.message}`);
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
