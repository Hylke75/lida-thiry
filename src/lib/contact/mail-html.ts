// De mails rond het contactformulier als pure functies (zie ook email-html.ts):
// de melding aan de beheerder, de ontvangstbevestiging aan de afzender en het
// antwoord vanuit het beheer. Het versturen staat in contact/berichten.ts.

import { escapeHtml, opmaakNaarHtml } from "../inhoud/opmaak";
import { vulIn, type SectieWaarden } from "../inhoud/schema";
import { omhulsel } from "../email-html";
import type { EMAILS_ALGEMEEN } from "../inhoud/groepen/emails";
import type { CONTACT_ANTWOORDMAIL, CONTACT_BEVESTIGMAIL } from "../inhoud/groepen/contact";
import { datumLang } from "../datum";
import { BEDRIJFSNAAM_STANDAARD } from "../site";
import { KLEIN, KLEUR, kopHtml, knopHtml, type Merk } from "../mail-opmaak";

export interface ContactMail {
  onderwerp: string;
  html: string;
  /** Platte-tekstversie (betere bezorging, en leesbaar in elke mailclient). */
  tekst: string;
}

const STIJL = { a: `color:${KLEUR.berry}`, ul: "padding-left:20px" } as const;

/** Platte tekst (zoals getypt) als HTML: ge-escaped, lege regel = alinea, regeleinde = <br>. */
export function platteTekstHtml(tekst: string, pStijl = ""): string {
  const p = pStijl ? `<p style="${pStijl}">` : "<p>";
  return tekst
    .replace(/\r\n?/g, "\n")
    .trim()
    .split(/\n\s*\n/)
    .filter((a) => a.trim())
    .map((a) => `${p}${escapeHtml(a.trim()).replace(/\n/g, "<br>")}</p>`)
    .join("\n");
}

/** Het oorspronkelijke bericht als citaat (grijze balk links). */
function citaatHtml(kop: string, bericht: string): string {
  return `<div style="margin:24px 0 0">
      <p style="${KLEIN};margin:0 0 6px">${escapeHtml(kop)}</p>
      <blockquote style="margin:0;padding:4px 0 4px 14px;border-left:3px solid ${KLEUR.lilac};color:${KLEUR.inkZacht}">${platteTekstHtml(bericht, "margin:0 0 10px")}</blockquote>
    </div>`;
}

/** "> " voor elke regel, zoals in een platte-tekstmail. */
export function citaatTekst(kop: string, bericht: string): string {
  return `${kop}\n${bericht
    .replace(/\r\n?/g, "\n")
    .trim()
    .split("\n")
    .map((r) => `> ${r}`)
    .join("\n")}`;
}

/** Opmaaktekens weg voor de platte-tekstversie: **vet** → vet, [tekst](url) → tekst (url). */
export function zonderOpmaak(tekst: string): string {
  return tekst.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\[([^\]\n]+)\]\(([^)\s]+)\)/g, "$1 ($2)");
}

export interface MeldingGegevens {
  naam: string;
  email: string;
  telefoon: string | null;
  onderwerp: string;
  bericht: string;
  pagina: string | null;
  /** Absolute link naar het bericht in het beheer. */
  link: string;
  bedrijfsnaam?: string | null;
}

/** Interne melding aan de beheerder: er is een nieuw bericht binnengekomen. */
export function contactMeldingMail(g: MeldingGegevens): ContactMail {
  const rij = (label: string, waarde: string) =>
    `<tr><td style="padding:3px 12px 3px 0;color:${KLEUR.inkZacht};vertical-align:top;white-space:nowrap">${escapeHtml(label)}</td><td style="padding:3px 0">${waarde}</td></tr>`;
  const rijen = [
    rij("Naam", escapeHtml(g.naam)),
    rij("E-mail", `<a href="mailto:${escapeHtml(g.email)}" style="color:${KLEUR.berry}">${escapeHtml(g.email)}</a>`),
    g.telefoon ? rij("Telefoon", escapeHtml(g.telefoon)) : "",
    g.onderwerp ? rij("Onderwerp", escapeHtml(g.onderwerp)) : "",
    g.pagina ? rij("Pagina", escapeHtml(g.pagina)) : "",
  ].join("");
  const onderwerp = `Nieuw bericht van ${g.naam}${g.onderwerp ? `: ${g.onderwerp}` : ""}`.slice(0, 200);
  const html = omhulsel(
    `
      ${kopHtml("Nieuw bericht via het contactformulier")}
      <table role="presentation" style="border-collapse:collapse;font-size:14px;margin:0 0 16px">${rijen}</table>
      <div style="background:${KLEUR.cream};border-radius:14px;padding:14px 18px">${platteTekstHtml(g.bericht, "margin:0 0 10px")}</div>
      ${knopHtml(g.link, "Bekijk en beantwoord", "donker", "24px 0")}
      <p style="${KLEIN}">Je kunt ook direct op deze mail antwoorden; je antwoord gaat dan naar ${escapeHtml(g.email)}. Antwoord je via het beheer, dan wordt het daar bij het bericht bewaard.</p>`,
    g.bedrijfsnaam?.trim() || BEDRIJFSNAAM_STANDAARD,
  );
  const tekst = [
    "Nieuw bericht via het contactformulier",
    "",
    `Naam: ${g.naam}`,
    `E-mail: ${g.email}`,
    g.telefoon ? `Telefoon: ${g.telefoon}` : "",
    g.onderwerp ? `Onderwerp: ${g.onderwerp}` : "",
    g.pagina ? `Pagina: ${g.pagina}` : "",
    "",
    g.bericht,
    "",
    `Bekijk en beantwoord: ${g.link}`,
  ]
    .filter((r, i, a) => r !== "" || a[i - 1] !== "")
    .join("\n");
  return { onderwerp, html, tekst };
}

/**
 * Vult de variabelen van de ontvangstbevestiging in zonder iets van de bezoeker:
 * {naam} wordt leeg ("Beste {naam}," → "Beste,") en {onderwerp} wordt "je bericht".
 */
function algemeenIngevuld(tekst: string): string {
  return vulIn(tekst, { naam: "", onderwerp: "je bericht" }).replace(/[ \t]+([,.!?])/g, "$1");
}

/**
 * Ontvangstbevestiging aan de afzender. Bevat bewust niets van wat de bezoeker
 * invulde (geen naam, onderwerp of bericht): het formulier accepteert elk
 * e-mailadres, en anders kan iemand via deze mail eigen tekst naar een ander
 * laten sturen (spamrelay).
 */
export function contactBevestigingMail(
  t: SectieWaarden<typeof CONTACT_BEVESTIGMAIL>,
  algemeen: SectieWaarden<typeof EMAILS_ALGEMEEN> & { merk?: Merk },
): ContactMail {
  const kop = algemeenIngevuld(t.kop);
  const tekstIngevuld = algemeenIngevuld(t.tekst);
  const html = omhulsel(
    `
      ${kopHtml(kop)}
      ${opmaakNaarHtml(tekstIngevuld, { stijl: STIJL })}`,
    algemeen.voettekst,
    algemeen.merk,
  );
  const tekst = `${kop}\n\n${zonderOpmaak(tekstIngevuld)}\n\n--\n${algemeen.voettekst}`;
  return { onderwerp: algemeenIngevuld(t.onderwerp), html, tekst };
}

/** Antwoord vanuit het beheer: het antwoord, het oorspronkelijke bericht als citaat en de voettekst. */
export function contactAntwoordMail(
  t: SectieWaarden<typeof CONTACT_ANTWOORDMAIL>,
  g: { antwoord: string; naam: string; onderwerp: string; bericht: string; ontvangenOp: string },
  merk?: Merk,
): ContactMail {
  const w = { naam: g.naam, onderwerp: g.onderwerp || "je bericht", datum: datumLang(g.ontvangenOp) };
  const kop = vulIn(t.citaat_kop, w);
  const html = omhulsel(
    `
      ${platteTekstHtml(g.antwoord)}
      ${citaatHtml(kop, g.bericht)}`,
    vulIn(t.voettekst, w),
    merk,
  );
  const tekst = `${g.antwoord.trim()}\n\n${citaatTekst(kop, g.bericht)}\n\n--\n${vulIn(t.voettekst, w)}`;
  return { onderwerp: vulIn(t.onderwerp, w).slice(0, 200), html, tekst };
}
