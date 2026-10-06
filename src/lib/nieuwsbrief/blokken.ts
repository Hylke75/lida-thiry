// Inhoud van een nieuwsbrief als lijst blokken (zoals in Mailchimp) en het omzetten
// daarvan naar e-mail-HTML en een platte-tekstversie. Puur: geen database of netwerk.

import { escapeHtml, opmaakNaarHtml, opmaakNaarTekst } from "../inhoud/opmaak";
import { vulIn } from "../inhoud/schema";
import { KLEUR as HUIS, LETTER, LETTER_SERIF, knopHtml, mailDocument, type Merk } from "../mail-opmaak";

export type Blok =
  | { id: string; soort: "kop"; tekst: string }
  | { id: string; soort: "tekst"; tekst: string }
  | { id: string; soort: "afbeelding"; url: string; alt: string; link: string }
  | { id: string; soort: "knop"; tekst: string; url: string }
  | { id: string; soort: "scheiding" }
  | { id: string; soort: "ruimte" };

export type BlokSoort = Blok["soort"];

export const BLOK_SOORTEN: { soort: BlokSoort; label: string }[] = [
  { soort: "kop", label: "Kop" },
  { soort: "tekst", label: "Tekst" },
  { soort: "afbeelding", label: "Afbeelding" },
  { soort: "knop", label: "Knop" },
  { soort: "scheiding", label: "Scheidingslijn" },
  { soort: "ruimte", label: "Witruimte" },
];

/** Persoonlijke invulwaarden die in onderwerp en blokken gebruikt kunnen worden. */
export const VARIABELEN: Record<string, string> = {
  voornaam: "voornaam van de ontvanger (of 'daar' als die onbekend is)",
  naam: "volledige naam van de ontvanger",
  email: "e-mailadres van de ontvanger",
};

export const MAX_BLOKKEN = 60;

const ID = /^[A-Za-z0-9_-]{1,40}$/;
const URL_OK = /^(https?:\/\/|mailto:)/i;

export function nieuwBlok(soort: BlokSoort): Blok {
  const id = Math.random().toString(36).slice(2, 10);
  switch (soort) {
    case "kop":
      return { id, soort, tekst: "" };
    case "tekst":
      return { id, soort, tekst: "" };
    case "afbeelding":
      return { id, soort, url: "", alt: "", link: "" };
    case "knop":
      return { id, soort, tekst: "", url: "" };
    default:
      return { id, soort };
  }
}

const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/\r\n?/g, "\n").trim().slice(0, max) : "");

/** Zet onbetrouwbare invoer om in geldige blokken; meldt wat er niet klopt. */
export function valideerBlokken(ruw: unknown): { blokken: Blok[]; fouten: string[] } {
  const fouten: string[] = [];
  if (!Array.isArray(ruw)) return { blokken: [], fouten: ["De inhoud kon niet gelezen worden."] };
  if (ruw.length > MAX_BLOKKEN) fouten.push(`Maximaal ${MAX_BLOKKEN} blokken.`);
  const blokken: Blok[] = [];
  const gezien = new Set<string>();
  ruw.slice(0, MAX_BLOKKEN).forEach((b, i) => {
    if (!b || typeof b !== "object") return;
    const o = b as Record<string, unknown>;
    let id = typeof o.id === "string" && ID.test(o.id) ? o.id : `b${i + 1}`;
    while (gezien.has(id)) id = `${id}x`;
    gezien.add(id);
    const nr = i + 1;
    switch (o.soort) {
      case "kop":
        blokken.push({ id, soort: "kop", tekst: str(o.tekst, 200) });
        break;
      case "tekst":
        blokken.push({ id, soort: "tekst", tekst: str(o.tekst, 20_000) });
        break;
      case "afbeelding": {
        const url = str(o.url, 2000);
        const link = str(o.link, 2000);
        if (url && !/^https:\/\//i.test(url)) fouten.push(`Blok ${nr}: de afbeelding moet een https-adres hebben.`);
        if (link && !URL_OK.test(link)) fouten.push(`Blok ${nr}: de link moet met https:// of mailto: beginnen.`);
        blokken.push({ id, soort: "afbeelding", url, alt: str(o.alt, 300), link });
        break;
      }
      case "knop": {
        const url = str(o.url, 2000);
        if (url && !URL_OK.test(url)) fouten.push(`Blok ${nr}: de knoplink moet met https:// of mailto: beginnen.`);
        blokken.push({ id, soort: "knop", tekst: str(o.tekst, 80), url });
        break;
      }
      case "scheiding":
      case "ruimte":
        blokken.push({ id, soort: o.soort });
        break;
      default:
        fouten.push(`Blok ${nr}: onbekende soort.`);
    }
  });
  return { blokken, fouten };
}

/** Wat er nog ontbreekt voordat een campagne verzonden kan worden. */
export function controleerVoorVerzenden(c: { onderwerp: string; blokken: Blok[] }): string[] {
  const fouten: string[] = [];
  if (!c.onderwerp.trim()) fouten.push("Vul een onderwerp in.");
  if (!c.blokken.some((b) => (b.soort === "tekst" || b.soort === "kop") && b.tekst.trim())) {
    fouten.push("Voeg minstens één kop of tekst toe.");
  }
  c.blokken.forEach((b, i) => {
    if (b.soort === "knop" && (!b.tekst.trim() || !b.url.trim())) fouten.push(`Blok ${i + 1}: de knop mist een tekst of link.`);
    if (b.soort === "afbeelding" && !b.url.trim()) fouten.push(`Blok ${i + 1}: kies een afbeelding.`);
    if (b.soort === "afbeelding" && !b.alt.trim()) fouten.push(`Blok ${i + 1}: geef de afbeelding een korte omschrijving.`);
  });
  return fouten;
}

export interface Ontvanger {
  naam: string | null;
  email: string;
}

export function ontvangerVariabelen(o: Ontvanger): Record<string, string> {
  const naam = o.naam?.trim() ?? "";
  return { voornaam: naam.split(/\s+/)[0] || "daar", naam: naam || o.email, email: o.email };
}

export interface RenderOpties {
  onderwerp: string;
  preheader: string;
  blokken: Blok[];
  ontvanger: Ontvanger;
  /** Persoonlijke afmeldlink (verplicht in elke nieuwsbrief). */
  afmeldUrl: string;
  /** Afzendergegevens onderaan (naam en adres, verplicht bij marketingmail). */
  afzender: { naam: string; adres: string | null };
  /** Woordmerk bovenaan (standaard: zoals op de website). */
  merk?: Merk;
  /** Herschrijft een link voor klikmeting; laat weg om niet te meten. */
  volgLink?: (url: string) => string;
  /** URL van de onzichtbare afbeelding voor openmeting; laat weg om niet te meten. */
  pixelUrl?: string;
}

const KLEUR = { accent: HUIS.berry, tekst: HUIS.ink, zacht: HUIS.inkZacht, lijn: HUIS.lijn };
const STIJL = {
  h2: `font-family:${LETTER_SERIF};font-size:22px;line-height:1.2;font-weight:400;margin:28px 0 8px;color:${KLEUR.tekst}`,
  h3: `font-family:${LETTER};font-size:16px;font-weight:700;margin:22px 0 6px;color:${KLEUR.tekst}`,
  p: `margin:0 0 16px;font-family:${LETTER};font-size:15px;line-height:1.65;color:${KLEUR.tekst}`,
  ul: "margin:0 0 16px;padding-left:20px",
  li: `font-family:${LETTER};font-size:15px;line-height:1.65;color:${KLEUR.tekst};margin:0 0 4px`,
  a: `color:${KLEUR.accent}`,
};

/** Vervangt links in kant-en-klare HTML door de meetlink (behalve mailto:). */
function herschrijfLinks(html: string, volg?: (url: string) => string): string {
  if (!volg) return html;
  return html.replace(/href="(https?:\/\/[^"]+)"/g, (_heel, url: string) => {
    const echt = url.replace(/&amp;/g, "&");
    return `href="${escapeHtml(volg(echt))}"`;
  });
}

function blokHtml(b: Blok, w: Record<string, string>): string {
  switch (b.soort) {
    case "kop":
      return b.tekst.trim()
        ? `<h1 style="font-family:${LETTER_SERIF};font-size:30px;line-height:1.15;font-weight:400;margin:4px 0 18px;color:${KLEUR.tekst}">${escapeHtml(vulIn(b.tekst, w))}</h1>`
        : "";
    case "tekst":
      return opmaakNaarHtml(b.tekst, { variabelen: w, stijl: STIJL });
    case "afbeelding": {
      if (!b.url) return "";
      const img = `<img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt)}" width="520" style="display:block;width:100%;max-width:520px;height:auto;border:0;border-radius:14px;margin:8px 0 18px">`;
      return b.link ? `<a href="${escapeHtml(b.link)}">${img}</a>` : img;
    }
    case "knop":
      return b.tekst && b.url ? knopHtml(b.url, vulIn(b.tekst, w), "primair", "20px 0 26px") : "";
    case "scheiding":
      return `<hr style="border:none;border-top:1px solid ${KLEUR.lijn};margin:28px 0">`;
    case "ruimte":
      return `<div style="height:24px;line-height:24px">&nbsp;</div>`;
  }
}

/** De volledige HTML van een nieuwsbrief voor één ontvanger. */
export function renderNieuwsbrief(o: RenderOpties): { onderwerp: string; html: string; tekst: string } {
  const w = ontvangerVariabelen(o.ontvanger);
  const inhoud = herschrijfLinks(o.blokken.map((b) => blokHtml(b, w)).join("\n"), o.volgLink);
  const preheader = vulIn(o.preheader, w);
  const adres = o.afzender.adres ? `<br>${escapeHtml(o.afzender.adres).replace(/\n/g, ", ")}` : "";
  const html = mailDocument({
    titel: vulIn(o.onderwerp, w),
    preheader: preheader
      ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0">${escapeHtml(preheader)}${"&#847; &zwnj; &nbsp; ".repeat(30)}</div>\n`
      : "",
    merk: o.merk,
    inhoud: `\n${inhoud}\n`,
    onder: `Je ontvangt deze mail omdat je je hebt aangemeld voor de nieuwsbrief van ${escapeHtml(o.afzender.naam)}.<br>
<a href="${escapeHtml(o.afmeldUrl)}" style="color:${KLEUR.zacht}">Afmelden</a>${adres}`,
    naBody: o.pixelUrl
      ? `<img src="${escapeHtml(o.pixelUrl)}" width="1" height="1" alt="" style="display:block;border:0;width:1px;height:1px">\n`
      : "",
  });

  const tekst = [
    ...o.blokken.map((b) => {
      switch (b.soort) {
        case "kop":
          return vulIn(b.tekst, w).toUpperCase();
        case "tekst":
          return opmaakNaarTekst(b.tekst, w);
        case "knop":
          return b.url ? `${vulIn(b.tekst, w)}: ${b.url}` : "";
        case "afbeelding":
          return b.link ? `${b.alt}: ${b.link}` : "";
        case "scheiding":
          return "—";
        default:
          return "";
      }
    }),
    "",
    `Afmelden: ${o.afmeldUrl}`,
  ]
    .filter((r, i, a) => r !== "" || a[i - 1] !== "")
    .join("\n\n");

  return { onderwerp: vulIn(o.onderwerp, w), html, tekst };
}
