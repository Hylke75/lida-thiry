// De HTML van de klantmails, als pure functies: teksten (uit Beheer → Teksten →
// E-mails) en gegevens erin, onderwerp en HTML eruit. Het versturen zelf staat
// in resend.ts; zo zijn de mails te testen zonder Resend of database.

import { escapeHtml, opmaakNaarHtml, type HtmlOpties } from "./inhoud/opmaak";
import { vulIn, type SectieWaarden } from "./inhoud/schema";
import type {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BEVESTIGING,
  EMAILS_HERINNERING,
} from "./inhoud/groepen/emails";
import type { NIEUWSBRIEF_BEVESTIGMAIL } from "./inhoud/groepen/nieuwsbrief";

export interface Mail {
  onderwerp: string;
  html: string;
}

type Waarden = Readonly<Record<string, string | number>>;
type Algemeen = SectieWaarden<typeof EMAILS_ALGEMEEN>;

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

const KLEIN = "font-size:13px;color:#555";
const STIJL: HtmlOpties["stijl"] = { a: "color:#a4634d", ul: "padding-left:20px" };

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
    ? `<p style="${KLEIN}">Factuurnummer ${escapeHtml(o.factuurnummer)} — de factuur vind je als bijlage bij deze mail.</p>`
    : "";
  return `
      <table style="width:100%;border-collapse:collapse;border-top:1px solid #e5e5e5;border-bottom:1px solid #e5e5e5;margin:20px 0;font-size:14px">${regels.join("")}</table>
      ${factuur}`;
}

/** Het kader om elke mail, met de voettekst. */
export function omhulsel(inhoud: string, voettekst: string): string {
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:560px;margin:0 auto;color:#1a1a1a;line-height:1.6">${inhoud}<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0"><p style="font-size:12px;color:#888">${escapeHtml(voettekst)}</p></div>`;
}

const kop = (tekst: string, w: Waarden) => `<h1 style="font-size:20px">${escapeHtml(vulIn(tekst, w))}</h1>`;
const alineas = (tekst: string, w: Waarden, stijl: HtmlOpties["stijl"] = STIJL) =>
  opmaakNaarHtml(tekst, { variabelen: w, stijl });
const klein = (tekst: string, w: Waarden) => alineas(tekst, w, { ...STIJL, p: KLEIN });

function knop(url: string, tekst: string, kleur: string, marge: string): string {
  return `<p style="margin:${marge}">
        <a href="${escapeHtml(url)}" style="background:${kleur};color:#fff;text-decoration:none;padding:12px 22px;border-radius:9999px;font-weight:600">${escapeHtml(tekst)}</a>
      </p>`;
}

function reserveLink(regel: string, url: string): string {
  return `<p style="${KLEIN}">${escapeHtml(regel)}<br>${escapeHtml(url)}</p>`;
}

/**
 * Bevestigingsmail na een geslaagde (of volledig met korting betaalde) bestelling:
 * "Bedankt voor je bestelling" met besteloverzicht, startknop en de testlink.
 */
export function bevestigingMail(
  t: SectieWaarden<typeof EMAILS_BEVESTIGING>,
  algemeen: Algemeen,
  opts: { naam: string; link: string; geldigDagen: number; overzicht?: BestelOverzicht },
): Mail {
  const w = { naam: opts.naam, geldig_dagen: opts.geldigDagen };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(t.tekst, w)}
      ${opts.overzicht ? overzichtHtml(opts.overzicht) : ""}
      ${knop(opts.link, t.knop, "#a4634d", "28px 0")}
      ${alineas(t.na_knop, w)}
      ${klein(t.herroeping, w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

/** Vriendelijke herinnering wanneer de test een paar dagen na betaling nog niet is gedaan. */
export function herinneringMail(
  t: SectieWaarden<typeof EMAILS_HERINNERING>,
  algemeen: Algemeen,
  opts: { naam: string; link: string; verlooptOp: string | null },
): Mail {
  const verloopdatum = opts.verlooptOp
    ? new Date(opts.verlooptOp).toLocaleDateString("nl-NL", {
        day: "numeric",
        month: "long",
        year: "numeric",
        timeZone: "Europe/Amsterdam",
      })
    : "";
  const verloopzin = verloopdatum && t.verloopzin ? ` ${vulIn(t.verloopzin, { verloopdatum })}` : "";
  const w = { naam: opts.naam, verloopdatum, verloopzin };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(t.tekst, w)}
      ${knop(opts.link, t.knop, "#a4634d", "28px 0")}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

/** Levert het persoonlijke advies; de PDF zelf gaat als bijlage mee. */
export function adviesMail(
  t: SectieWaarden<typeof EMAILS_ADVIES>,
  algemeen: Algemeen,
  opts: { naam: string; sleutel: string; downloadUrl: string },
): Mail {
  const w = { naam: opts.naam, type: opts.sleutel };
  const html = omhulsel(
    `
    ${kop(t.kop, w)}
    ${alineas(t.tekst, w)}
    ${knop(opts.downloadUrl, t.knop, "#1a1a1a", "24px 0")}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

/**
 * Bevestigingsmail voor de nieuwsbrief (dubbele opt-in): pas na een klik op de
 * knop is iemand aangemeld. Zonder naam wordt {naam} ‘daar’ (‘Hoi daar,’).
 */
export function nieuwsbriefBevestigingMail(
  t: SectieWaarden<typeof NIEUWSBRIEF_BEVESTIGMAIL>,
  algemeen: Algemeen,
  opts: { naam?: string | null; link: string },
): Mail {
  const w = { naam: opts.naam?.trim() || "daar" };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(t.tekst, w)}
      ${knop(opts.link, t.knop, "#a4634d", "28px 0")}
      ${klein(t.na_knop, w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}
