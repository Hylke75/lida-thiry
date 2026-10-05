import "server-only";
import { randomBytes } from "node:crypto";
import { adminClient } from "../supabase/admin";
import { cadeauboncode } from "../prijs";
import { maakCadeaubonFactuur, type Factuur } from "../factuur";
import { maakCadeaubonPdf } from "../pdf/cadeaubon";
import { stuurCadeaubonKoperMail, stuurCadeaubonMail } from "../resend";
import { stuurBeheerMelding, foutTekst } from "../beheermelding";
import { siteUrl } from "../site";
import type { BonGegevens } from "../email-html";
import { cadeaubonGeldigTot, verzendenIsAanDeBeurt, type Bezorging } from "./regels";

export interface CadeaubonRij {
  id: string;
  koper_naam: string;
  koper_email: string;
  ontvanger_naam: string | null;
  ontvanger_email: string | null;
  boodschap: string | null;
  bezorging: Bezorging;
  verzend_op: string | null;
  bedrag_cent: number;
  valuta: string;
  status: "aangemaakt" | "betaald" | "verzonden" | "mislukt" | "verlopen";
  mollie_payment_id: string | null;
  kortingscode_id: string | null;
  factuur_pad: string | null;
  factuurnummer: string | null;
  betaald_op: string | null;
  verzonden_op: string | null;
  aangemaakt_op: string;
}

export const CADEAUBON_KOLOMMEN =
  "id, koper_naam, koper_email, ontvanger_naam, ontvanger_email, boodschap, bezorging, verzend_op, bedrag_cent, valuta, status, mollie_payment_id, kortingscode_id, factuur_pad, factuurnummer, betaald_op, verzonden_op, aangemaakt_op";

const FACTUUR_BUCKET = "facturen";

async function leesBon(id: string): Promise<CadeaubonRij | null> {
  const { data, error } = await adminClient()
    .from("cadeaubon_bestellingen")
    .select(CADEAUBON_KOLOMMEN)
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(`Cadeaubon lezen: ${error.message}`);
  return (data as CadeaubonRij | null) ?? null;
}

/**
 * Zorgt dat de bon een eigen kortingscode heeft (soort 'bedrag', eenmalig, 12
 * maanden geldig) en geeft de code terug. Idempotent: een al gekoppelde code
 * blijft; bij gelijktijdig aanmaken wint één koppeling en wordt de andere code
 * weer verwijderd.
 */
async function zorgVoorCode(bon: CadeaubonRij): Promise<{ code: string; geldigTot: string }> {
  const supabase = adminClient();
  if (bon.kortingscode_id) {
    const { data, error } = await supabase
      .from("kortingscodes")
      .select("code, geldig_tot")
      .eq("id", bon.kortingscode_id)
      .single();
    if (error || !data) throw new Error(`Gekoppelde code niet gevonden: ${error?.message ?? ""}`);
    return { code: data.code, geldigTot: data.geldig_tot ?? cadeaubonGeldigTot(new Date(), null) };
  }

  const geldigTot = cadeaubonGeldigTot(bon.betaald_op ? new Date(bon.betaald_op) : new Date(), bon.verzend_op);
  const voor = bon.ontvanger_naam?.trim() || bon.koper_naam;
  for (let poging = 0; poging < 4; poging++) {
    const code = cadeauboncode(randomBytes(8));
    const { data: nieuw, error } = await supabase
      .from("kortingscodes")
      .insert({
        code,
        omschrijving: `Cadeaubon voor ${voor} (gekocht door ${bon.koper_naam})`.slice(0, 200),
        soort: "bedrag",
        waarde: bon.bedrag_cent,
        max_gebruik: 1,
        geldig_tot: geldigTot,
      })
      .select("id")
      .single();
    if (error) {
      if (error.code === "23505") continue; // botsing: nieuwe code proberen
      throw new Error(`Code aanmaken mislukt: ${error.message}`);
    }
    const { data: gekoppeld, error: e2 } = await supabase
      .from("cadeaubon_bestellingen")
      .update({ kortingscode_id: nieuw.id })
      .eq("id", bon.id)
      .is("kortingscode_id", null)
      .select("id");
    if (e2) throw new Error(`Code koppelen mislukt: ${e2.message}`);
    if (gekoppeld && gekoppeld.length > 0) {
      bon.kortingscode_id = nieuw.id;
      return { code, geldigTot };
    }
    // Gelijktijdig al gekoppeld: deze code opruimen en de gekoppelde gebruiken.
    await supabase.from("kortingscodes").delete().eq("id", nieuw.id);
    const opnieuw = await leesBon(bon.id);
    if (!opnieuw?.kortingscode_id) throw new Error("Code koppelen mislukt.");
    return zorgVoorCode(opnieuw);
  }
  throw new Error("Kon geen unieke cadeauboncode maken.");
}

function bonGegevens(bon: CadeaubonRij, code: { code: string; geldigTot: string }): BonGegevens {
  return {
    koperNaam: bon.koper_naam,
    ontvangerNaam: bon.ontvanger_naam,
    bedragCent: bon.bedrag_cent,
    valuta: bon.valuta || "EUR",
    code: code.code,
    geldigTot: code.geldigTot,
    boodschap: bon.boodschap,
  };
}

async function bonPdf(gegevens: BonGegevens): Promise<{ bestandsnaam: string; pdf: Buffer } | null> {
  try {
    const pdf = await maakCadeaubonPdf(gegevens, `${siteUrl()}/bestellen`);
    return { bestandsnaam: `cadeaubon-${gegevens.code}.pdf`, pdf };
  } catch (e) {
    console.error("Cadeaubon-PDF maken mislukt", gegevens.code, e);
    return null;
  }
}

/** Haalt een eerder gemaakte factuur op uit de bucket (voor opnieuw versturen). */
async function bestaandeFactuur(pad: string | null): Promise<Factuur | null> {
  if (!pad) return null;
  try {
    const { data } = await adminClient().storage.from(FACTUUR_BUCKET).download(pad);
    if (!data) return null;
    const factuurnummer = pad.replace(/\.pdf$/, "");
    return { factuurnummer, bestandsnaam: `factuur-${factuurnummer}.pdf`, pdf: Buffer.from(await data.arrayBuffer()) };
  } catch {
    return null;
  }
}

async function markeerVerzonden(id: string): Promise<void> {
  const { error } = await adminClient()
    .from("cadeaubon_bestellingen")
    .update({ status: "verzonden", verzonden_op: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(`Bon verstuurd, maar niet gemarkeerd: ${error.message}`);
}

/**
 * Verwerkt de Mollie-status van een cadeaubonbetaling (vanuit de webhook).
 * Gooit bij databasefouten, zodat Mollie de webhook herhaalt.
 */
export async function verwerkCadeaubonBetaling(
  bonId: string,
  betaling: { id: string; status: string; terugbetaaldCent?: number },
): Promise<void> {
  const supabase = adminClient();
  const bon = await leesBon(bonId);
  if (!bon) return;

  if (betaling.status === "paid") {
    // Idempotent: alleen de eerste overgang naar 'betaald' levert een rij op.
    const { data: bijgewerkt, error } = await supabase
      .from("cadeaubon_bestellingen")
      .update({ status: "betaald", betaald_op: new Date().toISOString(), mollie_payment_id: betaling.id })
      .eq("id", bonId)
      .in("status", ["aangemaakt", "mislukt", "verlopen"])
      .select("id");
    if (error) throw new Error(error.message);
    if (bijgewerkt && bijgewerkt.length > 0) await naCadeaubonBetaling(bonId);
    if ((betaling.terugbetaaldCent ?? 0) > 0) await verwerkTerugbetaling(bonId, betaling.id, betaling.terugbetaaldCent!);
    return;
  }

  if (["failed", "expired", "canceled"].includes(betaling.status)) {
    const { error } = await supabase
      .from("cadeaubon_bestellingen")
      .update({ status: betaling.status === "expired" ? "verlopen" : "mislukt" })
      .eq("id", bonId)
      .eq("status", "aangemaakt")
      .eq("mollie_payment_id", betaling.id);
    if (error) throw new Error(error.message);
  }
}

/**
 * Terugbetaald of teruggeboekt (chargeback): de code van de bon uitschakelen en
 * de beheerder (eenmalig per nieuw bedrag) inlichten. Gooit bij databasefouten.
 */
async function verwerkTerugbetaling(bonId: string, betaalId: string, terugCent: number): Promise<void> {
  const supabase = adminClient();
  const { data: gewijzigd, error } = await supabase
    .from("cadeaubon_bestellingen")
    .update({ terugbetaald_cent: terugCent })
    .eq("id", bonId)
    .lt("terugbetaald_cent", terugCent)
    .select("kortingscode_id, koper_email, bedrag_cent");
  if (error) throw new Error(`Terugbetaling vastleggen: ${error.message}`);
  const rij = gewijzigd?.[0];
  if (!rij) return;
  let codeTekst = "Er was nog geen code aangemaakt.";
  if (rij.kortingscode_id) {
    const { data: code, error: e2 } = await supabase
      .from("kortingscodes")
      .update({ actief: false })
      .eq("id", rij.kortingscode_id)
      .select("code, aantal_gebruikt");
    if (e2) throw new Error(`Code uitschakelen: ${e2.message}`);
    const c = code?.[0];
    codeTekst = c
      ? `De code ${c.code} is uitgeschakeld${c.aantal_gebruikt > 0 ? " (let op: hij was al gebruikt)" : ""}.`
      : "De gekoppelde code is niet gevonden.";
  }
  await stuurBeheerMelding(
    "Cadeaubon terugbetaald of teruggeboekt",
    `Cadeaubon ${bonId} (${rij.koper_email}): betaling ${betaalId} is voor ${(terugCent / 100).toFixed(2)} terugbetaald of teruggeboekt (chargeback). ${codeTekst}`,
  );
}

/**
 * Na de eerste overgang naar 'betaald': code aanmaken, factuur maken en de bon
 * versturen (aan de koper, of aan de ontvanger als die datum is bereikt; anders
 * doet de dagelijkse cron dat later). De koper krijgt bij bezorging aan de
 * ontvanger een eigen bevestiging met de factuur. Gooit nooit.
 */
async function naCadeaubonBetaling(bonId: string): Promise<void> {
  try {
    const bon = await leesBon(bonId);
    if (!bon) return;
    const code = await zorgVoorCode(bon);

    let factuur: Factuur | null = null;
    try {
      factuur = await maakCadeaubonFactuur(bon.id);
    } catch (e) {
      console.error("Factuur cadeaubon mislukt", bon.id, e);
      await stuurBeheerMelding(
        "Factuur cadeaubon maken mislukt",
        `Cadeaubon ${bon.id} (${bon.koper_email}) is betaald, maar de factuur kon niet worden gemaakt.\n\n${foutTekst(e)}`,
      );
    }

    const gegevens = bonGegevens(bon, code);
    const pdf = await bonPdf(gegevens);

    if (bon.bezorging === "koper" || !bon.ontvanger_email) {
      await stuurCadeaubonMail({ aan: "koper", email: bon.koper_email, bon: gegevens, bonPdf: pdf, factuur });
      await markeerVerzonden(bon.id);
      return;
    }

    const nu = verzendenIsAanDeBeurt(bon.verzend_op);
    if (nu) {
      await stuurCadeaubonMail({ aan: "ontvanger", email: bon.ontvanger_email, bon: gegevens, bonPdf: pdf });
      await markeerVerzonden(bon.id);
    }
    try {
      await stuurCadeaubonKoperMail({
        email: bon.koper_email,
        bon: gegevens,
        ontvangerEmail: bon.ontvanger_email,
        verzendOp: nu ? null : bon.verzend_op,
        factuur,
      });
    } catch (e) {
      await stuurBeheerMelding(
        "Bevestiging cadeaubon aan koper mislukt",
        `Cadeaubon ${bon.id} (${bon.koper_email}): ${foutTekst(e)}`,
      );
    }
  } catch (e) {
    console.error("Afhandeling cadeaubon mislukt", bonId, e);
    await stuurBeheerMelding(
      "Cadeaubon betaald, maar niet (volledig) verstuurd",
      `Cadeaubon ${bonId} is betaald, maar de afhandeling liep vast. De nachtelijke controle probeert het opnieuw; je kunt de bon ook versturen via Beheer → Cadeaubonnen.\n\n${foutTekst(e)}`,
    );
  }
}

/**
 * Verstuurt de bon (opnieuw) naar wie hem moet krijgen, of als kopie naar de
 * koper (met de factuur, als die er is). Zorgt zo nodig eerst voor de code.
 * Gooit bij fouten.
 */
export async function verstuurBon(bonId: string, opts: { kopieNaarKoper?: boolean } = {}): Promise<string> {
  const bon = await leesBon(bonId);
  if (!bon) throw new Error("Cadeaubon niet gevonden.");
  if (bon.status !== "betaald" && bon.status !== "verzonden") throw new Error("Deze cadeaubon is niet betaald.");
  const code = await zorgVoorCode(bon);
  const gegevens = bonGegevens(bon, code);
  const pdf = await bonPdf(gegevens);

  // Mislukte de factuur eerder, dan nu alsnog maken (zelfde nummer als dat er al was).
  let factuur: Factuur | null = null;
  if (!bon.factuur_pad) {
    try {
      factuur = await maakCadeaubonFactuur(bon.id);
    } catch (e) {
      console.error("Factuur cadeaubon (opnieuw) mislukt", bon.id, e);
      await stuurBeheerMelding(
        "Factuur cadeaubon maken mislukt",
        `Cadeaubon ${bon.id} (${bon.koper_email}): de factuur kon (opnieuw) niet worden gemaakt.\n\n${foutTekst(e)}`,
      );
    }
  }

  const naarKoper = opts.kopieNaarKoper || bon.bezorging === "koper" || !bon.ontvanger_email;
  if (naarKoper) {
    factuur = factuur ?? (await bestaandeFactuur(bon.factuur_pad));
    await stuurCadeaubonMail({ aan: "koper", email: bon.koper_email, bon: gegevens, bonPdf: pdf, factuur });
    if (bon.bezorging === "koper" || !bon.ontvanger_email) await markeerVerzonden(bon.id);
    return bon.koper_email;
  }
  await stuurCadeaubonMail({ aan: "ontvanger", email: bon.ontvanger_email!, bon: gegevens, bonPdf: pdf });
  await markeerVerzonden(bon.id);
  return bon.ontvanger_email!;
}

/**
 * Dagelijkse cron: verstuurt betaalde bonnen die nog niet zijn verstuurd en
 * waarvan de verzenddatum is bereikt (ook bonnen waarvan het versturen eerder
 * mislukte). Meldt mislukkingen in één beheermelding. Gooit nooit.
 */
export async function verstuurGeplandeCadeaubonnen(): Promise<{ verstuurd: number; mislukt: number }> {
  const mislukt: string[] = [];
  let verstuurd = 0;
  try {
    const grens = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data, error } = await adminClient()
      .from("cadeaubon_bestellingen")
      .select("id, verzend_op, koper_email")
      .eq("status", "betaald")
      .lt("betaald_op", grens)
      .limit(200);
    if (error) throw new Error(error.message);
    for (const b of data ?? []) {
      if (!verzendenIsAanDeBeurt(b.verzend_op)) continue;
      try {
        await verstuurBon(b.id);
        verstuurd++;
      } catch (e) {
        console.error("Geplande cadeaubon mislukt", b.id, e);
        mislukt.push(`${b.id} (${b.koper_email}): ${foutTekst(e)}`);
      }
    }
  } catch (e) {
    mislukt.push(`Cadeaubonnen ophalen mislukt: ${foutTekst(e)}`);
  }
  if (mislukt.length) {
    await stuurBeheerMelding(
      "Cadeaubonnen niet verstuurd",
      `${mislukt.length} cadeaubon(nen) konden niet worden verstuurd:\n${mislukt.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  return { verstuurd, mislukt: mislukt.length };
}
