import "server-only";
import { Resend } from "resend";
import { siteUrl } from "./site";

function resend() {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY ontbreekt (server).");
  return new Resend(key);
}

function afzender(): string {
  // Geverifieerd afzenderadres (Resend-domein). OPEN tot het domein geverifieerd is.
  return process.env.RESEND_VAN || "Lida Thiry <onboarding@resend.dev>";
}

const voettekst =
  "© Lida Thiry Imago & Kledingadvies";

/** Stuurt de testlink-mail na een geslaagde betaling. */
export async function stuurTestlinkMail(opts: {
  naam: string;
  email: string;
  token: string;
  geldigDagen: number;
}) {
  const link = `${siteUrl()}/test/${opts.token}`;
  const html = `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">
      <h1 style="font-size:20px">Je persoonlijke kledingadviestest staat klaar</h1>
      <p>Beste ${escapeHtml(opts.naam)},</p>
      <p>Bedankt voor je bestelling. Via onderstaande knop start je de test. Je kunt
      later verdergaan met dezelfde link; die is ${opts.geldigDagen} dagen geldig.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">Start de test</a>
      </p>
      <p style="font-size:13px;color:#555">Werkt de knop niet? Kopieer deze link:<br>${link}</p>
      <hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0">
      <p style="font-size:12px;color:#888">${voettekst}</p>
    </div>`;

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: "Je kledingadviestest staat klaar",
    html,
  });
  if (error) throw new Error(`Resend: ${error.message}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
