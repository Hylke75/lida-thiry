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
import type { REVIEWS_UITNODIGING } from "./inhoud/groepen/reviews";
import { formatteerBedrag } from "./prijs";
import { datumLang } from "./datum";
import {
  KLEIN,
  KLEUR,
  LETTER_SERIF,
  MERK_STANDAARD,
  kopHtml,
  knopHtml,
  mailDocument,
  subkopHtml,
  type KnopSoort,
  type Merk,
} from "./mail-opmaak";

export interface Mail {
  onderwerp: string;
  html: string;
}

type Waarden = Readonly<Record<string, string | number>>;
/** De algemene mailteksten, plus het woordmerk (zoals op de site; zie lib/merk.ts). */
type Algemeen = SectieWaarden<typeof EMAILS_ALGEMEEN> & { merk?: Merk };

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

const STIJL: HtmlOpties["stijl"] = { a: `color:${KLEUR.berry}`, ul: "padding-left:20px" };

function overzichtHtml(o: BestelOverzicht): string {
  const rij = (label: string, waarde: string, vet = false) =>
    `<tr><td style="padding:${vet ? "12px" : "6px"} 0 6px;${vet ? `font-weight:700;border-top:1px solid ${KLEUR.lijn}` : `color:${KLEUR.inkZacht}`}">${label}</td><td style="padding:${vet ? "12px" : "6px"} 0 6px;text-align:right;${vet ? `font-weight:700;border-top:1px solid ${KLEUR.lijn}` : ""}">${waarde}</td></tr>`;
  const regels = [rij("Persoonlijke kledingadviestest", formatteerBedrag(o.prijsCent, o.valuta))];
  if (o.kortingCent > 0) {
    const label = o.kortingscode ? `Korting (${escapeHtml(o.kortingscode)})` : "Korting";
    regels.push(rij(label, `− ${formatteerBedrag(o.kortingCent, o.valuta)}`));
  }
  regels.push(rij("Totaal (incl. btw)", formatteerBedrag(o.totaalCent, o.valuta), true));
  const factuur = o.factuurnummer
    ? `<p style="${KLEIN}">Factuurnummer ${escapeHtml(o.factuurnummer)} — de factuur vind je als bijlage bij deze mail.</p>`
    : "";
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:24px 0;font-size:14px;background:${KLEUR.cream};border-radius:14px"><tr><td style="padding:10px 20px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;font-size:14px;color:${KLEUR.ink}">${regels.join("")}</table></td></tr></table>
      ${factuur}`;
}

/**
 * Het kader om elke mail (huisstijl: woordmerk, kleurstrook, lichte kaart), met
 * de voettekst eronder. Zie mail-opmaak.ts.
 */
export function omhulsel(inhoud: string, voettekst: string, merk: Merk = MERK_STANDAARD): string {
  return mailDocument({
    inhoud,
    onder: `<p style="margin:0">${escapeHtml(voettekst)}</p>`,
    merk,
  });
}

const kop = (tekst: string, w: Waarden) => kopHtml(vulIn(tekst, w));
const alineas = (tekst: string, w: Waarden, stijl: HtmlOpties["stijl"] = STIJL) =>
  opmaakNaarHtml(tekst, { variabelen: w, stijl });
const klein = (tekst: string, w: Waarden) => alineas(tekst, w, { ...STIJL, p: KLEIN });

function knop(url: string, tekst: string, soort: KnopSoort, marge: string): string {
  return knopHtml(url, tekst, soort, marge);
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
      ${knop(opts.link, t.knop, "primair", "28px 0")}
      ${alineas(t.na_knop, w)}
      ${klein(t.herroeping, w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
    algemeen.merk,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

/** Vriendelijke herinnering wanneer de test een paar dagen na betaling nog niet is gedaan. */
export function herinneringMail(
  t: SectieWaarden<typeof EMAILS_HERINNERING>,
  algemeen: Algemeen,
  opts: { naam: string; link: string; verlooptOp: string | null },
): Mail {
  const verloopdatum = opts.verlooptOp ? datumLang(opts.verlooptOp) : "";
  const verloopzin = verloopdatum && t.verloopzin ? ` ${vulIn(t.verloopzin, { verloopdatum })}` : "";
  const w = { naam: opts.naam, verloopdatum, verloopzin };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(t.tekst, w)}
      ${knop(opts.link, t.knop, "primair", "28px 0")}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
    algemeen.merk,
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
    ${knop(opts.downloadUrl, t.knop, "primair", "24px 0")}
    ${t.na_knop?.trim() ? klein(absoluteLinks(t.na_knop, basis), w) : ""}`,
    algemeen.voettekst,
    algemeen.merk,
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
      ${knop(opts.link, t.knop, "primair", "28px 0")}
      ${klein(t.na_knop, w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
    algemeen.merk,
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
          <p style="margin:0 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${KLEUR.berry}">${escapeHtml(boodschapLabel)}</p>
          <p style="margin:0;font-family:${LETTER_SERIF};font-size:18px;line-height:1.4;font-style:italic;color:${KLEUR.ink}">“${escapeHtml(b.boodschap.trim()).replace(/\n/g, "<br>")}”</p>
        </td></tr>`
    : "";
  return `
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:separate;margin:24px 0;background:${KLEUR.cream};border:2px dashed ${KLEUR.berry};border-radius:20px">
        <tr><td style="padding:28px 28px 20px;text-align:center">
          <p style="margin:0;font-family:${LETTER_SERIF};font-size:30px;line-height:1.1;color:${KLEUR.ink}">Cadeaubon</p>
          <p style="margin:6px 0 0;font-size:13px;color:${KLEUR.inkZacht}">Persoonlijk kledingadvies · Lida Thiry</p>
          <p style="margin:16px 0 0;font-family:${LETTER_SERIF};font-size:40px;line-height:1.1;color:${KLEUR.berry}">${formatteerBedrag(b.bedragCent, b.valuta)}</p>
          ${voorVan ? `<p style="margin:6px 0 0;font-size:14px;color:${KLEUR.inkZacht}">${voorVan}</p>` : ""}
          <p style="margin:20px 0 6px;font-size:11px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;color:${KLEUR.berry}">Code</p>
          <p style="margin:0;font-family:Menlo,Consolas,monospace;font-size:22px;letter-spacing:2px;font-weight:700;color:${KLEUR.ink}"><span style="display:inline-block;padding:8px 18px;background:${KLEUR.wit};border-radius:12px">${escapeHtml(b.code)}</span></p>
          <p style="margin:12px 0 0;font-size:12px;color:${KLEUR.inkZacht}">Geldig tot en met ${escapeHtml(datumLang(b.geldigTot))}</p>
        </td></tr>${boodschap}
      </table>`;
}

function bonWaarden(b: BonGegevens) {
  return {
    koper: b.koperNaam,
    ontvanger: b.ontvangerNaam?.trim() || "daar",
    bedrag: formatteerBedrag(b.bedragCent, b.valuta),
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
      ${knop(opts.bestelUrl, t.knop, "primair", "28px 0")}
      ${factuur}`,
    algemeen.voettekst,
    algemeen.merk,
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
    algemeen.merk,
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
  const w = { naam: opts.naam, bedrag: formatteerBedrag(opts.bedragCent, opts.valuta) };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(absoluteLinks(t.tekst, opts.basisUrl), w)}
      ${knop(opts.link, t.knop, "primair", "28px 0")}
      ${klein(absoluteLinks(t.na_knop, opts.basisUrl), w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
    algemeen.merk,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

export interface MijnAdviesMailLinks {
  adviezen: readonly { type: string; afgerondOp: string | null; url: string; figuurUrl?: string }[];
  tests: readonly { besteldOp: string; verlooptOp: string | null; url: string }[];
}

/** Mail met nieuwe links naar de adviezen en de nog niet afgeronde tests. */
export function mijnAdviesMail(
  t: SectieWaarden<typeof EMAILS_MIJN_ADVIES>,
  algemeen: Algemeen,
  opts: { naam: string | null; basisUrl: string } & MijnAdviesMailLinks,
): Mail {
  const w = { naam: opts.naam?.trim() || "klant" };
  const subkop = subkopHtml;
  const adviezen = opts.adviezen.length
    ? `${subkop(t.adviezen_kop)}${opts.adviezen
        .map(
          (a) => `<p style="margin:0 0 4px">Type <strong>${escapeHtml(a.type)}</strong>${
            a.afgerondOp ? ` <span style="color:${KLEUR.inkZacht}">(afgerond op ${escapeHtml(datumLang(a.afgerondOp))})</span>` : ""
          }</p>${knop(a.url, t.advies_knop, "primair", a.figuurUrl && t.figuur_link.trim() ? "12px 0 8px" : "12px 0 20px")}${
            a.figuurUrl && t.figuur_link.trim()
              ? `<p style="margin:0 0 20px"><a href="${escapeHtml(a.figuurUrl)}" style="color:${KLEUR.berry};font-weight:700">${escapeHtml(t.figuur_link)} →</a></p>`
              : ""
          }`,
        )
        .join("")}`
    : "";
  const tests = opts.tests.length
    ? `${subkop(t.tests_kop)}${opts.tests
        .map(
          (x) => `<p style="margin:0 0 4px">Besteld op ${escapeHtml(datumLang(x.besteldOp))}${
            x.verlooptOp ? ` <span style="color:${KLEUR.inkZacht}">(link geldig t/m ${escapeHtml(datumLang(x.verlooptOp))})</span>` : ""
          }</p>${knop(x.url, t.test_knop, "secundair", "12px 0 20px")}`,
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
    algemeen.merk,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}

/**
 * Vraag om een review, een paar dagen na het advies. Kort en persoonlijk; {naam}
 * is de voornaam van de klant.
 */
export function reviewUitnodigingMail(
  t: SectieWaarden<typeof REVIEWS_UITNODIGING>,
  algemeen: Algemeen,
  opts: { naam: string; link: string },
): Mail {
  const w = { naam: opts.naam.trim() || "daar" };
  const html = omhulsel(
    `
      ${kop(t.kop, w)}
      ${alineas(t.tekst, w)}
      ${knop(opts.link, t.knop, "primair", "28px 0")}
      ${alineas(t.na_knop, w)}
      ${reserveLink(t.knop_werkt_niet, opts.link)}`,
    algemeen.voettekst,
    algemeen.merk,
  );
  return { onderwerp: vulIn(t.onderwerp, w), html };
}
