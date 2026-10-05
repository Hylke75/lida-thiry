import "server-only";
import { adminClient } from "../supabase/admin";
import { publiekClient, publiekGecached } from "../cache/publiek";
import { leesInstellingen } from "../instellingen";
import { centenNaarBedrag, mollie } from "../mollie";
import { koppelRelatie } from "../relaties/koppel";
import { foutTekst, stuurBeheerMelding } from "../beheermelding";
import { siteUrl } from "../site";
import { BETAALTERMIJN_MINUTEN, beschikbareDagen, conflicten, isVrij, laatsteDatum, type BezetteAfspraak, type Dag, type SlotInvoer } from "./slots";
import { datumPlusDagen, datumLabel, herinneringVenster, tijdLabel, vandaagAmsterdam, vanAmsterdam } from "./tijd";
import {
  leesAfspraakInstellingen,
  magAnnuleren,
  OPEN_STATUSSEN,
  type AfspraakInstellingen,
  type AfspraakSoort,
  type AfspraakStatus,
  type BoekInvoer,
} from "./regels";
import { meldBeheerder, naNieuweAfspraak, stuurAnnulering, stuurHerinnering } from "./mails";

export interface AfspraakRij {
  id: string;
  soort_id: string | null;
  relatie_id: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  opmerking: string | null;
  start_op: string;
  eind_op: string;
  status: AfspraakStatus;
  token: string;
  aanbetaling_cent: number;
  mollie_payment_id: string | null;
  betaald_op: string | null;
  herinnering_op: string | null;
  notitie: string;
  aangemaakt_op: string;
}

export const AFSPRAAK_VELDEN =
  "id, soort_id, relatie_id, naam, email, telefoon, opmerking, start_op, eind_op, status, token, aanbetaling_cent, mollie_payment_id, betaald_op, herinnering_op, notitie, aangemaakt_op";
const SOORT_VELDEN =
  "id, naam, omschrijving, duur_minuten, prijs_cent, aanbetaling_cent, locatie, online, buffer_minuten, actief, volgorde";

/** De afspraakinstellingen; standaardwaarden als de database niet bereikbaar is. */
export async function afspraakInstellingen(): Promise<AfspraakInstellingen> {
  try {
    return leesAfspraakInstellingen(await leesInstellingen());
  } catch (e) {
    console.error("Afspraakinstellingen niet gelezen; standaard gebruikt.", e);
    return leesAfspraakInstellingen({});
  }
}

export async function haalSoorten(alleenActief: boolean): Promise<AfspraakSoort[]> {
  let q = adminClient().from("afspraak_soorten").select(SOORT_VELDEN).order("volgorde").order("naam");
  if (alleenActief) q = q.eq("actief", true);
  const { data, error } = await q;
  if (error) throw new Error(`afspraaksoorten lezen: ${error.message}`);
  return (data ?? []) as AfspraakSoort[];
}

/**
 * De actieve soorten voor het boekingsblok op de site: gecachet onder de tag
 * "afspraken" (opslaan in Beheer → Afspraken vernieuwt direct), met een
 * tijdslimiet op de database. Gooit bij een fout. Boeken zelf leest vers (haalSoort).
 */
export const haalActieveSoortenPubliek = publiekGecached("afspraak-soorten", ["afspraken"], async (): Promise<AfspraakSoort[]> => {
  const { data, error } = await publiekClient()
    .from("afspraak_soorten")
    .select(SOORT_VELDEN)
    .eq("actief", true)
    .order("volgorde")
    .order("naam");
  if (error) throw new Error(`afspraaksoorten lezen: ${error.message}`);
  return (data ?? []) as AfspraakSoort[];
});

export async function haalSoort(id: string): Promise<AfspraakSoort | null> {
  const { data, error } = await adminClient().from("afspraak_soorten").select(SOORT_VELDEN).eq("id", id).maybeSingle();
  if (error) throw new Error(`afspraaksoort lezen: ${error.message}`);
  return (data as AfspraakSoort | null) ?? null;
}

type RuweBezetting = {
  id: string;
  start_op: string;
  eind_op: string;
  status: string;
  aangemaakt_op: string;
  afspraak_soorten: { buffer_minuten: number } | { buffer_minuten: number }[] | null;
};

/** Bestaande afspraken die een periode (ruim) raken, met de buffer van hun soort. */
export async function haalBezetting(van: Date, tot: Date): Promise<BezetteAfspraak[]> {
  const { data, error } = await adminClient()
    .from("afspraken")
    .select("id, start_op, eind_op, status, aangemaakt_op, afspraak_soorten(buffer_minuten)")
    .neq("status", "geannuleerd")
    .lt("start_op", tot.toISOString())
    .gt("eind_op", new Date(van.getTime() - 24 * 3_600_000).toISOString())
    .limit(5_000);
  if (error) throw new Error(`afspraken lezen: ${error.message}`);
  return ((data ?? []) as unknown as RuweBezetting[]).map((r) => {
    const s = Array.isArray(r.afspraak_soorten) ? r.afspraak_soorten[0] : r.afspraak_soorten;
    return {
      id: r.id,
      start_op: r.start_op,
      eind_op: r.eind_op,
      status: r.status,
      aangemaakt_op: r.aangemaakt_op,
      buffer_minuten: s?.buffer_minuten ?? null,
    };
  });
}

export async function haalBlokkades(van: Date, tot: Date): Promise<{ id: string; van: string; tot: string; reden: string }[]> {
  const { data, error } = await adminClient()
    .from("afspraak_blokkades")
    .select("id, van, tot, reden")
    .lt("van", tot.toISOString())
    .gt("tot", van.toISOString())
    .order("van");
  if (error) throw new Error(`blokkades lezen: ${error.message}`);
  return (data ?? []) as { id: string; van: string; tot: string; reden: string }[];
}

export async function haalBeschikbaarheid(): Promise<{ id: string; weekdag: number; van: string; tot: string }[]> {
  const { data, error } = await adminClient().from("beschikbaarheid").select("id, weekdag, van, tot").order("weekdag").order("van");
  if (error) throw new Error(`beschikbaarheid lezen: ${error.message}`);
  return (data ?? []) as { id: string; weekdag: number; van: string; tot: string }[];
}

/** Alle invoer voor de rekenkern voor deze soort, vanaf nu tot het einde van de boekingshorizon. */
async function slotInvoerVoor(
  soort: Pick<AfspraakSoort, "duur_minuten" | "buffer_minuten">,
  inst: AfspraakInstellingen,
  nu: Date,
  negeerId?: string,
): Promise<SlotInvoer> {
  const van = vanAmsterdam(vandaagAmsterdam(nu), 0);
  const tot = vanAmsterdam(datumPlusDagen(laatsteDatum(nu, inst.maxVooruitDagen), 2), 0);
  const [beschikbaarheid, blokkades, afspraken] = await Promise.all([haalBeschikbaarheid(), haalBlokkades(van, tot), haalBezetting(van, tot)]);
  return {
    beschikbaarheid,
    blokkades,
    afspraken,
    duurMinuten: soort.duur_minuten,
    bufferMinuten: soort.buffer_minuten,
    minVoorafUren: inst.minVoorafUren,
    maxVooruitDagen: inst.maxVooruitDagen,
    nu,
    betaaltermijnMinuten: BETAALTERMIJN_MINUTEN,
    negeerId,
  };
}

/** De dagen met vrije tijden voor een (actieve) soort, of null als die niet bestaat. */
export async function vrijeDagen(soortId: string): Promise<Dag[] | null> {
  const soort = await haalSoort(soortId);
  if (!soort || !soort.actief) return null;
  const inst = await afspraakInstellingen();
  return beschikbareDagen(await slotInvoerVoor(soort, inst, new Date()));
}

// Boeken -------------------------------------------------------------------------------

function functieOntbreekt(e: { code?: string; message?: string }): boolean {
  return e.code === "PGRST202" || e.code === "42883" || /could not find the function/i.test(e.message ?? "");
}

interface NieuweAfspraak {
  soort: AfspraakSoort;
  relatieId: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  opmerking: string | null;
  start: Date;
  eind: Date;
  status: AfspraakStatus;
  aanbetalingCent: number;
}

/**
 * Voegt de afspraak in als de tijd nog vrij is; null als hij inmiddels bezet is.
 * Via de databasefunctie boek_afspraak (één transactie met advisory lock). Zolang
 * die migratie niet is toegepast: controleren, invoegen en daarna nacontroleren
 * (bij een gelijktijdige boeking wijkt de later aangemaakte afspraak).
 */
async function voegVeiligIn(n: NieuweAfspraak): Promise<AfspraakRij | null> {
  const supabase = adminClient();
  const { data, error } = await supabase.rpc("boek_afspraak", {
    p_soort_id: n.soort.id,
    p_relatie_id: n.relatieId,
    p_naam: n.naam,
    p_email: n.email,
    p_telefoon: n.telefoon,
    p_opmerking: n.opmerking,
    p_start: n.start.toISOString(),
    p_eind: n.eind.toISOString(),
    p_status: n.status,
    p_aanbetaling_cent: n.aanbetalingCent,
    p_buffer_minuten: n.soort.buffer_minuten,
    p_betaaltermijn_minuten: BETAALTERMIJN_MINUTEN,
  });
  if (!error) {
    const rijen = (Array.isArray(data) ? data : data ? [data] : []) as AfspraakRij[];
    return rijen.find((r) => r && r.id) ?? null;
  }
  if (!functieOntbreekt(error)) throw new Error(`boek_afspraak: ${error.message}`);

  // Terugval zonder databasefunctie.
  const ruim = { van: new Date(n.start.getTime() - 24 * 3_600_000), tot: new Date(n.eind.getTime() + 24 * 3_600_000) };
  const controle = async (negeerId?: string) => {
    const [afspraken, blokkades] = await Promise.all([haalBezetting(ruim.van, ruim.tot), haalBlokkades(ruim.van, ruim.tot)]);
    return conflicten({ afspraken, blokkades, bufferMinuten: n.soort.buffer_minuten, nu: new Date(), negeerId }, n.start, n.eind);
  };
  const voor = await controle();
  if (voor.afspraken.length || voor.blokkades.length) return null;
  const { data: rij, error: insertFout } = await supabase
    .from("afspraken")
    .insert({
      soort_id: n.soort.id,
      relatie_id: n.relatieId,
      naam: n.naam,
      email: n.email,
      telefoon: n.telefoon,
      opmerking: n.opmerking,
      start_op: n.start.toISOString(),
      eind_op: n.eind.toISOString(),
      status: n.status,
      aanbetaling_cent: n.aanbetalingCent,
    })
    .select(AFSPRAAK_VELDEN)
    .single();
  if (insertFout || !rij) throw new Error(`afspraak opslaan: ${insertFout?.message ?? "geen rij"}`);
  const eigen = rij as AfspraakRij;
  const na = await controle(eigen.id);
  const eerder = na.afspraken.some(
    (a) =>
      String(a.aangemaakt_op) < eigen.aangemaakt_op ||
      (String(a.aangemaakt_op) === eigen.aangemaakt_op && (a.id ?? "") < eigen.id),
  );
  if (eerder) {
    await supabase.from("afspraken").delete().eq("id", eigen.id);
    return null;
  }
  return eigen;
}

export type BoekResultaat =
  | { ok: true; afspraak: AfspraakRij; checkoutUrl: string | null }
  | { ok: false; reden: "soort" | "bezet" | "betaling" | "fout"; bericht?: string };

/**
 * Boekt een afspraak voor een bezoeker: controleert of de soort actief is en de
 * tijd (nog) vrij, koppelt het adresboek, slaat op zonder dubbele boeking en
 * start zo nodig de aanbetaling. Mails gaan pas na betaling (of direct, zonder
 * aanbetaling: roep dan naNieuweAfspraak aan, bij voorkeur na het antwoord).
 */
export async function boekAfspraak(invoer: BoekInvoer): Promise<BoekResultaat> {
  const soort = await haalSoort(invoer.soortId);
  if (!soort || !soort.actief) return { ok: false, reden: "soort" };
  const inst = await afspraakInstellingen();
  const nu = new Date();
  const start = new Date(invoer.start);
  if (!isVrij(await slotInvoerVoor(soort, inst, nu), start)) return { ok: false, reden: "bezet" };
  const eind = new Date(start.getTime() + soort.duur_minuten * 60_000);
  const aanbetaling = soort.aanbetaling_cent > 0 ? soort.aanbetaling_cent : 0;
  const status: AfspraakStatus = aanbetaling > 0 ? "wacht_op_betaling" : inst.handmatigBevestigen ? "aangevraagd" : "bevestigd";

  const gevonden = await voegVeiligIn({
    soort,
    relatieId: null,
    naam: invoer.naam,
    email: invoer.email,
    telefoon: invoer.telefoon,
    opmerking: invoer.opmerking,
    start,
    eind,
    status,
    aanbetalingCent: aanbetaling,
  });
  if (!gevonden) return { ok: false, reden: "bezet" };
  // Pas na een geslaagde boeking aan het adresboek koppelen (gooit nooit).
  const relatie = await koppelRelatie({
    email: invoer.email,
    naam: invoer.naam,
    telefoon: invoer.telefoon,
    bron: "handmatig",
    tags: ["afspraak"],
  });
  let afspraak = gevonden;
  if (relatie) {
    const { error } = await adminClient().from("afspraken").update({ relatie_id: relatie.id }).eq("id", gevonden.id);
    if (!error) afspraak = { ...gevonden, relatie_id: relatie.id };
  }
  if (!aanbetaling) return { ok: true, afspraak, checkoutUrl: null };

  const basis = siteUrl();
  const lokaal = basis.startsWith("http://localhost");
  try {
    const betaling = await mollie().payments.create({
      amount: { currency: "EUR", value: centenNaarBedrag(aanbetaling) },
      description: `Aanbetaling ${soort.naam} ${datumLabel(start)} ${tijdLabel(start)}`.slice(0, 255),
      redirectUrl: `${basis}/afspraak/${afspraak.token}?betaling=1`,
      // Mollie weigert een niet-bereikbare (localhost) webhook: lokaal weglaten.
      ...(lokaal ? {} : { webhookUrl: `${basis}/api/mollie/webhook` }),
      metadata: { soort: "afspraak", afspraakId: afspraak.id },
    });
    await adminClient().from("afspraken").update({ mollie_payment_id: betaling.id }).eq("id", afspraak.id);
    const checkoutUrl = betaling.getCheckoutUrl();
    if (!checkoutUrl) throw new Error("Geen betaallink ontvangen.");
    return { ok: true, afspraak: { ...afspraak, mollie_payment_id: betaling.id }, checkoutUrl };
  } catch (e) {
    console.error("Aanbetaling starten mislukt", afspraak.id, e);
    await adminClient()
      .from("afspraken")
      .update({ status: "geannuleerd", notitie: `Aanbetaling starten mislukt: ${foutTekst(e)}`.slice(0, 1_000) })
      .eq("id", afspraak.id);
    return { ok: false, reden: "betaling" };
  }
}

// Betaling ------------------------------------------------------------------------------

/**
 * Staat er (inmiddels) een andere afspraak op de tijd van `a`? Voor een betaling
 * die pas na de betaaltermijn binnenkwam, toen de tijd al was vrijgegeven.
 * null = controle mislukt.
 */
async function conflictNaLateBetaling(a: AfspraakRij): Promise<boolean | null> {
  try {
    const soort = a.soort_id ? await haalSoort(a.soort_id) : null;
    const s = new Date(a.start_op);
    const t = new Date(a.eind_op);
    const ruim = { van: new Date(s.getTime() - 86_400_000), tot: new Date(t.getTime() + 86_400_000) };
    const c = conflicten(
      { afspraken: await haalBezetting(ruim.van, ruim.tot), blokkades: [], bufferMinuten: soort?.buffer_minuten ?? 0, nu: new Date(), negeerId: a.id },
      s,
      t,
    );
    return c.afspraken.length > 0;
  } catch (e) {
    console.error("Controle na late betaling mislukt", e);
    return null;
  }
}

/**
 * Verwerkt de status van een Mollie-betaling voor een aanbetaling (webhook én
 * de pagina /afspraak/[token] als terugval). Idempotent: alleen de eerste
 * overgang vanuit wacht_op_betaling stuurt mails. Kwam de betaling pas na de
 * betaaltermijn binnen en is de tijd intussen bezet (of is dat niet na te gaan),
 * dan wordt de afspraak "aangevraagd" (handmatig bevestigen) i.p.v. bevestigd.
 * Geeft false bij een databasefout (dan moet Mollie het opnieuw proberen).
 */
export async function verwerkAfspraakBetaling(betaling: { id: string; status: string }, afspraakId: string): Promise<boolean> {
  const supabase = adminClient();
  const { data, error } = await supabase.from("afspraken").select(AFSPRAAK_VELDEN).eq("id", afspraakId).maybeSingle();
  if (error) return false;
  const a = data as AfspraakRij | null;
  if (!a) return true;
  if (a.mollie_payment_id && a.mollie_payment_id !== betaling.id) return true;

  if (betaling.status === "paid") {
    const betaaldOp = new Date().toISOString();
    if (a.status === "wacht_op_betaling") {
      // Laat betaald: is de tijd intussen door een ander geboekt? Dan niet
      // bevestigen maar als aanvraag laten beoordelen.
      const laat = Date.parse(a.aangemaakt_op) < Date.now() - BETAALTERMIJN_MINUTEN * 60_000;
      const conflict = laat ? await conflictNaLateBetaling(a) : false;
      const nietBevestigen = conflict !== false;
      const notitie = conflict
        ? "Aanbetaling kwam na de betaaltermijn binnen en de tijd is intussen bezet: niet automatisch bevestigd."
        : "Aanbetaling kwam na de betaaltermijn binnen; controle op een dubbele boeking mislukte: niet automatisch bevestigd.";
      const { data: bijgewerkt, error: e } = await supabase
        .from("afspraken")
        .update({
          status: nietBevestigen ? "aangevraagd" : "bevestigd",
          betaald_op: betaaldOp,
          mollie_payment_id: betaling.id,
          ...(nietBevestigen ? { notitie: `${a.notitie ? `${a.notitie}\n` : ""}${notitie}` } : {}),
        })
        .eq("id", a.id)
        .eq("status", "wacht_op_betaling")
        .select(AFSPRAAK_VELDEN);
      if (e) return false;
      const rij = (bijgewerkt as AfspraakRij[] | null)?.[0];
      if (rij) {
        if (nietBevestigen) {
          await stuurBeheerMelding(
            "Dubbele afspraak na late betaling",
            `De aanbetaling van ${rij.naam} <${rij.email}> kwam pas binnen nadat de tijd was vrijgegeven${conflict ? ", en er staat intussen een andere afspraak op dat moment" : " (controle op een andere afspraak mislukte)"}. De afspraak staat daarom op "aangevraagd": bevestig hem of verplaats/annuleer hem met de klant.\n\nBekijk: ${siteUrl()}/admin/afspraken/${rij.id}`,
          );
        }
        // Bij "aangevraagd" krijgt de klant de ontvangstmail i.p.v. een bevestiging.
        await naNieuweAfspraak(rij);
      }
      return true;
    }
    if (!a.betaald_op) {
      const { data: bijgewerkt, error: e } = await supabase
        .from("afspraken")
        .update({ betaald_op: betaaldOp, mollie_payment_id: betaling.id })
        .eq("id", a.id)
        .is("betaald_op", null)
        .select(AFSPRAAK_VELDEN);
      if (e) return false;
      const rij = (bijgewerkt as AfspraakRij[] | null)?.[0];
      if (rij && rij.status === "geannuleerd") {
        await meldBeheerder(rij, "betaald_na_annulering").catch((err) => console.error("Melding mislukt", err));
      }
    }
    return true;
  }

  if (["failed", "expired", "canceled"].includes(betaling.status)) {
    const { error: e } = await supabase
      .from("afspraken")
      .update({ status: "geannuleerd", notitie: `${a.notitie ? `${a.notitie}\n` : ""}Aanbetaling ${betaling.status === "expired" ? "verlopen" : "niet gelukt"}.` })
      .eq("id", a.id)
      .eq("status", "wacht_op_betaling");
    if (e) return false;
  }
  return true;
}

/** Haalt de betaalstatus zelf bij Mollie op (terugval als de webhook nog niet kwam). Gooit nooit. */
export async function controleerBetaling(a: AfspraakRij): Promise<void> {
  if (a.status !== "wacht_op_betaling" || !a.mollie_payment_id) return;
  try {
    const betaling = await mollie().payments.get(a.mollie_payment_id);
    await verwerkAfspraakBetaling({ id: betaling.id, status: betaling.status }, a.id);
  } catch (e) {
    console.error("Betaalstatus ophalen mislukt", a.id, e);
  }
}

// Annuleren door de klant ---------------------------------------------------------------

export async function haalAfspraakOpToken(token: string): Promise<AfspraakRij | null> {
  if (!/^[a-z0-9]{32,80}$/i.test(token)) return null;
  const { data } = await adminClient().from("afspraken").select(AFSPRAAK_VELDEN).eq("token", token).maybeSingle();
  return (data as AfspraakRij | null) ?? null;
}

export async function annuleerDoorKlant(token: string): Promise<"ok" | "te_laat" | "onbekend" | "fout"> {
  const a = await haalAfspraakOpToken(token);
  if (!a) return "onbekend";
  const inst = await afspraakInstellingen();
  if (!magAnnuleren(a, new Date(), inst.minVoorafUren)) return a.status === "geannuleerd" ? "ok" : "te_laat";
  const { data, error } = await adminClient()
    .from("afspraken")
    .update({ status: "geannuleerd", notitie: `${a.notitie ? `${a.notitie}\n` : ""}Geannuleerd door de klant op ${datumLabel(new Date())} ${tijdLabel(new Date())}.` })
    .eq("id", a.id)
    .in("status", OPEN_STATUSSEN as AfspraakStatus[])
    .select(AFSPRAAK_VELDEN);
  if (error) return "fout";
  const rij = (data as AfspraakRij[] | null)?.[0];
  if (!rij) return "ok";
  // Een onbetaalde afspraak (betaling afgebroken) hoeft geen mails.
  if (a.status !== "wacht_op_betaling") {
    const [k, b] = await Promise.allSettled([stuurAnnulering(rij), meldBeheerder(rij, "geannuleerd")]);
    const fouten = [k, b].filter((r) => r.status === "rejected").map((r) => foutTekst((r as PromiseRejectedResult).reason));
    if (fouten.length) {
      await stuurBeheerMelding(
        "Mail bij geannuleerde afspraak niet verstuurd",
        `${rij.naam} <${rij.email}> annuleerde de afspraak van ${datumLabel(rij.start_op)} ${tijdLabel(rij.start_op)}, maar niet alle mails konden worden verstuurd.\n\n${fouten.join("\n")}`,
      );
    }
  }
  return "ok";
}

// Nachtelijke controle -------------------------------------------------------------------

/**
 * Herinneringen voor de bevestigde afspraken van nu tot en met morgen
 * (Nederlandse datum), eenmalig per afspraak: ook afspraken die na de vorige
 * run zijn geboekt of bevestigd, krijgen er dus nog een. Ruimt ook onbetaalde
 * afspraken op waarvan de betaling al lang verlopen is (de notitie wordt
 * aangevuld, niet overschreven). Gooit nooit.
 */
export async function stuurAfspraakHerinneringen(nu = new Date()): Promise<{ verstuurd: number; mislukt: string[] }> {
  const mislukt: string[] = [];
  let verstuurd = 0;
  try {
    const supabase = adminClient();
    const { data: verlopen, error: verlopenFout } = await supabase
      .from("afspraken")
      .select("id, notitie")
      .eq("status", "wacht_op_betaling")
      .lt("aangemaakt_op", new Date(nu.getTime() - 24 * 3_600_000).toISOString())
      .limit(200);
    if (verlopenFout) mislukt.push(`Verlopen aanbetalingen ophalen mislukt: ${verlopenFout.message}`);
    for (const v of (verlopen ?? []) as { id: string; notitie: string | null }[]) {
      const { error: e } = await supabase
        .from("afspraken")
        .update({ status: "geannuleerd", notitie: `${v.notitie ? `${v.notitie}\n` : ""}Aanbetaling niet ontvangen; automatisch vervallen.` })
        .eq("id", v.id)
        .eq("status", "wacht_op_betaling");
      if (e) mislukt.push(`Afspraak ${v.id} laten vervallen mislukt: ${e.message}`);
    }

    const { van, tot } = herinneringVenster(nu);
    const { data, error } = await supabase
      .from("afspraken")
      .select(AFSPRAAK_VELDEN)
      .eq("status", "bevestigd")
      .is("herinnering_op", null)
      .gte("start_op", van.toISOString())
      .lt("start_op", tot.toISOString())
      .order("start_op")
      .limit(200);
    if (error) return { verstuurd, mislukt: [`Afspraken ophalen mislukt: ${error.message}`] };
    for (const a of (data ?? []) as AfspraakRij[]) {
      try {
        await stuurHerinnering(a);
        const { error: e } = await supabase.from("afspraken").update({ herinnering_op: new Date().toISOString() }).eq("id", a.id);
        if (e) mislukt.push(`Afspraak ${a.id}: verstuurd, maar niet gemarkeerd (${e.message})`);
        verstuurd++;
      } catch (e) {
        console.error("Afspraakherinnering mislukt", a.id, e);
        mislukt.push(`Afspraak ${a.id} (${a.email}): ${foutTekst(e)}`);
      }
    }
  } catch (e) {
    mislukt.push(`Afspraakherinneringen: ${foutTekst(e)}`);
  }
  return { verstuurd, mislukt };
}
