import "server-only";
import { Resend } from "resend";
import { siteUrl } from "./site";
import { leesSectie } from "./inhoud/lees";
import { standaardWaarden } from "./inhoud/schema";
import { escapeHtml } from "./inhoud/opmaak";
import {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BEVESTIGING,
  EMAILS_HERINNERING,
} from "./inhoud/groepen/emails";
import { adviesMail, bevestigingMail, herinneringMail, omhulsel, type BestelOverzicht } from "./email-html";

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
