import "server-only";
import { afzender, leesMailAlgemeen, resend } from "../resend";
import { creditnotaMail } from "./mail-html";

/** Mail aan de klant bij een terugbetaling, met de creditnota als PDF-bijlage. Gooit bij fouten. */
export async function stuurCreditnotaMail(opts: {
  email: string;
  naam: string;
  bedragCent: number;
  valuta: string;
  creditnotanummer: string;
  origineelNummer: string | null;
  viaMollie: boolean;
  reden: string | null;
  bijlage: { bestandsnaam: string; pdf: Buffer };
}): Promise<void> {
  const algemeen = await leesMailAlgemeen();
  const { onderwerp, html } = creditnotaMail(algemeen, opts);
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: onderwerp,
    html,
    attachments: [{ filename: opts.bijlage.bestandsnaam, content: opts.bijlage.pdf.toString("base64") }],
  });
  if (error) throw new Error(`Resend creditnota: ${error.message}`);
}
