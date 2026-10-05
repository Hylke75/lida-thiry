import "server-only";
import { adminClient } from "./supabase/admin";
import { leesInstelling } from "./instellingen";
import { stuurBetaalherinneringMail } from "./resend";
import { stuurBeheerMelding, foutTekst } from "./beheermelding";
import { ondertekenLink } from "./ondertekening";
import { siteUrl } from "./site";
import {
  BETAALD_STATUSSEN,
  LINK_GELDIG_DAGEN,
  MAX_LEEFTIJD_DAGEN,
  OPEN_STATUSSEN,
  herinneringNaUren,
  selecteerBetaalherinneringen,
  type OpenBestelling,
} from "./betaalherinnering-regels";

/** Doel van de ondertekende link (zie ondertekening.ts). */
export const HERVAT_DOEL = "hervat";

/** Ondertekende link naar de pagina waar de klant de betaling hervat. */
function hervatLink(orderId: string, nu: Date = new Date()): string {
  const verloopt = new Date(nu.getTime() + LINK_GELDIG_DAGEN * 24 * 60 * 60 * 1000);
  const t = ondertekenLink(HERVAT_DOEL, orderId, verloopt);
  return `${siteUrl()}/bestellen/hervat/${orderId}?t=${encodeURIComponent(t)}`;
}

/**
 * Dagelijkse cron: stuurt één vriendelijke herinnering voor bestellingen waarvan
 * de betaling niet is afgerond (zie selecteerBetaalherinneringen). Markeert eerst
 * (betaalherinnering_op), zodat een fout nooit tot dubbele mails leidt. Meldt
 * mislukkingen in één beheermelding. Gooit nooit.
 */
export async function stuurBetaalherinneringen(nu: Date = new Date()): Promise<{ verstuurd: number; mislukt: number }> {
  const mislukt: string[] = [];
  let verstuurd = 0;
  try {
    const supabase = adminClient();
    const uren = herinneringNaUren(await leesInstelling("betaalherinnering_na_uren"));
    const sinds = new Date(nu.getTime() - MAX_LEEFTIJD_DAGEN * 24 * 60 * 60 * 1000).toISOString();

    const { data: open, error } = await supabase
      .from("orders")
      .select("id, klantnaam, email, status, bedrag_cent, valuta, aangemaakt_op, betaalherinnering_op")
      .in("status", [...OPEN_STATUSSEN])
      .is("betaalherinnering_op", null)
      .gt("bedrag_cent", 0)
      .gte("aangemaakt_op", sinds)
      .limit(500);
    if (error) throw new Error(`Orders ophalen: ${error.message}`);
    if (!open?.length) return { verstuurd, mislukt: 0 };

    const emails = [...new Set(open.map((o) => String(o.email).toLowerCase()))];
    const { data: betaald, error: e2 } = await supabase
      .from("orders")
      .select("email, aangemaakt_op")
      .in("status", [...BETAALD_STATUSSEN])
      .in("email", emails)
      .gte("aangemaakt_op", sinds);
    if (e2) throw new Error(`Betaalde orders ophalen: ${e2.message}`);

    const { versturen, overslaan } = selecteerBetaalherinneringen(
      open as OpenBestelling[],
      betaald ?? [],
      nu,
      uren,
    );

    if (overslaan.length) {
      await supabase
        .from("orders")
        .update({ betaalherinnering_op: nu.toISOString() })
        .in(
          "id",
          overslaan.map((o) => o.id),
        );
    }

    const perId = new Map(open.map((o) => [o.id as string, o]));
    for (const keuze of versturen) {
      const o = perId.get(keuze.id)!;
      // Eerst markeren (alleen als dat nog niet gebeurd is), dan mailen.
      const { data: gemarkeerd, error: e3 } = await supabase
        .from("orders")
        .update({ betaalherinnering_op: new Date().toISOString() })
        .eq("id", o.id)
        .is("betaalherinnering_op", null)
        .select("id");
      if (e3) {
        mislukt.push(`${o.id}: markeren mislukt (${e3.message})`);
        continue;
      }
      if (!gemarkeerd?.length) continue;
      try {
        await stuurBetaalherinneringMail({
          naam: o.klantnaam,
          email: o.email,
          bedragCent: o.bedrag_cent,
          valuta: o.valuta || "EUR",
          link: hervatLink(o.id, nu),
        });
        verstuurd++;
      } catch (e) {
        console.error("Betaalherinnering mislukt", o.id, e);
        mislukt.push(`${o.id} (${o.email}): ${foutTekst(e)}`);
      }
    }
  } catch (e) {
    mislukt.push(foutTekst(e));
  }
  if (mislukt.length) {
    await stuurBeheerMelding(
      "Betaalherinneringen mislukt",
      `${mislukt.length} betaalherinnering(en) konden niet worden verstuurd (ze worden niet opnieuw geprobeerd):\n${mislukt.map((r) => `- ${r}`).join("\n")}`,
    );
  }
  return { verstuurd, mislukt: mislukt.length };
}
