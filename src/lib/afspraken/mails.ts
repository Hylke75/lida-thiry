import "server-only";
import { stuurPushMelding } from "../push/versturen";
import { adminClient } from "../supabase/admin";
import { leesInstellingen } from "../instellingen";
import { leesSectie } from "../inhoud/lees";
import { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import {
  AFSPRAKEN_AANVRAAGMAIL,
  AFSPRAKEN_ANNULEERMAIL,
  AFSPRAKEN_BEVESTIGMAIL,
  AFSPRAKEN_HERINNERINGMAIL,
} from "../inhoud/groepen/afspraken";
import { stuurAfspraakMail } from "../resend";
import { BEDRIJFSNAAM_STANDAARD, siteUrl } from "../site";
import { foutTekst, stuurBeheerMelding } from "../beheermelding";
import { maakIcs } from "./ics";
import {
  afspraakAanvraagMail,
  afspraakAnnuleringMail,
  afspraakBevestigingMail,
  afspraakHerinneringMail,
  afspraakMeldingMail,
  type AfspraakMail,
  type MailAfspraak,
} from "./mail-html";
import type { AfspraakStatus } from "./regels";
import { TIJDZONE } from "../datum";

/** De velden van een afspraak die de mails nodig hebben. */
export interface MailbareAfspraak {
  id: string;
  soort_id: string | null;
  naam: string;
  email: string;
  telefoon: string | null;
  opmerking: string | null;
  start_op: string;
  eind_op: string;
  status: AfspraakStatus;
  token: string;
  aanbetaling_cent: number;
  betaald_op: string | null;
}

const gevuld = (w: string | null | undefined) => (typeof w === "string" && w.trim() ? w.trim() : null);

interface Context {
  instellingen: Record<string, string | null>;
  mail: MailAfspraak;
}

async function context(a: MailbareAfspraak): Promise<Context> {
  const [instellingen, soort] = await Promise.all([
    leesInstellingen().catch(() => ({}) as Record<string, string | null>),
    a.soort_id
      ? adminClient()
          .from("afspraak_soorten")
          .select("naam, locatie, online")
          .eq("id", a.soort_id)
          .maybeSingle()
          .then((r) => r.data as { naam: string; locatie: string; online: boolean } | null)
      : Promise.resolve(null),
  ]);
  return {
    instellingen,
    mail: {
      naam: a.naam,
      email: a.email,
      telefoon: a.telefoon,
      opmerking: a.opmerking,
      soort: soort?.naam ?? "Afspraak",
      start: a.start_op,
      eind: a.eind_op,
      locatie: soort?.locatie ?? "",
      online: soort?.online ?? false,
      aanbetalingCent: a.aanbetaling_cent,
      betaald: !!a.betaald_op,
    },
  };
}

function beheerAdres(i: Record<string, string | null>): string | null {
  return gevuld(i.adviseur_email) ?? gevuld(i.contact_email) ?? gevuld(process.env.BEHEER_EMAIL);
}

function antwoordAdres(i: Record<string, string | null>): string | null {
  return gevuld(i.contact_email) ?? gevuld(i.adviseur_email);
}

const afspraakLink = (token: string) => `${siteUrl()}/afspraak/${token}`;

/** Het agendabestand bij een afspraak (ook te downloaden via /afspraak/[token]/ics). */
function icsVoor(a: MailbareAfspraak, m: MailAfspraak, instellingen: Record<string, string | null>, geannuleerd = false): string {
  let host = "lidathiry.nl";
  try {
    host = new URL(siteUrl()).host || host;
  } catch {}
  const organisatorMail = antwoordAdres(instellingen);
  const bedrijf = gevuld(instellingen.bedrijfsnaam) ?? BEDRIJFSNAAM_STANDAARD;
  return maakIcs({
    uid: `afspraak-${a.id}@${host}`,
    start: new Date(a.start_op),
    eind: new Date(a.eind_op),
    titel: `${m.soort} – ${bedrijf}`,
    omschrijving: [
      `${m.soort} bij ${bedrijf}.`,
      m.online ? "Deze afspraak is online." : "",
      `Bekijk of annuleer je afspraak: ${afspraakLink(a.token)}`,
    ]
      .filter(Boolean)
      .join("\n"),
    locatie: m.locatie || (m.online ? "Online" : undefined),
    url: afspraakLink(a.token),
    organisator: organisatorMail ? { naam: bedrijf, email: organisatorMail } : null,
    geannuleerd,
  });
}

/** Het agendabestand van een afspraak met de actuele soortgegevens. */
export async function icsVoorAfspraak(a: MailbareAfspraak): Promise<string> {
  const c = await context(a);
  return icsVoor(a, c.mail, c.instellingen, a.status === "geannuleerd");
}

async function verstuurKlant(
  a: MailbareAfspraak,
  c: Context,
  mail: AfspraakMail,
  ics: "bevestiging" | "annulering" | null,
): Promise<void> {
  await stuurAfspraakMail({
    aan: a.email,
    onderwerp: mail.onderwerp,
    html: mail.html,
    tekst: mail.tekst,
    replyTo: antwoordAdres(c.instellingen) ?? beheerAdres(c.instellingen),
    ics: ics
      ? {
          bestandsnaam: ics === "annulering" ? "afspraak-geannuleerd.ics" : "afspraak.ics",
          inhoud: icsVoor(a, c.mail, c.instellingen, ics === "annulering"),
          geannuleerd: ics === "annulering",
        }
      : null,
  });
}

/** Bevestiging aan de klant met het agendabestand. Gooit bij een fout. */
export async function stuurBevestiging(a: MailbareAfspraak): Promise<void> {
  const c = await context(a);
  const [t, algemeen] = await Promise.all([leesSectie(AFSPRAKEN_BEVESTIGMAIL), leesSectie(EMAILS_ALGEMEEN)]);
  await verstuurKlant(a, c, afspraakBevestigingMail(t, algemeen, c.mail, afspraakLink(a.token)), "bevestiging");
}

/** Ontvangstbevestiging van een aanvraag (zonder agendabestand). Gooit bij een fout. */
async function stuurAanvraag(a: MailbareAfspraak): Promise<void> {
  const c = await context(a);
  const [t, algemeen] = await Promise.all([leesSectie(AFSPRAKEN_AANVRAAGMAIL), leesSectie(EMAILS_ALGEMEEN)]);
  await verstuurKlant(a, c, afspraakAanvraagMail(t, algemeen, c.mail, afspraakLink(a.token)), null);
}

/** Herinnering een dag van tevoren. Gooit bij een fout. */
export async function stuurHerinnering(a: MailbareAfspraak): Promise<void> {
  const c = await context(a);
  const [t, algemeen] = await Promise.all([leesSectie(AFSPRAKEN_HERINNERINGMAIL), leesSectie(EMAILS_ALGEMEEN)]);
  await verstuurKlant(a, c, afspraakHerinneringMail(t, algemeen, c.mail, afspraakLink(a.token)), null);
}

/** Annulering aan de klant, met een .ics die de afspraak uit de agenda haalt. Gooit bij een fout. */
export async function stuurAnnulering(a: MailbareAfspraak, reden?: string | null): Promise<void> {
  const c = await context(a);
  const [t, algemeen] = await Promise.all([leesSectie(AFSPRAKEN_ANNULEERMAIL), leesSectie(EMAILS_ALGEMEEN)]);
  await verstuurKlant(a, c, afspraakAnnuleringMail(t, algemeen, c.mail, `${siteUrl()}/afspraak`, reden), "annulering");
}

/** Melding aan de beheerder. Doet niets zonder beheeradres; gooit bij een verzendfout. */
export async function meldBeheerder(
  a: MailbareAfspraak,
  soort: "nieuw" | "geannuleerd" | "betaald_na_annulering",
): Promise<void> {
  const c = await context(a);
  const aan = beheerAdres(c.instellingen);
  if (!aan) {
    console.warn("Geen adviseur_email of contact_email ingesteld: geen melding van de afspraak.");
    return;
  }
  const mail = afspraakMeldingMail({
    soort,
    afspraak: c.mail,
    status: a.status,
    link: `${siteUrl()}/admin/afspraken/${a.id}`,
    bedrijfsnaam: c.instellingen.bedrijfsnaam,
  });
  await stuurAfspraakMail({ aan, onderwerp: mail.onderwerp, html: mail.html, tekst: mail.tekst, replyTo: a.email });
}

/**
 * Na een nieuwe of zojuist betaalde afspraak: bevestiging (of ontvangst van de
 * aanvraag) aan de klant en een melding aan de beheerder. Gooit nooit; wat
 * mislukt, komt in een beheermelding.
 */
export async function naNieuweAfspraak(a: MailbareAfspraak): Promise<void> {
  const klant =
    a.status === "bevestigd" ? stuurBevestiging(a) : a.status === "aangevraagd" ? stuurAanvraag(a) : Promise.resolve();
  const wanneer = new Date(a.start_op).toLocaleString("nl-NL", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: TIJDZONE,
  });
  const [k, b] = await Promise.allSettled([
    klant,
    meldBeheerder(a, "nieuw"),
    stuurPushMelding("afspraak", { titel: "Nieuwe afspraak", tekst: `${a.naam} · ${wanneer}`, url: `/admin/afspraken/${a.id}` }),
  ]);
  const fouten = [
    k.status === "rejected" ? `Bevestiging aan ${a.email}: ${foutTekst(k.reason)}` : null,
    b.status === "rejected" ? `Melding aan beheerder: ${foutTekst(b.reason)}` : null,
  ].filter((f): f is string => !!f);
  if (fouten.length) {
    console.error("Afspraakmail versturen mislukt", fouten);
    await stuurBeheerMelding(
      "Mail bij nieuwe afspraak niet verstuurd",
      `Er is een afspraak gemaakt door ${a.naam} <${a.email}>, maar niet alle mails konden worden verstuurd.\n\n${fouten.join("\n")}\n\nDe afspraak staat in het beheer: ${siteUrl()}/admin/afspraken/${a.id}`,
    );
  }
}
