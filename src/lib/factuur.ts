import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstellingen } from "./instellingen";
import { maakFactuurPdf } from "./pdf/factuur";
import { formatteerFactuurnummer, jaarInNederland } from "./prijs";

const BUCKET = "facturen";
const BTW_PROCENT = 21;

export interface Factuur {
  factuurnummer: string;
  bestandsnaam: string;
  pdf: Buffer;
}

function datumNl(iso: string | Date): string {
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

function adresregels(g: unknown): string[] {
  const f = (g ?? {}) as Record<string, unknown>;
  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const adres = tekst(f.adres);
  const plaatsregel = [tekst(f.postcode), tekst(f.plaats)].filter(Boolean).join("  ");
  const land = tekst(f.land);
  // Zonder adres of plaats voegt alleen het land niets toe.
  if (!adres && !plaatsregel) return [];
  return [adres, plaatsregel, land].filter(Boolean);
}

/**
 * Kent (eenmalig) een doorlopend factuurnummer toe, genereert de factuur-PDF,
 * bewaart die in de privé-bucket 'facturen' en zet het pad op de order.
 * Geeft null terug voor orders zonder te factureren bedrag (gratis/100% korting).
 * Gooit bij fouten; de aanroeper vangt dat af.
 */
export async function maakFactuur(orderId: string): Promise<Factuur | null> {
  const supabase = adminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select(
      "id, klantnaam, email, factuurgegevens, bedrag_cent, korting_cent, kortingscode, valuta, betaald_op, factuurnummer",
    )
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error(`Order ${orderId} niet gevonden: ${error?.message ?? ""}`);
  if (!order.bedrag_cent || order.bedrag_cent <= 0) return null;

  const betaaldOp = order.betaald_op ? new Date(order.betaald_op) : new Date();

  let factuurnummer: string | null = order.factuurnummer;
  if (!factuurnummer) {
    const jaar = jaarInNederland(betaaldOp);
    const { data: volgnummer, error: e1 } = await supabase.rpc("volgend_factuurvolgnummer", {
      p_jaar: jaar,
    });
    if (e1 || typeof volgnummer !== "number") {
      throw new Error(`Factuurnummer reserveren mislukt: ${e1?.message ?? "geen nummer"}`);
    }
    const nieuw = formatteerFactuurnummer(jaar, volgnummer);
    const { data: gezet, error: e2 } = await supabase
      .from("orders")
      .update({ factuurnummer: nieuw })
      .eq("id", orderId)
      .is("factuurnummer", null)
      .select("factuurnummer");
    if (e2) throw new Error(`Factuurnummer opslaan mislukt: ${e2.message}`);
    if (gezet && gezet.length > 0) {
      factuurnummer = nieuw;
    } else {
      // Gelijktijdig al toegekend: gebruik het bestaande nummer.
      const { data: opnieuw } = await supabase
        .from("orders")
        .select("factuurnummer")
        .eq("id", orderId)
        .single();
      factuurnummer = opnieuw?.factuurnummer ?? null;
      if (!factuurnummer) throw new Error("Factuurnummer kon niet worden vastgelegd.");
    }
  }

  const inst = await leesInstellingen();
  const korting = order.korting_cent ?? 0;
  const pdf = await maakFactuurPdf({
    factuurnummer,
    factuurdatum: datumNl(betaaldOp),
    betaaldOp: datumNl(betaaldOp),
    verkoper: {
      naam: inst.bedrijfsnaam?.trim() || "Lida Thiry Imago & Kledingadvies",
      adres: inst.bedrijf_adres?.trim() || null,
      kvk: inst.kvk_nummer?.trim() || null,
      btw: inst.btw_nummer?.trim() || null,
      email: inst.contact_email?.trim() || null,
    },
    koper: {
      naam: order.klantnaam,
      email: order.email,
      adresregels: adresregels(order.factuurgegevens),
    },
    omschrijving: "Persoonlijke kledingadviestest (online)",
    prijsCent: order.bedrag_cent + korting,
    kortingCent: korting,
    kortingscode: order.kortingscode,
    totaalCent: order.bedrag_cent,
    valuta: order.valuta || "EUR",
    btwProcent: BTW_PROCENT,
  });

  const pad = `${factuurnummer}.pdf`;
  const { error: e3 } = await supabase.storage
    .from(BUCKET)
    .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
  if (e3) throw new Error(`Factuur uploaden mislukt: ${e3.message}`);
  await supabase.from("orders").update({ factuur_pad: pad }).eq("id", orderId);

  return { factuurnummer, bestandsnaam: `factuur-${factuurnummer}.pdf`, pdf };
}

/**
 * Factuur voor een gekochte cadeaubon: doorlopend nummer uit dezelfde reeks als de
 * bestellingen, PDF in de bucket 'facturen' en het pad op de cadeaubonbestelling.
 * Het factuurnummer is de bestandsnaam van het pad (LT-2026-0001.pdf), zodat
 * een herhaalde aanroep hetzelfde nummer houdt. Gooit bij fouten.
 */
export async function maakCadeaubonFactuur(bonId: string): Promise<Factuur> {
  const supabase = adminClient();
  const { data: bon, error } = await supabase
    .from("cadeaubon_bestellingen")
    .select("id, koper_naam, koper_email, ontvanger_naam, bedrag_cent, valuta, betaald_op, factuur_pad")
    .eq("id", bonId)
    .single();
  if (error || !bon) throw new Error(`Cadeaubon ${bonId} niet gevonden: ${error?.message ?? ""}`);

  const betaaldOp = bon.betaald_op ? new Date(bon.betaald_op) : new Date();
  let factuurnummer = typeof bon.factuur_pad === "string" ? bon.factuur_pad.replace(/\.pdf$/, "") : null;
  if (!factuurnummer) {
    const jaar = jaarInNederland(betaaldOp);
    const { data: volgnummer, error: e1 } = await supabase.rpc("volgend_factuurvolgnummer", { p_jaar: jaar });
    if (e1 || typeof volgnummer !== "number") {
      throw new Error(`Factuurnummer reserveren mislukt: ${e1?.message ?? "geen nummer"}`);
    }
    factuurnummer = formatteerFactuurnummer(jaar, volgnummer);
  }

  const inst = await leesInstellingen();
  const pdf = await maakFactuurPdf({
    factuurnummer,
    factuurdatum: datumNl(betaaldOp),
    betaaldOp: datumNl(betaaldOp),
    verkoper: {
      naam: inst.bedrijfsnaam?.trim() || "Lida Thiry Imago & Kledingadvies",
      adres: inst.bedrijf_adres?.trim() || null,
      kvk: inst.kvk_nummer?.trim() || null,
      btw: inst.btw_nummer?.trim() || null,
      email: inst.contact_email?.trim() || null,
    },
    koper: { naam: bon.koper_naam, email: bon.koper_email, adresregels: [] },
    omschrijving: bon.ontvanger_naam
      ? `Cadeaubon kledingadviestest (voor ${bon.ontvanger_naam})`
      : "Cadeaubon kledingadviestest",
    prijsCent: bon.bedrag_cent,
    kortingCent: 0,
    kortingscode: null,
    totaalCent: bon.bedrag_cent,
    valuta: bon.valuta || "EUR",
    btwProcent: BTW_PROCENT,
  });

  const pad = `${factuurnummer}.pdf`;
  const { error: e2 } = await supabase.storage
    .from(BUCKET)
    .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
  if (e2) throw new Error(`Factuur uploaden mislukt: ${e2.message}`);
  const { error: e3 } = await supabase.from("cadeaubon_bestellingen").update({ factuur_pad: pad }).eq("id", bonId);
  if (e3) throw new Error(`Factuurpad opslaan mislukt: ${e3.message}`);

  return { factuurnummer, bestandsnaam: `factuur-${factuurnummer}.pdf`, pdf };
}

/** Tijdelijke signed URL voor een factuur (bijv. voor het beheer). */
export async function signedFactuurUrl(pad: string, secondenGeldig = 3600): Promise<string | null> {
  const { data } = await adminClient().storage.from(BUCKET).createSignedUrl(pad, secondenGeldig);
  return data?.signedUrl ?? null;
}
