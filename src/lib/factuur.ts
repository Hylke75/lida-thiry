import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstellingen } from "./instellingen";
import { maakFactuurPdf } from "./pdf/factuur";
import { jaarInNederland } from "./prijs";
import { datumLang } from "./datum";
import { FACTUREN } from "./opslag";
import { BEDRIJFSNAAM_STANDAARD } from "./site";
import { leesBtwProcent, leesProductNaam } from "./verkoop/regels";

const BUCKET = FACTUREN;

/** Verkopergegevens op facturen en creditnota's. */
function verkoper(inst: Record<string, string | null>) {
  return {
    naam: inst.bedrijfsnaam?.trim() || BEDRIJFSNAAM_STANDAARD,
    adres: inst.bedrijf_adres?.trim() || null,
    kvk: inst.kvk_nummer?.trim() || null,
    btw: inst.btw_nummer?.trim() || null,
    email: inst.contact_email?.trim() || null,
  };
}

/** Tekst in het 'voldaan'-vak per betaalwijze (standaard: via Mollie). */
function voldaanTekst(betaalwijze: string | null, betaaldOp: string): string | undefined {
  return betaalwijze === "overboeking"
    ? `Voldaan: betaald per bankoverschrijving op ${betaaldOp}. Je hoeft niets meer te betalen.`
    : undefined;
}

export interface Factuur {
  factuurnummer: string;
  bestandsnaam: string;
  pdf: Buffer;
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
 * Reserveert het volgende factuurnummer en legt het vast op de order of
 * cadeaubon, in één databasetransactie (geen verloren nummers bij gelijktijdige
 * aanroepen of fouten). Had de rij al een nummer, dan komt dat terug.
 */
async function kenFactuurnummerToe(soort: "order" | "cadeaubon", id: string, betaaldOp: Date): Promise<string> {
  const { data, error } = await adminClient().rpc("ken_factuurnummer_toe", {
    p_soort: soort,
    p_id: id,
    p_jaar: jaarInNederland(betaaldOp),
  });
  if (error || typeof data !== "string" || !data) {
    throw new Error(`Factuurnummer toekennen mislukt: ${error?.message ?? "geen nummer"}`);
  }
  return data;
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
      "id, klantnaam, email, factuurgegevens, bedrag_cent, korting_cent, kortingscode, valuta, betaald_op, factuurnummer, betaalwijze, btw_procent",
    )
    .eq("id", orderId)
    .single();
  if (error || !order) throw new Error(`Order ${orderId} niet gevonden: ${error?.message ?? ""}`);
  if (!order.bedrag_cent || order.bedrag_cent <= 0) return null;

  const betaaldOp = order.betaald_op ? new Date(order.betaald_op) : new Date();

  const factuurnummer = order.factuurnummer ?? (await kenFactuurnummerToe("order", orderId, betaaldOp));

  const inst = await leesInstellingen();
  const korting = order.korting_cent ?? 0;
  // Het tarief van een eerder gemaakte factuur blijft gelijk (opnieuw maken = zelfde factuur).
  // Facturen van vóór de btw-instelling hadden 21%.
  const btwProcent: number = order.btw_procent ?? (order.factuurnummer ? 21 : leesBtwProcent(inst.btw_procent));
  const pdf = await maakFactuurPdf({
    factuurnummer,
    factuurdatum: datumLang(betaaldOp),
    betaaldOp: datumLang(betaaldOp),
    verkoper: verkoper(inst),
    koper: {
      naam: order.klantnaam,
      email: order.email,
      adresregels: adresregels(order.factuurgegevens),
    },
    omschrijving: leesProductNaam(inst.product_naam),
    prijsCent: order.bedrag_cent + korting,
    kortingCent: korting,
    kortingscode: order.kortingscode,
    totaalCent: order.bedrag_cent,
    valuta: order.valuta || "EUR",
    btwProcent,
    voldaanTekst: voldaanTekst(order.betaalwijze, datumLang(betaaldOp)),
  });

  const pad = `${factuurnummer}.pdf`;
  const { error: e3 } = await supabase.storage
    .from(BUCKET)
    .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
  if (e3) throw new Error(`Factuur uploaden mislukt: ${e3.message}`);
  const { error: e4 } = await supabase.from("orders").update({ factuur_pad: pad, btw_procent: btwProcent }).eq("id", orderId);
  if (e4) throw new Error(`Factuurpad opslaan mislukt: ${e4.message}`);

  return { factuurnummer, bestandsnaam: `factuur-${factuurnummer}.pdf`, pdf };
}

/**
 * Factuur voor een gekochte cadeaubon: doorlopend nummer uit dezelfde reeks als de
 * bestellingen (vastgelegd op de cadeaubonbestelling, zodat een herhaalde aanroep
 * hetzelfde nummer houdt), PDF in de bucket 'facturen' en het pad op de
 * cadeaubonbestelling. Gooit bij fouten.
 */
export async function maakCadeaubonFactuur(bonId: string): Promise<Factuur> {
  const supabase = adminClient();
  const { data: bon, error } = await supabase
    .from("cadeaubon_bestellingen")
    .select("id, koper_naam, koper_email, ontvanger_naam, bedrag_cent, valuta, betaald_op, factuurnummer, btw_procent")
    .eq("id", bonId)
    .single();
  if (error || !bon) throw new Error(`Cadeaubon ${bonId} niet gevonden: ${error?.message ?? ""}`);

  const betaaldOp = bon.betaald_op ? new Date(bon.betaald_op) : new Date();
  const factuurnummer: string = bon.factuurnummer ?? (await kenFactuurnummerToe("cadeaubon", bonId, betaaldOp));

  const inst = await leesInstellingen();
  const btwProcent: number = bon.btw_procent ?? (bon.factuurnummer ? 21 : leesBtwProcent(inst.btw_procent));
  const pdf = await maakFactuurPdf({
    factuurnummer,
    factuurdatum: datumLang(betaaldOp),
    betaaldOp: datumLang(betaaldOp),
    verkoper: verkoper(inst),
    koper: { naam: bon.koper_naam, email: bon.koper_email, adresregels: [] },
    omschrijving: bon.ontvanger_naam
      ? `Cadeaubon kledingadviestest (voor ${bon.ontvanger_naam})`
      : "Cadeaubon kledingadviestest",
    prijsCent: bon.bedrag_cent,
    kortingCent: 0,
    kortingscode: null,
    totaalCent: bon.bedrag_cent,
    valuta: bon.valuta || "EUR",
    btwProcent,
  });

  const pad = `${factuurnummer}.pdf`;
  const { error: e2 } = await supabase.storage
    .from(BUCKET)
    .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
  if (e2) throw new Error(`Factuur uploaden mislukt: ${e2.message}`);
  const { error: e3 } = await supabase
    .from("cadeaubon_bestellingen")
    .update({ factuur_pad: pad, btw_procent: btwProcent })
    .eq("id", bonId);
  if (e3) throw new Error(`Factuurpad opslaan mislukt: ${e3.message}`);

  return { factuurnummer, bestandsnaam: `factuur-${factuurnummer}.pdf`, pdf };
}

export interface Creditnota extends Factuur {
  id: string;
}

/**
 * Maakt een creditnota (negatieve factuur) voor een terugbetaling: een nummer uit
 * dezelfde doorlopende reeks als de facturen (zie de migratie verkoop_beheer), met
 * een verwijzing naar de oorspronkelijke factuur, het tarief van die factuur en de
 * PDF in de bucket 'facturen'. Gooit bij fouten.
 */
export async function maakCreditnota(opts: {
  soort: "order" | "cadeaubon";
  bronId: string;
  bedragCent: number;
  reden: string | null;
  door: string | null;
}): Promise<Creditnota> {
  const supabase = adminClient();
  const inst = await leesInstellingen();
  let koper: { naam: string; email: string; adresregels: string[] };
  let omschrijving: string;
  let btwProcent: number;
  let valuta: string;
  if (opts.soort === "order") {
    const { data: o, error } = await supabase
      .from("orders")
      .select("klantnaam, email, factuurgegevens, valuta, btw_procent, factuurnummer")
      .eq("id", opts.bronId)
      .single();
    if (error || !o) throw new Error(`Bestelling niet gevonden: ${error?.message ?? ""}`);
    koper = { naam: o.klantnaam, email: o.email, adresregels: adresregels(o.factuurgegevens) };
    omschrijving = leesProductNaam(inst.product_naam);
    btwProcent = o.btw_procent ?? (o.factuurnummer ? 21 : leesBtwProcent(inst.btw_procent));
    valuta = o.valuta || "EUR";
  } else {
    const { data: b, error } = await supabase
      .from("cadeaubon_bestellingen")
      .select("koper_naam, koper_email, ontvanger_naam, valuta, btw_procent, factuurnummer")
      .eq("id", opts.bronId)
      .single();
    if (error || !b) throw new Error(`Cadeaubon niet gevonden: ${error?.message ?? ""}`);
    koper = { naam: b.koper_naam, email: b.koper_email, adresregels: [] };
    omschrijving = b.ontvanger_naam ? `Cadeaubon kledingadviestest (voor ${b.ontvanger_naam})` : "Cadeaubon kledingadviestest";
    btwProcent = b.btw_procent ?? (b.factuurnummer ? 21 : leesBtwProcent(inst.btw_procent));
    valuta = b.valuta || "EUR";
  }

  const nu = new Date();
  const { data, error } = await supabase.rpc("maak_creditnota", {
    p_soort: opts.soort,
    p_bron_id: opts.bronId,
    p_jaar: jaarInNederland(nu),
    p_bedrag_cent: opts.bedragCent,
    p_btw_procent: btwProcent,
    p_valuta: valuta,
    p_reden: opts.reden,
    p_door: opts.door,
  });
  const rij = (Array.isArray(data) ? data[0] : data) as { id?: string; nummer?: string } | null;
  if (error || !rij?.id || !rij.nummer) {
    throw new Error(`Creditnota aanmaken mislukt: ${error?.message ?? "geen nummer"}`);
  }
  const { data: cn } = await supabase.from("creditnotas").select("origineel_nummer").eq("id", rij.id).single();
  const origineel = (cn?.origineel_nummer as string | null | undefined) ?? null;

  const regel = [`Creditering ${omschrijving.charAt(0).toLowerCase()}${omschrijving.slice(1)}`, opts.reden?.trim()]
    .filter(Boolean)
    .join(" – ");
  const pdf = await maakFactuurPdf({
    factuurnummer: rij.nummer,
    factuurdatum: datumLang(nu),
    betaaldOp: datumLang(nu),
    verkoper: verkoper(inst),
    koper,
    omschrijving: regel,
    prijsCent: opts.bedragCent,
    kortingCent: 0,
    kortingscode: null,
    totaalCent: opts.bedragCent,
    valuta,
    btwProcent,
    creditnota: { origineelNummer: origineel },
    voldaanTekst: `Dit bedrag wordt teruggestort op de rekening waarmee je hebt betaald${origineel ? ` (factuur ${origineel})` : ""}.`,
  });

  const pad = `${rij.nummer}.pdf`;
  const { error: e2 } = await supabase.storage
    .from(BUCKET)
    .upload(pad, pdf, { contentType: "application/pdf", upsert: true });
  if (e2) throw new Error(`Creditnota uploaden mislukt: ${e2.message}`);
  const { error: e3 } = await supabase.from("creditnotas").update({ pad }).eq("id", rij.id);
  if (e3) throw new Error(`Pad creditnota opslaan mislukt: ${e3.message}`);
  return { id: rij.id, factuurnummer: rij.nummer, bestandsnaam: `creditnota-${rij.nummer}.pdf`, pdf };
}

/** Tijdelijke signed URL voor een factuur (bijv. voor het beheer). */
export async function signedFactuurUrl(pad: string, secondenGeldig = 3600): Promise<string | null> {
  const { data } = await adminClient().storage.from(BUCKET).createSignedUrl(pad, secondenGeldig);
  return data?.signedUrl ?? null;
}
