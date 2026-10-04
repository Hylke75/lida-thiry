// De HTML van de klantmails, als pure functies: teksten (uit Beheer → Teksten →
// E-mails) en gegevens erin, onderwerp en HTML eruit. Het versturen zelf staat
// in resend.ts; zo zijn de mails te testen zonder Resend of database.

import { escapeHtml, opmaakNaarHtml, type HtmlOpties } from "./inhoud/opmaak";
import { vulIn, type SectieWaarden } from "./inhoud/schema";
import type {
  EMAILS_ADVIES,
  EMAILS_ALGEMEEN,
  EMAILS_BETAALHERINNERING,
  EMAILS_BEVESTIGING,
  EMAILS_HERINNERING,
  EMAILS_MIJN_ADVIES,
} from "./inhoud/groepen/emails";
import type { NIEUWSBRIEF_BEVESTIGMAIL } from "./inhoud/groepen/nieuwsbrief";
import type { CADEAUBON_KOPERMAIL, CADEAUBON_MAIL } from "./inhoud/groepen/cadeaubon";

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

/**
 * Maakt links naar een pagina van de site (zoals "[Mijn advies](/mijn-advies)")
 * volledig, zodat ze in een e-mail werken.
 */
export function absoluteLinks(tekst: string, basisUrl: string): string {
  const basis = basisUrl.replace(/\/$/, "");
  return tekst.replace(/\]\(\/(?!\/)/g, `](${basis}/`);
}

function herkomst(url: string): string {
  try {
    return new URL(url).origin;
  } catch {
    return "";
  }
}

/** Levert het persoonlijke advies; de PDF zelf gaat als bijlage mee. */
export function adviesMail(
  t: SectieWaarden<typeof EMAILS_ADVIES>,
  algemeen: Algemeen,
  opts: { naam: string; sleutel: string; downloadUrl: string; basisUrl?: string },
): Mail {
  const w = { naam: opts.naam, type: opts.sleutel };
  const basis = opts.basisUrl ?? herkomst(opts.downloadUrl);
  const html = omhulsel(
    `
    ${kop(t.kop, w)}
    ${alineas(t.tekst, w)}
    ${knop(opts.downloadUrl, t.knop, "#1a1a1a", "24px 0")}
    ${t.na_knop?.trim() ? klein(absoluteLinks(t.na_knop, basis), w) : ""}`,
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

// Cadeaubon -----------------------------------------------------------------------------

/** De gegevens op de bon (in de mail en de PDF). */
export interface BonGegevens {
  koperNaam: string;
  ontvangerNaam: string | null;
  bedragCent: number;
  valuta: string;
  code: string;
  /** ISO-moment of yyyy-mm-dd. */
  geldigTot: string;
  boodschap: string | null;
}

export function datumLang(waarde: string): string {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(waarde) ? `${waarde}T12:00:00Z` : waarde;
  return new Date(iso).toLocaleDateString("nl-NL", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "Europe/Amsterdam",
  });
}

/** De bon als kader in de mail: bedrag, code, geldigheid en de boodschap. */
export function bonHtml(b: BonGegevens, boodschapLabel: string): string {
  const voorVan = [
    b.ontvangerNaam ? `Voor ${escapeHtml(b.ontvangerNaam)}` : "",
    b.koperNaam ? `van ${escapeHtml(b.koperNaam)}` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  const boodschap = b.boodschap?.trim()
    ? `<tr><td style="padding:0 28px 24px;text-align:left">
          <p style="margin:0 0 4px;font-size:12px;letter-spacing:1px;text-transform:uppercase;color:#a4634d">${escapeHtml(boodschapLabel)}</p>
          <p style="margin:0;font-style:italic;color:#333">“${escapeHtml(b.boodschap.trim()).replace(/\n/g, "<br>")}”</p>
        </td></tr>`
    : "";
  return `
      <table role="presentation" style="width:100%;border-collapse:separate;margin:24px 0;background:#f6efe9;border:2px dashed #a4634d;border-radius:16px">
        <tr><td style="padding:28px 28px 20px;text-align:center">
          <p style="margin:0;font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#a4634d">Cadeaubon</p>
          <p style="margin:6px 0 0;font-size:13px;color:#555">Persoonlijk kledingadvies · Lida Thiry</p>
          <p style="margin:18px 0 0;font-size:36px;font-weight:700;color:#1a1a1a">${bedrag(b.bedragCent, b.valuta)}</p>
          ${voorVan ? `<p style="margin:6px 0 0;font-size:14px;color:#555">${voorVan}</p>` : ""}
          <p style="margin:20px 0 4px;font-size:12px;color:#555">Code</p>
          <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:22px;letter-spacing:2px;font-weight:700;color:#1a1a1a">${escapeHtml(b.code)}</p>
          <p style="margin:12px 0 0;font-size:12px;color:#555">Geldig tot en met ${escapeHtml(datumLang(b.geldigTot))}</p>
        </td></tr>${boodschap}
      </table>`;
}

function bonWaarden(b: BonGegevens) {
  return {
    koper: b.koperNaam,
    ontvanger: b.ontvangerNaam?.trim() || "daar",
    bedrag: bedrag(b.bedragCent, b.valuta),
    code: b.code,
    geldig_tot: datumLang(b.geldigTot),
  };
}

/** De mail met de cadeaubon, aan de koper of direct aan de ontvanger. */
export function cadeaubonMail(
  t: SectieWaarden<typeof CADEAUBON_MAIL>,
  algemeen: Algemeen,
  opts: { aan: "koper" | "ontvanger"; bon: BonGegevens; bestelUrl: string; basisUrl: string; factuurnummer?: string | null },
): Mail {
  const w = bonWaarden(opts.bon);
  const naarKoper = opts.aan === "koper";
  const factuur = naarKoper && opts.factuurnummer
    ? `<p style="${KLEIN}">Factuurnummer ${escapeHtml(opts.factuurnummer)} — de factuur vind je als bijlage bij deze mail.</p>`
    : "";
  const html = omhulsel(
    `
      ${kop(naarKoper ? t.kopKoper : t.kopOntvanger, w)}
      ${alineas(absoluteLinks(naarKoper ? t.tekstKoper : t.tekstOntvanger, opts.basisUrl), w)}
      ${bonHtml(opts.bon, t.boodschapLabel)}
      ${alineas(absoluteLinks(t.gebruik, opts.basisUrl), w)}
      ${knop(opts.bestelUrl, t.knop, "#a4634d", "28px 0")}
      ${factuur}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(naarKoper ? t.onderwerpKoper : t.onderwerpOntvanger, w), html };
}

/** Bevestiging aan de koper als de bon (nu of later) naar de ontvanger gaat. */
export function cadeaubonKoperMail(
  t: SectieWaarden<typeof CADEAUBON_KOPERMAIL>,
  bon: SectieWaarden<typeof CADEAUBON_MAIL>,
  algemeen: Algemeen,
  opts: {
    bon: BonGegevens;
    ontvangerEmail: string;
    /** yyyy-mm-dd als de bon later wordt verstuurd, anders null. */
    verzendOp: string | null;
    basisUrl: string;
    factuurnummer?: string | null;
  },
): Mail {
  const w = {
    koper: opts.bon.koperNaam,
    ontvanger: opts.bon.ontvangerNaam?.trim() || opts.ontvangerEmail,
    ontvanger_email: opts.ontvangerEmail,
    datum: opts.verzendOp ? datumLang(opts.verzendOp) : "",
  };
  const factuur = opts.factuurnummer
    ? `<p style="${KLEIN}">Factuurnummer ${escapeHtml(opts.factuurnummer)}</p>`
    : "";
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(absoluteLinks(opts.verzendOp ? t.tekstGepland : t.tekstVerzonden, opts.basisUrl), w)}
      ${bonHtml(opts.bon, bon.boodschapLabel)}
      ${alineas(absoluteLinks(t.naBon, opts.basisUrl), w)}
      ${factuur}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

// Betaalherinnering en Mijn advies --------------------------------------------------

/** Eenmalige herinnering als een bestelling is begonnen maar niet betaald. */
export function betaalherinneringMail(
  t: SectieWaarden<typeof EMAILS_BETAALHERINNERING>,
  algemeen: Algemeen,
  opts: { naam: string; bedragCent: number; valuta: string; link: string; basisUrl: string },
): Mail {
  const w = { naam: opts.naam, bedrag: bedrag(opts.bedragCent, opts.valuta) };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(absoluteLinks(t.tekst, opts.basisUrl), w)}
      ${knop(opts.link, t.knop, "#a4634d", "28px 0")}
      ${klein(absoluteLinks(t.na_knop, opts.basisUrl), w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

export interface MijnAdviesMailLinks {
  adviezen: readonly { type: string; afgerondOp: string | null; url: string }[];
  tests: readonly { besteldOp: string; verlooptOp: string | null; url: string }[];
}

/** Mail met nieuwe links naar de adviezen en de nog niet afgeronde tests. */
export function mijnAdviesMail(
  t: SectieWaarden<typeof EMAILS_MIJN_ADVIES>,
  algemeen: Algemeen,
  opts: { naam: string | null; basisUrl: string } & MijnAdviesMailLinks,
): Mail {
  const w = { naam: opts.naam?.trim() || "klant" };
  const subkop = (tekst: string) => `<h2 style="font-size:16px;margin:28px 0 8px">${escapeHtml(tekst)}</h2>`;
  const adviezen = opts.adviezen.length
    ? `${subkop(t.adviezen_kop)}${opts.adviezen
        .map(
          (a) => `<p style="margin:0 0 4px">Type <strong>${escapeHtml(a.type)}</strong>${
            a.afgerondOp ? ` <span style="color:#555">(afgerond op ${escapeHtml(datumLang(a.afgerondOp))})</span>` : ""
          }</p>${knop(a.url, t.advies_knop, "#1a1a1a", "12px 0 20px")}`,
        )
        .join("")}`
    : "";
  const tests = opts.tests.length
    ? `${subkop(t.tests_kop)}${opts.tests
        .map(
          (x) => `<p style="margin:0 0 4px">Besteld op ${escapeHtml(datumLang(x.besteldOp))}${
            x.verlooptOp ? ` <span style="color:#555">(link geldig t/m ${escapeHtml(datumLang(x.verlooptOp))})</span>` : ""
          }</p>${knop(x.url, t.test_knop, "#a4634d", "12px 0 20px")}`,
        )
        .join("")}`
    : "";
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(absoluteLinks(t.tekst, opts.basisUrl), w)}
      ${adviezen}
      ${tests}
      ${klein(absoluteLinks(t.na, opts.basisUrl), w)}`,
    algemeen.voettekst,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}
