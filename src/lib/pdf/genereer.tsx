import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { adminClient } from "@/lib/supabase/admin";
import { AdviesPdf, type PdfSectie } from "./document";
import { haalAdviesInhoud } from "@/lib/advies-inhoud";
import { BEELD_BUCKET } from "@/lib/beeldbank-regels";
import { silhouetVoorSleutel } from "@/lib/lichaamstypes";
import { ADVIEZEN_PDF } from "@/lib/opslag";
import { leesMerk } from "@/lib/merk";
import { leesSectie, leesSectieVers } from "@/lib/inhoud/lees";
import type { Sectie, SectieWaarden } from "@/lib/inhoud/schema";
import { PDF_ADVIES_INTRO, PDF_ADVIES_SLOT, PDF_ADVIES_VOORPAGINA, type AdviesPdfTeksten } from "@/lib/inhoud/groepen/pdf-advies";

const BUCKET = ADVIEZEN_PDF;

/**
 * De beheerbare teksten van de PDF (Beheer → Teksten → PDF-advies). Vers voor
 * het voorbeeld in het beheer; anders gecachet.
 */
async function leesPdfTeksten(vers: boolean): Promise<AdviesPdfTeksten> {
  const lees = <S extends Sectie>(s: S): Promise<SectieWaarden<S>> => (vers ? leesSectieVers(s) : leesSectie(s));
  const [voorpagina, intro, slot] = await Promise.all([
    lees(PDF_ADVIES_VOORPAGINA),
    lees(PDF_ADVIES_INTRO),
    lees(PDF_ADVIES_SLOT),
  ]);
  return { voorpagina, intro, slot };
}

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
      soort: s.veld_sleutel,
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
 * Voorbeeld-PDF van een adviestype voor beheer (voor een voorbeeldklant).
 * Wordt niet opgeslagen.
 */
export async function genereerVoorbeeldPdf(sleutel: string): Promise<Buffer | null> {
  const supabase = adminClient();
  const inhoud = await haalAdviesInhoud(sleutel);
  if (!inhoud) return null;
  const [secties, optie, merk, teksten] = await Promise.all([
    pdfSecties(supabase, inhoud),
    silhouetVoorSleutel(sleutel),
    leesMerk(),
    leesPdfTeksten(true),
  ]);
  return renderToBuffer(
    <AdviesPdf
      klantnaam="Voorbeeldklant"
      datum={new Date().toLocaleDateString("nl-NL", { day: "numeric", month: "long", year: "numeric" })}
      sleutel={inhoud.sleutel}
      titel={inhoud.titel}
      secties={secties}
      silhouet={optie ? { letter: optie.letter, naam: optie.naam } : null}
      merk={merk}
      teksten={teksten}
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

  const optie = await silhouetVoorSleutel(order.toegekend_type);

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
      secties={secties}
      silhouet={optie ? { letter: optie.letter, naam: optie.naam } : null}
      merk={await leesMerk()}
      teksten={await leesPdfTeksten(false)}
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
