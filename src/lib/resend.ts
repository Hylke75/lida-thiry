import "server-only";
import { Resend } from "resend";
import { siteUrl } from "./site";
import { leesSectie } from "./inhoud/lees";
import { standaardWaarden } from "./inhoud/schema";
import { escapeHtml } from "./inhoud/opmaak";
import {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BETAALHERINNERING,
  EMAILS_BEVESTIGING,
  EMAILS_HERINNERING,
  EMAILS_MIJN_ADVIES,
} from "./inhoud/groepen/emails";
import { NIEUWSBRIEF_BEVESTIGMAIL } from "./inhoud/groepen/nieuwsbrief";
import { CADEAUBON_KOPERMAIL, CADEAUBON_MAIL } from "./inhoud/groepen/cadeaubon";
import { REVIEWS_UITNODIGING } from "./inhoud/groepen/reviews";
import { BESTELLEN_FACTUUR } from "./inhoud/groepen/bestellen";
import {
  adviesMail,
  betaalherinneringMail,
  bevestigingMail,
  cadeaubonKoperMail,
  cadeaubonMail,
  herinneringMail,
  mijnAdviesMail,
  nieuwsbriefBevestigingMail,
  omhulsel,
  type BestelOverzicht,
  type BonGegevens,
  type MijnAdviesMailLinks, reviewUitnodigingMail } from "./email-html";
import { KLEIN, KLEUR, kopHtml, knopHtml, mailDocument } from "./mail-opmaak";
import { leesMerk } from "./merk";

export type { BestelOverzicht } from "./email-html";

/** Resend-client (alleen server-side). Gedeeld door alle mails: bestellingen, nieuwsbrief en contact. */
export function resend(): Resend {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt (server).");
  return new Resend(key);
}

/**
 * De algemene mailteksten (voettekst) plus het woordmerk zoals op de site, voor
 * de kop van elke klantmail. Faalt zacht (standaardteksten en -woordmerk).
 */
export async function leesMailAlgemeen() {
  const [algemeen, merk] = await Promise.all([leesSectie(EMAILS_ALGEMEEN), leesMerk()]);
  return { ...algemeen, merk };
}

/** Afzender van alle mails. */
export function afzender(): string {
  // Geverifieerd afzenderadres (Resend-domein). OPEN tot het domein geverifieerd is.
  return process.env.RESEND_VAN || "Lida Thiry <onboarding@resend.dev>";
}

/**
 * Bevestigingsmail na een geslaagde (of volledig met korting betaalde) bestelling:
 * "Bedankt voor je bestelling" met besteloverzicht, startknop en optioneel de
 * factuur als PDF-bijlage. Teksten: Beheer → Teksten → E-mails.
 */
export async function stuurTestlinkMail(opts: {
  naam: string;
  email: string;
  token: string;
  geldigDagen: number;
  overzicht?: BestelOverzicht;
  factuur?: { bestandsnaam: string; pdf: Buffer };
}) {
  const [teksten, algemeen, factuur] = await Promise.all([
    leesSectie(EMAILS_BEVESTIGING),
    leesMailAlgemeen(),
    leesSectie(BESTELLEN_FACTUUR),
  ]);
  const { onderwerp, html } = bevestigingMail(teksten, algemeen, {
    naam: opts.naam,
    link: `${siteUrl()}/test/${opts.token}`,
    geldigDagen: opts.geldigDagen,
    overzicht: opts.overzicht,
    factuurRegel: factuur.mailRegel,
  });

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
    ...(opts.factuur
      ? {
          attachments: [
            { filename: opts.factuur.bestandsnaam, content: opts.factuur.pdf.toString("base64") },
          ],
        }
      : {}),
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

/** Vriendelijke herinnering wanneer de test een paar dagen na betaling nog niet is gedaan. */
export async function stuurHerinneringMail(opts: {
  naam: string;
  email: string;
  token: string;
  verlooptOp: string | null;
}) {
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_HERINNERING), leesMailAlgemeen()]);
  const { onderwerp, html } = herinneringMail(teksten, algemeen, {
    naam: opts.naam,
    link: `${siteUrl()}/test/${opts.token}`,
    verlooptOp: opts.verlooptOp,
  });

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
  });
  if (error) throw new Error(`Resend herinnering: ${error.message}`);
}

/**
 * Bevestigingsmail voor de nieuwsbrief (dubbele opt-in) met de persoonlijke
 * bevestigingslink. Teksten: Beheer → Teksten → Nieuwsbrief.
 */
export async function stuurNieuwsbriefBevestiging(opts: { email: string; naam?: string | null; link: string }) {
  const [teksten, algemeen] = await Promise.all([leesSectie(NIEUWSBRIEF_BEVESTIGMAIL), leesMailAlgemeen()]);
  const { onderwerp, html } = nieuwsbriefBevestigingMail(teksten, algemeen, { naam: opts.naam, link: opts.link });
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
  });
  if (error) throw new Error(`Resend nieuwsbrief-bevestiging: ${error.message}`);
}

/**
 * Interne foutmelding aan de beheerder (platte details, geen klantcommunicatie).
 * Gebruikt bewust de standaardvoettekst: deze mail moet ook werken als de
 * database niet bereikbaar is.
 */
export async function stuurBeheerMail(opts: { aan: string; onderwerp: string; details: string }) {
  const html = omhulsel(
    `
      ${kopHtml(opts.onderwerp)}
      <pre style="white-space:pre-wrap;font-family:Menlo,Consolas,monospace;font-size:12px;background:${KLEUR.cream};padding:14px;border-radius:14px">${escapeHtml(opts.details)}</pre>
      <p style="${KLEIN}">Bekijk de bestellingen in <a href="${siteUrl()}/admin" style="color:${KLEUR.berry}">het beheer</a>.</p>`,
    standaardWaarden(EMAILS_ALGEMEEN).voettekst,
  );
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: `[Beheer] ${opts.onderwerp}`,
    html,
  });
  if (error) throw new Error(`Resend beheer: ${error.message}`);
}

/** Levert het persoonlijke advies met de PDF als bijlage en een downloadlink. */
export async function stuurAdviesMail(opts: {
  naam: string;
  email: string;
  sleutel: string;
  downloadUrl: string;
  pdf: Buffer;
}) {
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_ADVIES), leesMailAlgemeen()]);
  const { onderwerp, html } = adviesMail(teksten, algemeen, {
    naam: opts.naam,
    sleutel: opts.sleutel,
    downloadUrl: opts.downloadUrl,
    basisUrl: siteUrl(),
  });

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
    attachments: [{ filename: `kledingadvies-${opts.sleutel}.pdf`, content: opts.pdf.toString("base64") }],
  });
  if (error) throw new Error(`Resend advies: ${error.message}`);
}

/**
 * Stuurt de uitnodiging of inloglink. Gooit een fout als dat niet lukt (bijv.
 * geen RESEND_API_KEY, of het testadres van Resend dat alleen naar de eigenaar
 * van het Resend-account mag sturen).
 */
export async function stuurBeheerderMail(opts: { aan: string; link: string | null; nieuw: boolean }) {
  const knop = (href: string, tekst: string) => knopHtml(href, tekst, "donker", "24px 0");
  const inhoud = opts.link
    ? `${kopHtml(opts.nieuw ? "Je bent uitgenodigd voor het beheer" : "Inloggen in het beheer")}
       <p>${opts.nieuw ? "Je hebt toegang gekregen tot het beheer van de website van Lida Thiry Imago &amp; Kledingadvies." : "Hier is een link om in te loggen in het beheer."} Klik op de knop en kies daarna een eigen wachtwoord.</p>
       ${knop(opts.link, opts.nieuw ? "Uitnodiging accepteren" : "Inloggen en wachtwoord instellen")}
       <p style="${KLEIN}">De link werkt één keer en is beperkt geldig (standaard 1 uur). Werkt hij niet meer, vraag dan om een nieuwe.</p>`
    : `${kopHtml("Je hebt toegang tot het beheer")}
       <p>Je kunt nu inloggen in het beheer van de website van Lida Thiry Imago &amp; Kledingadvies met je bestaande e-mailadres en wachtwoord.</p>
       ${knop(`${siteUrl()}/admin/inloggen`, "Naar het beheer")}`;
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: opts.link && opts.nieuw ? "Uitnodiging voor het beheer" : "Toegang tot het beheer",
    html: mailDocument({ inhoud, onder: "" }),
  });
  if (error) throw new Error(error.message);
}

interface Bijlage {
  bestandsnaam: string;
  pdf: Buffer;
}

function bijlagen(lijst: readonly (Bijlage | null | undefined)[]) {
  const echt = lijst.filter((b): b is Bijlage => Boolean(b));
  return echt.length
    ? { attachments: echt.map((b) => ({ filename: b.bestandsnaam, content: b.pdf.toString("base64") })) }
    : {};
}

/**
 * De mail met de cadeaubon (en de bon als PDF), aan de koper of de ontvanger.
 * Aan de koper gaat ook de factuur mee, als die er is.
 * Teksten: Beheer → Teksten → Cadeaubon.
 */
export async function stuurCadeaubonMail(opts: {
  aan: "koper" | "ontvanger";
  email: string;
  bon: BonGegevens;
  bonPdf: Bijlage | null;
  factuur?: (Bijlage & { factuurnummer: string }) | null;
}) {
  const [teksten, algemeen, factuurTeksten] = await Promise.all([
    leesSectie(CADEAUBON_MAIL),
    leesMailAlgemeen(),
    leesSectie(BESTELLEN_FACTUUR),
  ]);
  const basisUrl = siteUrl();
  const { onderwerp, html } = cadeaubonMail(teksten, algemeen, {
    aan: opts.aan,
    bon: opts.bon,
    bestelUrl: `${basisUrl}/bestellen`,
    basisUrl,
    factuurnummer: opts.aan === "koper" ? opts.factuur?.factuurnummer : null,
    factuurRegel: factuurTeksten.mailRegel,
  });
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
    ...bijlagen([opts.bonPdf, opts.aan === "koper" ? opts.factuur : null]),
  });
  if (error) throw new Error(`Resend cadeaubon: ${error.message}`);
}

/** Bevestiging aan de koper als de bon naar de ontvanger gaat (met de factuur). */
export async function stuurCadeaubonKoperMail(opts: {
  email: string;
  bon: BonGegevens;
  ontvangerEmail: string;
  verzendOp: string | null;
  factuur?: (Bijlage & { factuurnummer: string }) | null;
}) {
  const [teksten, bonTeksten, algemeen] = await Promise.all([
    leesSectie(CADEAUBON_KOPERMAIL),
    leesSectie(CADEAUBON_MAIL),
    leesMailAlgemeen(),
  ]);
  const { onderwerp, html } = cadeaubonKoperMail(teksten, bonTeksten, algemeen, {
    bon: opts.bon,
    ontvangerEmail: opts.ontvangerEmail,
    verzendOp: opts.verzendOp,
    basisUrl: siteUrl(),
    factuurnummer: opts.factuur?.factuurnummer,
  });
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
    ...bijlagen([opts.factuur]),
  });
  if (error) throw new Error(`Resend cadeaubon-bevestiging: ${error.message}`);
}

/** Eenmalige herinnering om een niet-afgeronde betaling alsnog af te ronden. */
export async function stuurBetaalherinneringMail(opts: {
  naam: string;
  email: string;
  bedragCent: number;
  valuta: string;
  link: string;
}) {
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_BETAALHERINNERING), leesMailAlgemeen()]);
  const { onderwerp, html } = betaalherinneringMail(teksten, algemeen, { ...opts, basisUrl: siteUrl() });
  const { error } = await resend().emails.send({ from: afzender(), to: opts.email, subject: onderwerp, html });
  if (error) throw new Error(`Resend betaalherinnering: ${error.message}`);
}

/** Nieuwe links naar het advies en/of de nog niet afgeronde test (pagina Mijn advies). */
export async function stuurMijnAdviesMail(opts: { email: string; naam: string | null } & MijnAdviesMailLinks) {
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_MIJN_ADVIES), leesMailAlgemeen()]);
  const { onderwerp, html } = mijnAdviesMail(teksten, algemeen, {
    naam: opts.naam,
    adviezen: opts.adviezen,
    tests: opts.tests,
    basisUrl: siteUrl(),
  });
  const { error } = await resend().emails.send({ from: afzender(), to: opts.email, subject: onderwerp, html });
  if (error) throw new Error(`Resend mijn advies: ${error.message}`);
}

/** Vraagt een klant om een review (link naar /review/<token>). Teksten: Beheer → Teksten → Reviews. */
export async function stuurReviewUitnodiging(opts: { email: string; naam: string; token: string }) {
  const [teksten, algemeen] = await Promise.all([leesSectie(REVIEWS_UITNODIGING), leesMailAlgemeen()]);
  const { onderwerp, html } = reviewUitnodigingMail(teksten, algemeen, {
    naam: opts.naam,
    link: `${siteUrl()}/review/${opts.token}`,
  });
  const { error } = await resend().emails.send({ from: afzender(), to: opts.email, subject: onderwerp, html });
  if (error) throw new Error(`Resend review-uitnodiging: ${error.message}`);
}

/**
 * Mail rond een afspraak (bevestiging, herinnering, annulering of melding aan de
 * beheerder). De inhoud komt uit de pure bouwers in afspraken/mail-html.ts; een
 * agendabestand (.ics) gaat optioneel als bijlage mee. Gooit bij een fout.
 */
export async function stuurAfspraakMail(opts: {
  aan: string;
  onderwerp: string;
  html: string;
  tekst: string;
  replyTo?: string | null;
  ics?: { bestandsnaam: string; inhoud: string; geannuleerd?: boolean } | null;
}) {
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: opts.onderwerp,
    html: opts.html,
    text: opts.tekst,
    ...(opts.replyTo ? { replyTo: opts.replyTo } : {}),
    ...(opts.ics
      ? {
          attachments: [
            {
              filename: opts.ics.bestandsnaam,
              content: Buffer.from(opts.ics.inhoud, "utf8").toString("base64"),
              contentType: `text/calendar; charset=utf-8; method=${opts.ics.geannuleerd ? "CANCEL" : "PUBLISH"}`,
            },
          ],
        }
      : {}),
  });
  if (error) throw new Error(`Resend afspraak: ${error.message}`);
}
