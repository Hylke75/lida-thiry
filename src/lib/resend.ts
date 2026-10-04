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
  type MijnAdviesMailLinks,
} from "./email-html";

export type { BestelOverzicht } from "./email-html";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt (server).");
  return new Resend(key);
}

function afzender(): string {
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
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_BEVESTIGING), leesSectie(EMAILS_ALGEMEEN)]);
  const { onderwerp, html } = bevestigingMail(teksten, algemeen, {
    naam: opts.naam,
    link: `${siteUrl()}/test/${opts.token}`,
    geldigDagen: opts.geldigDagen,
    overzicht: opts.overzicht,
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
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_HERINNERING), leesSectie(EMAILS_ALGEMEEN)]);
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
  const [teksten, algemeen] = await Promise.all([leesSectie(NIEUWSBRIEF_BEVESTIGMAIL), leesSectie(EMAILS_ALGEMEEN)]);
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
      <h1 style="font-size:18px">${escapeHtml(opts.onderwerp)}</h1>
      <pre style="white-space:pre-wrap;font-family:Menlo,Consolas,monospace;font-size:12px;background:#f6f4f1;padding:12px;border-radius:8px">${escapeHtml(opts.details)}</pre>
      <p style="font-size:13px;color:#555">Bekijk de bestellingen in <a href="${siteUrl()}/admin">het beheer</a>.</p>`,
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
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_ADVIES), leesSectie(EMAILS_ALGEMEEN)]);
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
  const knop = (href: string, tekst: string) =>
    `<p><a href="${escapeHtml(href)}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:10px 20px;border-radius:999px;text-decoration:none">${tekst}</a></p>`;
  const inhoud = opts.link
    ? `<h1 style="font-size:18px">${opts.nieuw ? "Je bent uitgenodigd voor het beheer" : "Inloggen in het beheer"}</h1>
       <p>${opts.nieuw ? "Je hebt toegang gekregen tot het beheer van de website van Lida Thiry Imago &amp; Kledingadvies." : "Hier is een link om in te loggen in het beheer."} Klik op de knop en kies daarna een eigen wachtwoord.</p>
       ${knop(opts.link, opts.nieuw ? "Uitnodiging accepteren" : "Inloggen en wachtwoord instellen")}
       <p style="font-size:13px;color:#555">De link werkt één keer en is beperkt geldig (standaard 1 uur). Werkt hij niet meer, vraag dan om een nieuwe.</p>`
    : `<h1 style="font-size:18px">Je hebt toegang tot het beheer</h1>
       <p>Je kunt nu inloggen in het beheer van de website van Lida Thiry Imago &amp; Kledingadvies met je bestaande e-mailadres en wachtwoord.</p>
       ${knop(`${siteUrl()}/admin/inloggen`, "Naar het beheer")}`;
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: opts.link && opts.nieuw ? "Uitnodiging voor het beheer" : "Toegang tot het beheer",
    html: `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">${inhoud}</div>`,
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
  const [teksten, algemeen] = await Promise.all([leesSectie(CADEAUBON_MAIL), leesSectie(EMAILS_ALGEMEEN)]);
  const basisUrl = siteUrl();
  const { onderwerp, html } = cadeaubonMail(teksten, algemeen, {
    aan: opts.aan,
    bon: opts.bon,
    bestelUrl: `${basisUrl}/bestellen`,
    basisUrl,
    factuurnummer: opts.aan === "koper" ? opts.factuur?.factuurnummer : null,
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
    leesSectie(EMAILS_ALGEMEEN),
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
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_BETAALHERINNERING), leesSectie(EMAILS_ALGEMEEN)]);
  const { onderwerp, html } = betaalherinneringMail(teksten, algemeen, { ...opts, basisUrl: siteUrl() });
  const { error } = await resend().emails.send({ from: afzender(), to: opts.email, subject: onderwerp, html });
  if (error) throw new Error(`Resend betaalherinnering: ${error.message}`);
}

/** Nieuwe links naar het advies en/of de nog niet afgeronde test (pagina Mijn advies). */
export async function stuurMijnAdviesMail(opts: { email: string; naam: string | null } & MijnAdviesMailLinks) {
  const [teksten, algemeen] = await Promise.all([leesSectie(EMAILS_MIJN_ADVIES), leesSectie(EMAILS_ALGEMEEN)]);
  const { onderwerp, html } = mijnAdviesMail(teksten, algemeen, {
    naam: opts.naam,
    adviezen: opts.adviezen,
    tests: opts.tests,
    basisUrl: siteUrl(),
  });
  const { error } = await resend().emails.send({ from: afzender(), to: opts.email, subject: onderwerp, html });
  if (error) throw new Error(`Resend mijn advies: ${error.message}`);
}
