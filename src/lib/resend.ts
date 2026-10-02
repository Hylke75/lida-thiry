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

/** Besteloverzicht in de bevestigingsmail (bedragen in centen). */
export interface BestelOverzicht {
  /** Prijs vóór korting. */
  prijsCent: number;
  kortingCent: number;
  kortingscode: string | null;
  /** Betaald bedrag (na korting). */
  totaalCent: number;
  valuta: string;
  factuurnummer?: string | null;
}

function bedrag(cent: number, valuta: string): string {
  return new Intl.NumberFormat("nl-NL", { style: "currency", currency: valuta }).format(cent / 100);
}

function overzichtHtml(o: BestelOverzicht): string {
  const rij = (label: string, waarde: string, vet = false) =>
    `<tr><td style="padding:4px 0;${vet ? "font-weight:600" : "color:#555"}">${label}</td><td style="padding:4px 0;text-align:right;${vet ? "font-weight:600" : ""}">${waarde}</td></tr>`;
  const regels = [rij("Persoonlijke kledingadviestest", bedrag(o.prijsCent, o.valuta))];
  if (o.kortingCent > 0) {
    const label = o.kortingscode ? `Korting (${escapeHtml(o.kortingscode)})` : "Korting";
    regels.push(rij(label, `− ${bedrag(o.kortingCent, o.valuta)}`));
  }
  regels.push(rij("Totaal (incl. btw)", bedrag(o.totaalCent, o.valuta), true));
  const factuur = o.factuurnummer
    ? `<p style="font-size:13px;color:#555">Factuurnummer ${escapeHtml(o.factuurnummer)} — de factuur vind je als bijlage bij deze mail.</p>`
    : "";
  return `
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin:20px 0;font-size:14px">${regels.join("")}</table>
      ${factuur}`;
}

/**
 * Bevestigingsmail na een geslaagde (of volledig met korting betaalde) bestelling:
 * "Bedankt voor je bestelling" met besteloverzicht, startknop en optioneel de
 * factuur als PDF-bijlage.
 */
export async function stuurTestlinkMail(opts: {
  naam: string;
  email: string;
  token: string;
  geldigDagen: number;
  overzicht?: BestelOverzicht;
  factuur?: { bestandsnaam: string; pdf: Buffer };
}) {
  const link = `${siteUrl()}/test/${opts.token}`;
  const html = omhulsel(`
      <h1 style="font-size:20px">Bedankt voor je bestelling!</h1>
      <p>Beste ${escapeHtml(opts.naam)},</p>
      <p>Wat fijn dat je de kledingadviestest hebt besteld. Je persoonlijke test staat
      voor je klaar. Neem er rustig de tijd voor en houd een meetlint bij de hand.</p>
      ${opts.overzicht ? overzichtHtml(opts.overzicht) : ""}
      <p style="margin:28px 0">
        <a href="${link}" style="background:#a4634d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">Start de test</a>
      </p>
      <p>Je kunt later verdergaan met dezelfde link; die is ${opts.geldigDagen} dagen geldig.</p>
      <p style="font-size:13px;color:#555">Bij je bestelling heb je ingestemd met directe levering van de digitale inhoud en erkend dat je daarmee je herroepingsrecht verliest.</p>
      <p style="font-size:13px;color:#555">Werkt de knop niet? Kopieer deze link:<br>${link}</p>`);

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: "Bedankt voor je bestelling – je kledingadviestest staat klaar",
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
  const link = `${siteUrl()}/test/${opts.token}`;
  const verloopt = opts.verlooptOp
    ? ` Je link is geldig tot en met ${new Date(opts.verlooptOp).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      })}.`
    : "";
  const html = omhulsel(`
      <h1 style="font-size:20px">Je kledingadviestest wacht nog op je</h1>
      <p>Beste ${escapeHtml(opts.naam)},</p>
      <p>Een paar dagen geleden heb je de kledingadviestest besteld, maar je bent er nog
      niet aan begonnen. Geen zorgen, je test staat gewoon voor je klaar!${verloopt}</p>
      <p>Het invullen duurt ongeveer een kwartier. Pak een meetlint, zoek een rustig
      moment en ontdek welke kleding jouw figuur het mooist laat uitkomen.</p>
      <p style="margin:28px 0">
        <a href="${link}" style="background:#a4634d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">Start de test</a>
      </p>
      <p style="font-size:13px;color:#555">Werkt de knop niet? Kopieer deze link:<br>${link}</p>`);

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: "Herinnering: je kledingadviestest staat nog klaar",
    html,
  });
  if (error) throw new Error(`Resend herinnering: ${error.message}`);
}

/** Interne foutmelding aan de beheerder (platte details, geen klantcommunicatie). */
export async function stuurBeheerMail(opts: { aan: string; onderwerp: string; details: string }) {
  const html = omhulsel(`
      <h1 style="font-size:18px">${escapeHtml(opts.onderwerp)}</h1>
      <pre style="white-space:pre-wrap;font-family:Menlo,Consolas,monospace;font-size:12px;background:#f6f4f1;padding:12px;border-radius:8px">${escapeHtml(opts.details)}</pre>
      <p style="font-size:13px;color:#555">Bekijk de bestellingen in <a href="${siteUrl()}/admin">het beheer</a>.</p>`);
  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.aan,
    subject: `[Beheer] ${opts.onderwerp}`,
    html,
  });
  if (error) throw new Error(`Resend beheer: ${error.message}`);
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function omhulsel(inhoud: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">${inhoud}<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0"><p style="font-size:12px;color:#888">${voettekst}</p></div>`;
}

/** Levert het persoonlijke advies met de PDF als bijlage en een downloadlink. */
export async function stuurAdviesMail(opts: {
  naam: string;
  email: string;
  sleutel: string;
  downloadUrl: string;
  pdf: Buffer;
}) {
  const html = omhulsel(`
    <h1 style="font-size:20px">Je persoonlijke kledingadvies</h1>
    <p>Beste ${escapeHtml(opts.naam)},</p>
    <p>Je advies is klaar! Op basis van je antwoorden is jouw type <strong>${escapeHtml(opts.sleutel)}</strong>.
    Je vindt je persoonlijke advies in de bijgevoegde PDF.</p>
    <p style="margin:24px 0"><a href="${opts.downloadUrl}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">Bekijk je advies (PDF)</a></p>`);

  const { error } = await resend().emails.send({
    from: afzender(),
    to: opts.email,
    subject: "Je persoonlijke kledingadvies staat klaar",
    html,
    attachments: [{ filename: `kledingadvies-${opts.sleutel}.pdf`, content: opts.pdf.toString("base64") }],
  });
  if (error) throw new Error(`Resend advies: ${error.message}`);
}
