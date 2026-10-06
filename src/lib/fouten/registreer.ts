import "server-only";
import { createHash } from "node:crypto";
import { adminClient } from "@/lib/supabase/admin";
import { stuurBeheerMelding } from "@/lib/beheermelding";
import { siteUrl } from "@/lib/site";
import { magDoorOpSleutel } from "@/lib/rate-limit";
import {
  BRON_LABEL,
  GEMELD_BIJ,
  MAX_BERICHT,
  MAX_STACK,
  meldReden,
  ontleedFout,
  schoonDetails,
  schoonPad,
  schoonTekst,
  vingerafdrukInvoer,
  type FoutBron,
  type MeldReden,
} from "./regels";

export interface FoutInvoer {
  bron: FoutBron;
  /** De gevangen fout (Error, tekst of iets anders). */
  fout: unknown;
  /** Pad (route) waar het gebeurde; querystrings worden weggehaald. */
  pad?: string | null;
  /** Digest van Next.js (koppelt de foutpagina in de browser aan de serverfout). */
  digest?: string | null;
  /** Extra context (wordt geschoond: geen e-mails/tokens). */
  details?: Record<string, unknown> | null;
  /** Stack uit een andere bron (browser), als `fout` geen Error is. */
  stack?: string | null;
  /** false = nooit mailen (bijv. voor beheermeldingen zelf). Standaard true. */
  melden?: boolean;
  /** Eigen vingerafdruk (alleen voor de testfout: elke test een nieuwe rij). */
  vingerafdruk?: string;
}

export interface FoutRij {
  id: string;
  vingerafdruk: string;
  bron: string;
  bericht: string;
  stack: string | null;
  pad: string | null;
  digest: string | null;
  details: Record<string, unknown> | null;
  aantal: number;
  eerst_op: string;
  laatst_op: string;
  gemeld_op: string | null;
  opgelost: boolean;
}

export function maakVingerafdruk(bron: string, bericht: string, stack?: string | null): string {
  return createHash("sha256").update(vingerafdrukInvoer(bron, bericht, stack)).digest("hex").slice(0, 32);
}

const REDEN_TEKST: Record<MeldReden, string> = {
  nieuw: "Nieuwe fout",
  terug: "Fout is terug (was opgelost)",
  drempel: "Fout komt vaak voor",
};

/**
 * Registreert een fout in de foutlog (Beheer → Instellingen → Fouten) en mailt
 * de beheerder bij een nieuwe fout, een fout die terug is na "opgelost", of als
 * het aantal over 10/100/1000 gaat (hooguit één mail per 24 uur per fout).
 * Persoonsgegevens (e-mails, tokens, querystrings) worden eruit gehaald.
 * Gooit NOOIT: foutregistratie mag de eigenlijke verwerking niet breken.
 */
export async function registreerFout(invoer: FoutInvoer): Promise<FoutRij | null> {
  try {
    const { bericht: ruw, stack: eigenStack, naam } = ontleedFout(invoer.fout);
    const stackRuw = eigenStack ?? invoer.stack ?? null;
    const berichtRuw = naam && !ruw.startsWith(naam) ? `${naam}: ${ruw}` : ruw;
    const bericht = schoonTekst(berichtRuw).slice(0, MAX_BERICHT);
    const stack = stackRuw ? schoonTekst(stackRuw).slice(0, MAX_STACK) : null;
    const pad = schoonPad(invoer.pad);
    const vingerafdruk = invoer.vingerafdruk ?? maakVingerafdruk(invoer.bron, berichtRuw, stackRuw);
    const details = invoer.details ? (schoonDetails(invoer.details) as Record<string, unknown>) : null;

    const supabase = adminClient();
    const { data, error } = await supabase.rpc("registreer_fout", {
      p_vingerafdruk: vingerafdruk,
      p_bron: invoer.bron,
      p_bericht: bericht,
      p_stack: stack,
      p_pad: pad,
      p_digest: invoer.digest?.slice(0, 100) ?? null,
      p_details: details,
    });
    if (error || !data) {
      console.error("Fout registreren mislukt", error?.message, bericht);
      return null;
    }
    const rij = (Array.isArray(data) ? data[0] : data) as FoutRij;
    if (invoer.melden !== false && invoer.bron !== "melding") await meldAlsNodig(rij);
    return rij;
  } catch (e) {
    console.error("Fout registreren mislukt", e);
    return null;
  }
}

const MAX_FOUTMAILS_PER_DAG = 20;

async function meldAlsNodig(rij: FoutRij): Promise<void> {
  const reden = meldReden(rij);
  if (!reden) return;
  // Globale rem: hooguit 20 foutmails per dag, ook als er veel verschillende
  // fouten binnenkomen (bijv. een vloed via het openbare browser-endpoint).
  // Faalt dicht: liever een gemiste mail dan een volgelopen inbox.
  if (!(await magDoorOpSleutel("fouten-mail", MAX_FOUTMAILS_PER_DAG, 86400, { bijFout: "weigeren" }))) return;
  const bron = BRON_LABEL[rij.bron as FoutBron] ?? rij.bron;
  const regels = [
    `${REDEN_TEKST[reden]} (${bron}), ${rij.aantal}× gezien.`,
    "",
    rij.bericht,
    rij.pad ? `\nPagina: ${rij.pad}` : "",
    rij.digest ? `Foutcode: ${rij.digest}` : "",
    "",
    `Bekijk en markeer als opgelost: ${siteUrl()}/admin/fouten/${rij.id}`,
  ].filter((r, i, a) => r !== "" || a[i - 1] !== "");
  await stuurBeheerMelding(`${REDEN_TEKST[reden]}: ${rij.bericht.slice(0, 80)}`, regels.join("\n"), {
    registreren: false,
  });
  // Onthouden dat (en bij welk aantal) er gemaild is; mislukt dit, dan mailen we
  // hooguit een keer te veel.
  await adminClient()
    .from("fouten_log")
    .update({ gemeld_op: new Date().toISOString(), details: { ...(rij.details ?? {}), [GEMELD_BIJ]: rij.aantal } })
    .eq("id", rij.id)
    .then(
      () => undefined,
      () => undefined,
    );
}
