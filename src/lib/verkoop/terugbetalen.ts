import "server-only";
import { adminClient } from "../supabase/admin";
import { terugbetalen } from "../mollie";
import { maakCreditnota, type Creditnota } from "../factuur";
import { stuurBeheerMelding, foutTekst } from "../beheermelding";
import { BETAALDE_STATUSSEN, TERUGBETAALD_STATUS } from "../order-status";
import { formatteerBedrag } from "../prijs";
import { bepaalTerugbetaling, terugbetaalOmschrijving, trektToegangIn } from "./regels";
import { stuurCreditnotaMail } from "./mails";

export interface TerugbetaalOpdracht {
  /** Het hele restbedrag terugbetalen (anders `invoer`, in euro's). */
  volledig: boolean;
  invoer: string | null;
  reden: string | null;
  /** Bij een volledige terugbetaling de toegang (test of cadeauboncode) toch laten staan. */
  toegangBehouden: boolean;
  /** De creditnota naar de klant mailen. */
  mailen: boolean;
  /** Wie het doet (voor de creditnota). */
  door: string | null;
}

export type TerugbetaalUitkomst =
  | { ok: true; melding: string; details: Record<string, unknown> }
  | { ok: false; melding: string };

/** Zet het geclaimde terugbetaalde bedrag terug als Mollie de terugbetaling weigert. */
async function herstelClaim(tabel: string, id: string, oud: number, nieuw: number): Promise<void> {
  const { error } = await adminClient().from(tabel).update({ terugbetaald_cent: oud }).eq("id", id).eq("terugbetaald_cent", nieuw);
  if (error) console.error("Terugbetaling: claim herstellen mislukt", tabel, id, error.message);
}

/** Creditnota maken (en zo nodig mailen); fouten worden gemeld, niet gegooid. */
async function creditnotaEnMail(o: {
  soort: "order" | "cadeaubon";
  bronId: string;
  bedragCent: number;
  valuta: string;
  reden: string | null;
  door: string | null;
  refundId: string | null;
  mailen: boolean;
  email: string;
  naam: string;
  origineelNummer: string | null;
}): Promise<{ creditnota: Creditnota | null; gemaild: boolean; waarschuwingen: string[] }> {
  const waarschuwingen: string[] = [];
  let creditnota: Creditnota | null = null;
  try {
    creditnota = await maakCreditnota({
      soort: o.soort,
      bronId: o.bronId,
      bedragCent: o.bedragCent,
      reden: o.reden,
      door: o.door,
    });
    if (o.refundId) {
      await adminClient().from("creditnotas").update({ mollie_refund_id: o.refundId }).eq("id", creditnota.id);
    }
  } catch (e) {
    waarschuwingen.push("de creditnota kon niet worden gemaakt");
    await stuurBeheerMelding(
      "Creditnota maken mislukt",
      `${o.soort === "order" ? "Bestelling" : "Cadeaubon"} ${o.bronId}: de terugbetaling van ${formatteerBedrag(o.bedragCent, o.valuta)} is vastgelegd, maar de creditnota kon niet worden gemaakt.\n\n${foutTekst(e)}`,
    );
  }
  let gemaild = false;
  if (creditnota && o.mailen) {
    try {
      await stuurCreditnotaMail({
        email: o.email,
        naam: o.naam,
        bedragCent: o.bedragCent,
        valuta: o.valuta,
        creditnotanummer: creditnota.factuurnummer,
        origineelNummer: o.origineelNummer,
        viaMollie: Boolean(o.refundId),
        reden: o.reden,
        bijlage: { bestandsnaam: creditnota.bestandsnaam, pdf: creditnota.pdf },
      });
      gemaild = true;
      await adminClient().from("creditnotas").update({ gemaild_op: new Date().toISOString() }).eq("id", creditnota.id);
    } catch (e) {
      console.error("Creditnota mailen mislukt", creditnota.factuurnummer, e);
      waarschuwingen.push("de mail met de creditnota kon niet worden verstuurd");
    }
  }
  return { creditnota, gemaild, waarschuwingen };
}

function slotzin(o: { viaMollie: boolean; creditnota: Creditnota | null; gemaild: boolean; waarschuwingen: string[] }): string {
  const delen = [
    o.viaMollie ? "Mollie betaalt het bedrag terug." : "Maak het bedrag zelf over naar de klant (er was geen Mollie-betaling).",
    o.creditnota ? `Creditnota ${o.creditnota.factuurnummer} is gemaakt${o.gemaild ? " en gemaild" : ""}.` : "",
    o.waarschuwingen.length ? `Let op: ${o.waarschuwingen.join("; ")}.` : "",
  ];
  return delen.filter(Boolean).join(" ");
}

/**
 * Betaalt (een deel van) een bestelling terug: bedrag vastleggen (optimistisch,
 * zodat twee gelijktijdige terugbetalingen niet samen te veel terugbetalen), via
 * Mollie terugbetalen (als er met Mollie is betaald), creditnota maken en mailen,
 * en bij een volledige terugbetaling de toegang tot de test intrekken (tenzij de
 * beheerder die laat staan). Gooit niet.
 */
export async function betaalOrderTerug(orderId: string, op: TerugbetaalOpdracht): Promise<TerugbetaalUitkomst> {
  const supabase = adminClient();
  const { data: order, error } = await supabase
    .from("orders")
    .select("id, klantnaam, email, status, bedrag_cent, valuta, terugbetaald_cent, mollie_payment_id, factuurnummer, betaalwijze")
    .eq("id", orderId)
    .maybeSingle();
  if (error) return { ok: false, melding: `Bestelling lezen mislukt: ${error.message}` };
  if (!order) return { ok: false, melding: "Bestelling niet gevonden." };
  const isBetaald = (BETAALDE_STATUSSEN as readonly string[]).includes(order.status) || order.status === TERUGBETAALD_STATUS;
  if (!isBetaald) return { ok: false, melding: "Alleen een betaalde bestelling kan worden terugbetaald." };

  const oud = order.terugbetaald_cent ?? 0;
  const t = bepaalTerugbetaling({
    betaaldCent: order.bedrag_cent ?? 0,
    alTerugCent: oud,
    volledig: op.volledig,
    invoer: op.invoer,
  });
  if (!t.ok) return { ok: false, melding: t.fout };
  const { bedragCent, nieuwTotaalCent, volledig } = t.waarde;
  const valuta = order.valuta || "EUR";

  const { data: geclaimd, error: claimFout } = await supabase
    .from("orders")
    .update({ terugbetaald_cent: nieuwTotaalCent })
    .eq("id", orderId)
    .eq("terugbetaald_cent", oud)
    .select("id");
  if (claimFout) return { ok: false, melding: `Vastleggen mislukt: ${claimFout.message}` };
  if (!geclaimd?.length) return { ok: false, melding: "De bestelling is intussen gewijzigd. Laad de pagina opnieuw en probeer het nog eens." };

  const viaMollie = Boolean(order.mollie_payment_id) && order.betaalwijze !== "overboeking";
  let refundId: string | null = null;
  if (viaMollie) {
    try {
      const r = await terugbetalen({
        betaalId: order.mollie_payment_id!,
        bedragCent,
        valuta,
        omschrijving: terugbetaalOmschrijving(order.factuurnummer, op.reden),
        metadata: { orderId },
      });
      refundId = r.id;
    } catch (e) {
      await herstelClaim("orders", orderId, oud, nieuwTotaalCent);
      return { ok: false, melding: `Mollie weigerde de terugbetaling: ${foutTekst(e)}` };
    }
  }

  let toegangIngetrokken = false;
  if (trektToegangIn(volledig, op.toegangBehouden)) {
    const { data: ingetrokken, error: e2 } = await supabase
      .from("orders")
      .update({ status: TERUGBETAALD_STATUS, status_voor_terugbetaling: order.status })
      .eq("id", orderId)
      .in("status", [...BETAALDE_STATUSSEN])
      .select("id");
    if (e2) console.error("Toegang intrekken mislukt", orderId, e2.message);
    toegangIngetrokken = Boolean(ingetrokken?.length);
  }

  const cn = await creditnotaEnMail({
    soort: "order",
    bronId: orderId,
    bedragCent,
    valuta,
    reden: op.reden,
    door: op.door,
    refundId,
    mailen: op.mailen,
    email: order.email,
    naam: order.klantnaam,
    origineelNummer: order.factuurnummer,
  });

  const melding = [
    `${formatteerBedrag(bedragCent, valuta)} terugbetaald${volledig ? " (volledig)" : ""}.`,
    toegangIngetrokken ? "De toegang tot de test en het advies is ingetrokken." : volledig ? "De toegang tot de test blijft staan." : "",
    slotzin({ viaMollie, ...cn }),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ok: true,
    melding,
    details: {
      bedrag_cent: bedragCent,
      totaal_terugbetaald_cent: nieuwTotaalCent,
      volledig,
      via_mollie: viaMollie,
      mollie_refund_id: refundId,
      toegang_ingetrokken: toegangIngetrokken,
      creditnota: cn.creditnota?.factuurnummer ?? null,
      gemaild: cn.gemaild,
      reden: op.reden,
    },
  };
}

/**
 * Betaalt (een deel van) een gekochte cadeaubon terug, net als een bestelling.
 * Bij een volledige terugbetaling wordt de code van de bon geblokkeerd, tenzij de
 * beheerder die laat staan. Gooit niet.
 */
export async function betaalCadeaubonTerug(bonId: string, op: TerugbetaalOpdracht): Promise<TerugbetaalUitkomst> {
  const supabase = adminClient();
  const { data: bon, error } = await supabase
    .from("cadeaubon_bestellingen")
    .select("id, koper_naam, koper_email, status, bedrag_cent, valuta, terugbetaald_cent, mollie_payment_id, factuurnummer, kortingscode_id")
    .eq("id", bonId)
    .maybeSingle();
  if (error) return { ok: false, melding: `Cadeaubon lezen mislukt: ${error.message}` };
  if (!bon) return { ok: false, melding: "Cadeaubon niet gevonden." };
  if (bon.status !== "betaald" && bon.status !== "verzonden") {
    return { ok: false, melding: "Alleen een betaalde cadeaubon kan worden terugbetaald." };
  }
  const oud = bon.terugbetaald_cent ?? 0;
  const t = bepaalTerugbetaling({ betaaldCent: bon.bedrag_cent, alTerugCent: oud, volledig: op.volledig, invoer: op.invoer });
  if (!t.ok) return { ok: false, melding: t.fout };
  const { bedragCent, nieuwTotaalCent, volledig } = t.waarde;
  const valuta = bon.valuta || "EUR";

  const { data: geclaimd, error: claimFout } = await supabase
    .from("cadeaubon_bestellingen")
    .update({ terugbetaald_cent: nieuwTotaalCent })
    .eq("id", bonId)
    .eq("terugbetaald_cent", oud)
    .select("id");
  if (claimFout) return { ok: false, melding: `Vastleggen mislukt: ${claimFout.message}` };
  if (!geclaimd?.length) return { ok: false, melding: "De cadeaubon is intussen gewijzigd. Laad de pagina opnieuw en probeer het nog eens." };

  const viaMollie = Boolean(bon.mollie_payment_id);
  let refundId: string | null = null;
  if (viaMollie) {
    try {
      const r = await terugbetalen({
        betaalId: bon.mollie_payment_id!,
        bedragCent,
        valuta,
        omschrijving: terugbetaalOmschrijving(bon.factuurnummer, op.reden),
        metadata: { cadeaubonId: bonId },
      });
      refundId = r.id;
    } catch (e) {
      await herstelClaim("cadeaubon_bestellingen", bonId, oud, nieuwTotaalCent);
      return { ok: false, melding: `Mollie weigerde de terugbetaling: ${foutTekst(e)}` };
    }
  }

  let codeGeblokkeerd = false;
  let codeAlGebruikt = false;
  if (trektToegangIn(volledig, op.toegangBehouden) && bon.kortingscode_id) {
    const { data: code, error: e2 } = await supabase
      .from("kortingscodes")
      .update({ actief: false })
      .eq("id", bon.kortingscode_id)
      .select("aantal_gebruikt");
    if (e2) console.error("Code blokkeren mislukt", bonId, e2.message);
    codeGeblokkeerd = Boolean(code?.length);
    codeAlGebruikt = Boolean(code?.[0] && code[0].aantal_gebruikt > 0);
  }

  const cn = await creditnotaEnMail({
    soort: "cadeaubon",
    bronId: bonId,
    bedragCent,
    valuta,
    reden: op.reden,
    door: op.door,
    refundId,
    mailen: op.mailen,
    email: bon.koper_email,
    naam: bon.koper_naam,
    origineelNummer: bon.factuurnummer,
  });

  const melding = [
    `${formatteerBedrag(bedragCent, valuta)} terugbetaald${volledig ? " (volledig)" : ""}.`,
    codeGeblokkeerd ? `De code van de bon is geblokkeerd${codeAlGebruikt ? " (let op: hij was al gebruikt)" : ""}.` : "",
    slotzin({ viaMollie, ...cn }),
  ]
    .filter(Boolean)
    .join(" ");
  return {
    ok: true,
    melding,
    details: {
      bedrag_cent: bedragCent,
      totaal_terugbetaald_cent: nieuwTotaalCent,
      volledig,
      via_mollie: viaMollie,
      mollie_refund_id: refundId,
      code_geblokkeerd: codeGeblokkeerd,
      creditnota: cn.creditnota?.factuurnummer ?? null,
      gemaild: cn.gemaild,
      reden: op.reden,
    },
  };
}

/**
 * Betaalt (een deel van) de aanbetaling van een afspraak terug via Mollie. Er is
 * voor een aanbetaling geen factuur, dus ook geen creditnota. Gooit niet.
 */
export async function betaalAanbetalingTerug(
  afspraakId: string,
  op: Pick<TerugbetaalOpdracht, "volledig" | "invoer" | "reden">,
): Promise<TerugbetaalUitkomst> {
  const supabase = adminClient();
  const { data: a, error } = await supabase
    .from("afspraken")
    .select("id, aanbetaling_cent, terugbetaald_cent, mollie_payment_id, betaald_op")
    .eq("id", afspraakId)
    .maybeSingle();
  if (error) return { ok: false, melding: `Afspraak lezen mislukt: ${error.message}` };
  if (!a) return { ok: false, melding: "Afspraak niet gevonden." };
  if (!a.betaald_op || !a.mollie_payment_id) return { ok: false, melding: "Er is geen betaalde aanbetaling voor deze afspraak." };
  const oud = a.terugbetaald_cent ?? 0;
  const t = bepaalTerugbetaling({ betaaldCent: a.aanbetaling_cent ?? 0, alTerugCent: oud, volledig: op.volledig, invoer: op.invoer });
  if (!t.ok) return { ok: false, melding: t.fout };
  const { bedragCent, nieuwTotaalCent, volledig } = t.waarde;

  const { data: geclaimd, error: claimFout } = await supabase
    .from("afspraken")
    .update({ terugbetaald_cent: nieuwTotaalCent })
    .eq("id", afspraakId)
    .eq("terugbetaald_cent", oud)
    .select("id");
  if (claimFout) return { ok: false, melding: `Vastleggen mislukt: ${claimFout.message}` };
  if (!geclaimd?.length) return { ok: false, melding: "De afspraak is intussen gewijzigd. Laad de pagina opnieuw." };
  let refundId: string;
  try {
    const r = await terugbetalen({
      betaalId: a.mollie_payment_id,
      bedragCent,
      valuta: "EUR",
      omschrijving: terugbetaalOmschrijving(null, op.reden ?? "aanbetaling afspraak"),
      metadata: { soort: "afspraak", afspraakId },
    });
    refundId = r.id;
  } catch (e) {
    await herstelClaim("afspraken", afspraakId, oud, nieuwTotaalCent);
    return { ok: false, melding: `Mollie weigerde de terugbetaling: ${foutTekst(e)}` };
  }
  return {
    ok: true,
    melding: `${formatteerBedrag(bedragCent)} van de aanbetaling terugbetaald${volledig ? " (volledig)" : ""}. Mollie betaalt het bedrag terug.`,
    details: { bedrag_cent: bedragCent, totaal_terugbetaald_cent: nieuwTotaalCent, volledig, mollie_refund_id: refundId, reden: op.reden },
  };
}
