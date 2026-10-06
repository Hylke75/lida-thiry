import "server-only";
import { adminClient } from "../supabase/admin";
import { afzender, leesMailAlgemeen, resend } from "../resend";
import { hashIp, magDoorOpSleutel } from "../rate-limit";
import { leesInstellingen } from "../instellingen";
import { leesSectie } from "../inhoud/lees";
import { leesMerk } from "../merk";
import { CONTACT_ANTWOORDMAIL, CONTACT_BEVESTIGMAIL } from "../inhoud/groepen/contact";
import { siteUrl } from "../site";
import { foutTekst, stuurBeheerMelding } from "../beheermelding";
import { contactAntwoordMail, contactBevestigingMail, contactMeldingMail, type ContactMail } from "./mail-html";
import {
  BERICHT_STATUSSEN,
  type BerichtFilter,
  type BerichtStatus,
} from "./regels";
import { veiligeZoekterm } from "../zoeken/regels";

export interface ContactBericht {
  id: string;
  relatie_id: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  onderwerp: string;
  bericht: string;
  status: BerichtStatus;
  pagina: string | null;
  notitie: string;
  aangemaakt_op: string;
  bijgewerkt_op: string;
}

export interface ContactAntwoord {
  id: string;
  bericht_id: string;
  tekst: string;
  verzonden_door: string | null;
  resend_id: string | null;
  verzonden_op: string;
}

export const BERICHT_VELDEN =
  "id, relatie_id, naam, email, telefoon, onderwerp, bericht, status, pagina, notitie, aangemaakt_op, bijgewerkt_op";

/**
 * Aantal ongelezen berichten (status 'nieuw'), bijv. voor een badge in de
 * beheernavigatie. Gooit nooit: bij een fout is het 0.
 */
export async function aantalNieuweBerichten(): Promise<number> {
  try {
    const { count, error } = await adminClient()
      .from("contact_berichten")
      .select("id", { count: "exact", head: true })
      .eq("status", "nieuw");
    return error ? 0 : (count ?? 0);
  } catch {
    return 0;
  }
}

/** Aantal berichten per status (voor de tabbladen in het beheer). */
export async function berichtenPerStatus(): Promise<Record<BerichtStatus, number>> {
  const supabase = adminClient();
  const tellingen = await Promise.all(
    BERICHT_STATUSSEN.map(async (s) => {
      const { count } = await supabase.from("contact_berichten").select("id", { count: "exact", head: true }).eq("status", s);
      return [s, count ?? 0] as const;
    }),
  );
  return Object.fromEntries(tellingen) as Record<BerichtStatus, number>;
}

/** De berichten binnen een filter, nieuwste eerst (met totaal aantal). */
export function berichtenQuery(f: BerichtFilter) {
  let q = adminClient()
    .from("contact_berichten")
    .select(BERICHT_VELDEN, { count: "exact" })
    .order("aangemaakt_op", { ascending: false })
    .order("id");
  if (f.weergave === "inbox") q = q.in("status", ["nieuw", "gelezen", "beantwoord"]);
  else q = q.eq("status", f.weergave);
  const zoek = f.q ? veiligeZoekterm(f.q, { underscoreWeg: true }) : "";
  if (zoek) {
    q = q.or(
      ["naam", "email", "onderwerp", "bericht"].map((k) => `${k}.ilike.*${zoek}*`).join(","),
    );
  }
  return q;
}

// Versturen ------------------------------------------------------------------------------

async function verstuur(opts: { aan: string; mail: ContactMail; replyTo?: string | null }): Promise<string | null> {
  const { data, error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: opts.mail.onderwerp,
    html: opts.mail.html,
    text: opts.mail.tekst,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
  return data?.id ?? null;
}

const gevuld = (w: string | null | undefined) => (typeof w === "string" && w.trim() ? w.trim() : null);

/**
 * Na een nieuw bericht: (a) een melding aan de beheerder (adviseur_email, anders
 * contact_email) met reply-to de afzender, en (b) een algemene ontvangstbevestiging
 * aan de afzender (zonder de ingevulde naam of tekst, hooguit 2 per dag per adres).
 * Gooit nooit; mislukte mails worden gelogd en gemeld.
 */
export async function stuurContactMails(b: ContactBericht): Promise<void> {
  let instellingen: Record<string, string | null> = {};
  try {
    instellingen = await leesInstellingen();
  } catch (e) {
    console.error("Instellingen lezen mislukt (contactmail)", e);
  }
  const beheerder = gevuld(instellingen.adviseur_email) ?? gevuld(instellingen.contact_email) ?? gevuld(process.env.BEHEER_EMAIL);

  const melding = async () => {
    if (!beheerder) {
      console.warn("Geen adviseur_email of contact_email ingesteld: geen melding van nieuw contactbericht.");
      return;
    }
    const mail = contactMeldingMail({
      naam: b.naam,
      email: b.email,
      telefoon: b.telefoon,
      onderwerp: b.onderwerp,
      bericht: b.bericht,
      pagina: b.pagina,
      link: `${siteUrl()}/admin/berichten/${b.id}`,
      bedrijfsnaam: instellingen.bedrijfsnaam,
    });
    await verstuur({ aan: beheerder, mail, replyTo: b.email });
  };

  const bevestiging = async () => {
    // Hooguit twee ontvangstbevestigingen per dag naar hetzelfde adres: het
    // formulier accepteert elk adres, dus anders is het een mailkanon.
    if (!(await magDoorOpSleutel(`contact-bevestiging:${hashIp(b.email.toLowerCase())}`, 2, 86_400))) return;
    const [t, algemeen] = await Promise.all([leesSectie(CONTACT_BEVESTIGMAIL), leesMailAlgemeen()]);
    const mail = contactBevestigingMail(t, algemeen);
    await verstuur({ aan: b.email, mail, replyTo: gevuld(instellingen.contact_email) ?? beheerder });
  };

  const [m, v] = await Promise.allSettled([melding(), bevestiging()]);
  const fouten = [
    m.status === "rejected" ? `Melding aan beheerder: ${foutTekst(m.reason)}` : null,
    v.status === "rejected" ? `Ontvangstbevestiging aan ${b.email}: ${foutTekst(v.reason)}` : null,
  ].filter((f): f is string => !!f);
  if (fouten.length) {
    console.error("Contactmail versturen mislukt", fouten);
    await stuurBeheerMelding(
      "Mail bij contactbericht niet verstuurd",
      `Er kwam een bericht binnen van ${b.naam} <${b.email}>, maar niet alle mails konden worden verstuurd.\n\n${fouten.join("\n")}\n\nHet bericht staat in het beheer: ${siteUrl()}/admin/berichten/${b.id}`,
    );
  }
}

/**
 * Verstuurt een antwoord op een bericht. Reply-to is contact_email (anders
 * adviseur_email), zodat een reactie in de gewone mailbox terechtkomt.
 * Gooit bij een fout; geeft het Resend-id terug.
 */
export async function verstuurAntwoord(b: ContactBericht, antwoord: string): Promise<string | null> {
  const [t, instellingen, merk] = await Promise.all([
    leesSectie(CONTACT_ANTWOORDMAIL),
    leesInstellingen().catch(() => ({}) as Record<string, string | null>),
    leesMerk(),
  ]);
  const mail = contactAntwoordMail(
    t,
    {
      antwoord,
      naam: b.naam,
      onderwerp: b.onderwerp,
      bericht: b.bericht,
      ontvangenOp: b.aangemaakt_op,
    },
    merk,
  );
  return verstuur({
    aan: b.email,
    mail,
    replyTo: gevuld(instellingen.contact_email) ?? gevuld(instellingen.adviseur_email),
  });
}
