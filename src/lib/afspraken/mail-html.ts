// De mails rond afspraken als pure functies: teksten (Beheer → Teksten →
// Afspraken) en gegevens erin; onderwerp, HTML en platte tekst eruit. Het
// versturen staat in afspraken/mails.ts.

import { escapeHtml, opmaakNaarHtml } from "../inhoud/opmaak";
import { vulIn, type SectieWaarden } from "../inhoud/schema";
import { omhulsel } from "../email-html";
import { platteTekstHtml, zonderOpmaak } from "../contact/mail-html";
import type { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import type {
  AFSPRAKEN_AANVRAAGMAIL,
  AFSPRAKEN_ANNULEERMAIL,
  AFSPRAKEN_BEVESTIGMAIL,
  AFSPRAKEN_HERINNERINGMAIL,
} from "../inhoud/groepen/afspraken";
import { datumLabel, tijdLabel } from "../datum";
import { bedragLabel, duurLabel, STATUS_LABEL, type AfspraakStatus } from "./regels";
import { BEDRIJFSNAAM_STANDAARD } from "../site";

export interface AfspraakMail {
  onderwerp: string;
  html: string;
  tekst: string;
}

/** De gegevens van een afspraak die in elke mail terugkomen. */
export interface MailAfspraak {
  naam: string;
  email: string;
  telefoon?: string | null;
  opmerking?: string | null;
  soort: string;
  start: string;
  eind: string;
  locatie: string;
  online: boolean;
  aanbetalingCent: number;
  betaald: boolean;
}

type Algemeen = SectieWaarden<typeof EMAILS_ALGEMEEN>;

const KLEIN = "font-size:13px;color:#555";
const STIJL = { a: "color:#a4634d", ul: "padding-left:20px" } as const;

/** Invulwaarden voor de teksten. */
export function mailWaarden(a: MailAfspraak): Record<string, string> {
  return {
    naam: a.naam,
    soort: a.soort,
    datum: datumLabel(a.start),
    tijd: tijdLabel(a.start),
    eindtijd: tijdLabel(a.eind),
    locatie: a.locatie || (a.online ? "online" : ""),
  };
}

function detailRegels(a: MailAfspraak): [string, string][] {
  const duur = Math.round((new Date(a.eind).getTime() - new Date(a.start).getTime()) / 60_000);
  const w = mailWaarden(a);
  const regels: [string, string][] = [
    ["Afspraak", a.soort],
    ["Datum", w.datum],
    ["Tijd", `${w.tijd} – ${w.eindtijd} (${duurLabel(duur)})`],
  ];
  if (w.locatie) regels.push(["Locatie", w.locatie]);
  if (a.aanbetalingCent > 0) {
    regels.push(["Aanbetaling", `${bedragLabel(a.aanbetalingCent)}${a.betaald ? " (betaald)" : ""}`]);
  }
  return regels;
}

function detailsHtml(a: MailAfspraak): string {
  const rijen = detailRegels(a)
    .map(
      ([k, v]) =>
        `<tr><td style="padding:4px 14px 4px 0;color:#777;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:4px 0">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<table style="border-collapse:collapse;font-size:14px;margin:20px 0;background:#f6f4f1;border-radius:8px;width:100%"><tbody><tr><td style="padding:12px 16px"><table style="border-collapse:collapse">${rijen}</table></td></tr></tbody></table>`;
}

function detailsTekst(a: MailAfspraak): string {
  return detailRegels(a)
    .map(([k, v]) => `${k}: ${v}`)
    .join("\n");
}

function knop(url: string, tekst: string): string {
  return `<p style="margin:28px 0"><a href="${escapeHtml(url)}" style="background:#a4634d;color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">${escapeHtml(tekst)}</a></p>`;
}

function klantMail(
  t: { onderwerp: string; kop: string; tekst: string; knop: string; na_knop?: string },
  algemeen: Algemeen,
  a: MailAfspraak,
  link: string,
  extraHtml = "",
  extraTekst = "",
): AfspraakMail {
  const w = mailWaarden(a);
  const html = omhulsel(
    `
      <h1 style="font-size:20px">${escapeHtml(vulIn(t.kop, w))}</h1>
      ${opmaakNaarHtml(t.tekst, { variabelen: w, stijl: STIJL })}
      ${detailsHtml(a)}
      ${extraHtml}
      ${knop(link, vulIn(t.knop, w))}
      ${t.na_knop ? opmaakNaarHtml(t.na_knop, { variabelen: w, stijl: { ...STIJL, p: KLEIN } }) : ""}
      <p style="${KLEIN}">Werkt de knop niet? Kopieer dan deze link:<br>${escapeHtml(link)}</p>`,
    algemeen.voettekst,
  );
  const tekst = [
    vulIn(t.kop, w),
    "",
    zonderOpmaak(vulIn(t.tekst, w)),
    "",
    detailsTekst(a),
    extraTekst ? `\n${extraTekst}` : "",
    "",
    `${vulIn(t.knop, w)}: ${link}`,
    t.na_knop ? `\n${zonderOpmaak(vulIn(t.na_knop, w))}` : "",
    "",
    "--",
    algemeen.voettekst,
  ]
    .filter((r, i, arr) => !(r === "" && arr[i - 1] === ""))
    .join("\n");
  return { onderwerp: vulIn(t.onderwerp, w).slice(0, 200), html, tekst };
}

/** Bevestiging aan de klant (met .ics als bijlage, zie mails.ts). */
export function afspraakBevestigingMail(
  t: SectieWaarden<typeof AFSPRAKEN_BEVESTIGMAIL>,
  algemeen: Algemeen,
  a: MailAfspraak,
  link: string,
): AfspraakMail {
  return klantMail(t, algemeen, a, link);
}

/** Ontvangstbevestiging van een aanvraag (handmatig bevestigen). */
export function afspraakAanvraagMail(
  t: SectieWaarden<typeof AFSPRAKEN_AANVRAAGMAIL>,
  algemeen: Algemeen,
  a: MailAfspraak,
  link: string,
): AfspraakMail {
  return klantMail(t, algemeen, a, link);
}

/** Herinnering een dag van tevoren. */
export function afspraakHerinneringMail(
  t: SectieWaarden<typeof AFSPRAKEN_HERINNERINGMAIL>,
  algemeen: Algemeen,
  a: MailAfspraak,
  link: string,
): AfspraakMail {
  return klantMail(t, algemeen, a, link);
}

/** Annulering aan de klant, met optioneel een toelichting. `link` = nieuwe afspraak maken. */
export function afspraakAnnuleringMail(
  t: SectieWaarden<typeof AFSPRAKEN_ANNULEERMAIL>,
  algemeen: Algemeen,
  a: MailAfspraak,
  link: string,
  reden?: string | null,
): AfspraakMail {
  const r = reden?.trim();
  const extraHtml = r
    ? `<p style="${KLEIN};margin:0 0 6px">${escapeHtml(t.reden_kop)}</p><div style="border-left:3px solid #e5ddd5;padding:4px 0 4px 14px;color:#555">${platteTekstHtml(r, "margin:0 0 10px")}</div>`
    : "";
  const extraTekst = r ? `${t.reden_kop}\n${r}` : "";
  return klantMail(t, algemeen, a, link, extraHtml, extraTekst);
}

/** Interne melding aan de beheerder (nieuwe afspraak, of geannuleerd door de klant). */
export function afspraakMeldingMail(opts: {
  soort: "nieuw" | "geannuleerd" | "betaald_na_annulering";
  afspraak: MailAfspraak;
  status: AfspraakStatus;
  /** Absolute link naar de afspraak in het beheer. */
  link: string;
  bedrijfsnaam?: string | null;
}): AfspraakMail {
  const a = opts.afspraak;
  const w = mailWaarden(a);
  const kop =
    opts.soort === "nieuw"
      ? opts.status === "aangevraagd"
        ? "Nieuwe aanvraag voor een afspraak"
        : "Nieuwe afspraak"
      : opts.soort === "geannuleerd"
        ? "Afspraak geannuleerd door de klant"
        : "Aanbetaling ontvangen voor een geannuleerde afspraak";
  const toelichting =
    opts.soort === "betaald_na_annulering"
      ? "De betaling kwam binnen nadat de afspraak al was vervallen of geannuleerd. Neem contact op met de klant: opnieuw inplannen of het bedrag terugbetalen (via Mollie)."
      : opts.soort === "geannuleerd" && a.aanbetalingCent > 0 && a.betaald
        ? "Er is een aanbetaling gedaan. Betaal die zo nodig terug via het Mollie-dashboard."
        : opts.status === "aangevraagd"
          ? "Bevestig of annuleer de aanvraag in het beheer; de klant krijgt dan automatisch een mail."
          : "";
  const contact: [string, string][] = [
    ["Naam", a.naam],
    ["E-mail", a.email],
    ...(a.telefoon ? ([["Telefoon", a.telefoon]] as [string, string][]) : []),
    ["Status", STATUS_LABEL[opts.status]],
  ];
  const rij = ([k, v]: [string, string]) =>
    `<tr><td style="padding:3px 12px 3px 0;color:#777;vertical-align:top;white-space:nowrap">${escapeHtml(k)}</td><td style="padding:3px 0">${escapeHtml(v)}</td></tr>`;
  const html = omhulsel(
    `
      <h1 style="font-size:20px">${escapeHtml(kop)}</h1>
      ${toelichting ? `<p>${escapeHtml(toelichting)}</p>` : ""}
      <table style="border-collapse:collapse;font-size:14px;margin:0 0 8px">${contact.map(rij).join("")}</table>
      ${detailsHtml(a)}
      ${a.opmerking ? `<p style="${KLEIN};margin:0 0 6px">Opmerking van de klant:</p><div style="background:#f6f4f1;border-radius:8px;padding:12px 16px">${platteTekstHtml(a.opmerking, "margin:0 0 10px")}</div>` : ""}
      <p style="margin:24px 0"><a href="${escapeHtml(opts.link)}" style="background:#1a1a1a;color:#fff;text-decoration:none;padding:10px 20px;border-radius:9999px;font-weight:600">Bekijk in het beheer</a></p>`,
    opts.bedrijfsnaam?.trim() || BEDRIJFSNAAM_STANDAARD,
  );
  const tekst = [
    kop,
    toelichting,
    "",
    ...contact.map(([k, v]) => `${k}: ${v}`),
    "",
    detailsTekst(a),
    a.opmerking ? `\nOpmerking van de klant:\n${a.opmerking}` : "",
    "",
    `Bekijk in het beheer: ${opts.link}`,
  ]
    .filter((r, i, arr) => !(r === "" && arr[i - 1] === ""))
    .join("\n");
  const onderwerp = `${kop}: ${a.naam}, ${w.datum} ${w.tijd}`.slice(0, 200);
  return { onderwerp, html, tekst };
}
