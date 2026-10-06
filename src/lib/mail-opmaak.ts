// Bouwstenen voor e-mail-HTML in de huisstijl (docs/ontwerp/HUISSTIJL-HANDBOEK.md):
// het kader met woordmerk en kleurstrook, de knoppen en de lettertypen. Mailveilig:
// tabellen voor de opbouw, alle opmaak inline, webveilige reservelettertypen
// (DM Serif Display → Georgia, Manrope → Arial/Helvetica) en geen afbeeldingen.
// Puur, zodat de mails te testen zijn zonder database of Resend.

import { escapeHtml } from "./inhoud/opmaak";
import { KLEUR, MERK_STANDAARD, STROOK, type Merk } from "./huisstijl";

export { KLEUR, MERK_STANDAARD, type Merk } from "./huisstijl";

/** Lopende tekst: Manrope waar beschikbaar (Apple Mail, iOS), anders Arial/Helvetica. */
export const LETTER = "Manrope,Arial,Helvetica,sans-serif";
/** Koppen: DM Serif Display waar beschikbaar, anders Georgia. */
export const LETTER_SERIF = "'DM Serif Display',Georgia,'Times New Roman',serif";

/** Kleine letters (reservelink, herroeping, factuurregel). */
export const KLEIN = `font-size:13px;color:${KLEUR.inkZacht}`;

/** De kop bovenaan een mail (DM Serif Display, of Georgia). */
export function kopHtml(tekst: string): string {
  return `<h1 style="margin:0 0 18px;font-family:${LETTER_SERIF};font-size:30px;line-height:1.15;font-weight:400;color:${KLEUR.ink}">${escapeHtml(tekst)}</h1>`;
}

/** Een tussenkop (bijv. in de mail met links naar Mijn advies). */
export function subkopHtml(tekst: string): string {
  return `<h2 style="margin:28px 0 8px;font-family:${LETTER_SERIF};font-size:21px;line-height:1.2;font-weight:400;color:${KLEUR.ink}">${escapeHtml(tekst)}</h2>`;
}

export type KnopSoort = "primair" | "secundair" | "donker";

/**
 * Een ‘bulletproof’ knop: een tabelcel met achtergrondkleur (werkt ook in Outlook,
 * daar met rechte hoeken) met daarin de link als pil. Primair = berry (de
 * actiekleur), secundair = berry rand, donker = aubergine (voor beheermails).
 */
export function knopHtml(url: string, tekst: string, soort: KnopSoort = "primair", marge = "28px 0"): string {
  const vol = soort !== "secundair";
  const achtergrond = soort === "donker" ? KLEUR.ink : KLEUR.berry;
  const cel = vol
    ? `bgcolor="${achtergrond}" style="border-radius:9999px;background:${achtergrond}"`
    : `style="border-radius:9999px;border:2px solid ${KLEUR.berry}"`;
  const kleur = vol ? KLEUR.wit : KLEUR.berry;
  const padding = vol ? "15px 30px" : "13px 28px";
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:${marge};border-collapse:separate"><tr><td align="center" ${cel}><a href="${escapeHtml(url)}" style="display:inline-block;padding:${padding};font-family:${LETTER};font-size:15px;font-weight:700;line-height:1.2;color:${kleur};text-decoration:none;border-radius:9999px">${escapeHtml(tekst)}</a></td></tr></table>`;
}

/** Het woordmerk als tekst: de naam vet in kapitalen, de subregel klein en ruim gespatieerd. */
export function woordmerkHtml(merk: Merk): string {
  const naam = escapeHtml(merk.naam.toLocaleUpperCase("nl"));
  const sub = merk.subregel.trim()
    ? `<div style="padding-top:6px;font-family:${LETTER};font-size:9px;font-weight:700;line-height:1;letter-spacing:2px;text-transform:uppercase;color:${KLEUR.inkZacht}">${escapeHtml(merk.subregel.toLocaleUpperCase("nl"))}</div>`
    : "";
  return `<div style="font-family:${LETTER};font-size:18px;font-weight:700;line-height:1;letter-spacing:1px;text-transform:uppercase;color:${KLEUR.ink}">${naam}</div>${sub}`;
}

/** De kleurstrook: vijf even brede banen (coral, butter, sage, sky, lilac). */
export function strookHtml(hoogte = 6): string {
  const cellen = STROOK.map(
    (k) => `<td width="20%" height="${hoogte}" bgcolor="${k}" style="height:${hoogte}px;line-height:${hoogte}px;font-size:0;background:${k}">&nbsp;</td>`,
  ).join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;table-layout:fixed"><tr>${cellen}</tr></table>`;
}

export interface DocumentOpties {
  /** De inhoud van de kaart (HTML). */
  inhoud: string;
  /** HTML onder de kaart (voettekst, afmeldlink, adres). */
  onder: string;
  merk?: Merk;
  /** <title> van het document (bijv. het onderwerp). */
  titel?: string;
  /** Verborgen voorvertoningstekst (direct na <body>, al als HTML). */
  preheader?: string;
  /** Extra HTML vlak voor </body> (bijv. de meetpixel). */
  naBody?: string;
}

/**
 * Het volledige mailbericht: crème achtergrond, het woordmerk, de kleurstrook en
 * een lichte kaart met de inhoud, met daaronder de voettekst.
 */
export function mailDocument(o: DocumentOpties): string {
  const merk = o.merk ?? MERK_STANDAARD;
  return `<!doctype html>
<html lang="nl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light">${o.titel ? `<title>${escapeHtml(o.titel)}</title>` : ""}
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=DM+Serif+Display&amp;family=Manrope:wght@400;600;700&amp;display=swap">
<style>p{margin:0 0 16px}ul{margin:0 0 16px}a{color:${KLEUR.berry}}@media (max-width:620px){.lt-kaart{padding:28px 22px !important}}</style></head>
<body style="margin:0;padding:0;background:${KLEUR.cream}">
${o.preheader ?? ""}<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="${KLEUR.cream}" style="background:${KLEUR.cream}"><tr><td align="center" style="padding:28px 12px 36px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px">
<tr><td style="padding:0 6px 20px">${woordmerkHtml(merk)}</td></tr>
<tr><td>${strookHtml()}</td></tr>
<tr><td class="lt-kaart" bgcolor="${KLEUR.paper}" style="padding:36px 40px;background:${KLEUR.paper};border:1px solid ${KLEUR.lijn};border-top:0;border-radius:0 0 20px 20px;font-family:${LETTER};font-size:15px;line-height:1.65;color:${KLEUR.ink}">${o.inhoud}</td></tr>
<tr><td style="padding:22px 6px 0;font-family:${LETTER};font-size:12px;line-height:1.6;color:${KLEUR.inkZacht}">${o.onder}</td></tr>
</table>
</td></tr></table>
${o.naBody ?? ""}</body></html>`;
}
