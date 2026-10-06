// Pure hulpjes voor de weergave van de publieke site (kop, voettekst, homepage).
// Geen database en geen React, zodat ze te testen zijn.

import type { MenuItem } from "../paginas/beheer";

/** Een stuk kop: gewone tekst of het (cursieve, gekleurde) accentwoord. */
export interface KopDeel {
  tekst: string;
  accent: boolean;
}

/**
 * Splitst een kop op *sterretjes*: "die *echt* bij jou" → gewoon, accent, gewoon.
 * Een los sterretje zonder partner blijft gewone tekst.
 */
export function splitsAccent(tekst: string): KopDeel[] {
  const uit: KopDeel[] = [];
  const patroon = /\*([^*\n]+)\*/g;
  let vanaf = 0;
  for (const m of tekst.matchAll(patroon)) {
    const i = m.index ?? 0;
    if (i > vanaf) uit.push({ tekst: tekst.slice(vanaf, i), accent: false });
    uit.push({ tekst: m[1], accent: true });
    vanaf = i + m[0].length;
  }
  if (vanaf < tekst.length) uit.push({ tekst: tekst.slice(vanaf), accent: false });
  return uit;
}

/** De kop zonder sterretjes (voor alt-teksten, titels en tests). */
export function zonderAccent(tekst: string): string {
  return splitsAccent(tekst)
    .map((d) => d.tekst)
    .join("");
}

/**
 * Kort een review in tot ongeveer `max` woorden (handboek: ca. 35). Eindigt er
 * na minstens 60% van de woorden een zin, dan stopt het citaat daar netjes;
 * anders na `max` woorden met "…". Witruimte wordt één spatie.
 */
export function kortCitaat(tekst: string, max = 35): string {
  const woorden = tekst.trim().split(/\s+/).filter(Boolean);
  if (woorden.length <= max) return woorden.join(" ");
  const deel = woorden.slice(0, max);
  for (let n = deel.length - 1; n >= Math.ceil(max * 0.6) - 1; n--) {
    if (/[.!?…]["”’)]?$/.test(deel[n])) return deel.slice(0, n + 1).join(" ");
  }
  return `${deel.join(" ").replace(/[\s,;:–—-]+$/, "")}…`;
}

/** Alleen de voornaam: "Anna de Vries, Utrecht" → "Anna". */
export function voornaam(naam: string): string {
  return naam.trim().split(/[\s,]+/)[0] ?? "";
}

/** Citaat tussen typografische aanhalingstekens (tenzij die er al omheen staan). */
export function metAanhalingstekens(tekst: string): string {
  const t = tekst.trim();
  if (/^["“„'‘]/.test(t)) return t;
  return `“${t}”`;
}

export const KAART_KLEUREN = ["coral", "sage", "butter"] as const;
export type KaartKleur = (typeof KAART_KLEUREN)[number];

const KLEUR_NAMEN: Readonly<Record<string, KaartKleur>> = {
  coral: "coral",
  koraal: "coral",
  sage: "sage",
  salie: "sage",
  groen: "sage",
  butter: "butter",
  boter: "butter",
  geel: "butter",
};

/** De accentkleur van een kaart: ingevulde naam, anders op volgorde (koraal, salie, boter). */
export function kaartKleur(waarde: string | null | undefined, index: number): KaartKleur {
  const k = KLEUR_NAMEN[(waarde ?? "").trim().toLowerCase()];
  return k ?? KAART_KLEUREN[((index % KAART_KLEUREN.length) + KAART_KLEUREN.length) % KAART_KLEUREN.length];
}

/**
 * Een link uit een beheerbare tekst: een pad op de site ("/blog"), een anker
 * ("#advies"), https of mailto/tel. Al het andere (bijv. javascript:) wordt de
 * reserve. Leeg = de reserve.
 */
export function veiligeLink(waarde: string | null | undefined, reserve: string): string {
  const w = (waarde ?? "").trim();
  if (!w) return reserve;
  if (/^\/(?!\/)/.test(w) || /^#[\w-]*$/.test(w)) return w;
  if (/^(mailto|tel):/i.test(w)) return w;
  try {
    const u = new URL(w);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : reserve;
  } catch {
    return reserve;
  }
}

/**
 * Het pad van een link naar een beheerbare pagina ("/over-mij" → "over-mij"),
 * of null voor andere links (met een tweede segment, anker, zoekdeel of extern).
 */
export function paginaSlugVan(link: string): string | null {
  const m = /^\/([a-z0-9]+(?:-[a-z0-9]+)*)$/.exec(link.trim());
  return m ? m[1] : null;
}

/**
 * Het hoofdmenu: de pagina's met "in menu" (plus de blog, zoals altijd), of
 * anders het standaardmenu uit de teksten. Lege en dubbele links vallen weg.
 */
export function kiesMenu(paginas: readonly MenuItem[], standaard: readonly { label: string; link: string }[]): MenuItem[] {
  const bron: MenuItem[] = paginas.length
    ? [...paginas, { href: "/blog", label: "Blog" }]
    : standaard.map((i) => ({ href: veiligeLink(i.link, ""), label: i.label.trim() }));
  const gezien = new Set<string>();
  return bron.filter((i) => {
    if (!i.href || !i.label || gezien.has(i.href)) return false;
    gezien.add(i.href);
    return true;
  });
}

/** Maximaal aantal klantreacties op de homepage (één rij van drie). */
export const MAX_ERVARINGEN = 3;

/**
 * De klantreacties op de homepage: goedgekeurde reviews (nieuwste eerst) en
 * daarna de handmatige ervaringen; hooguit `max`, ingekort tot ca. 35 woorden,
 * tussen aanhalingstekens en met alleen de voornaam. Lege citaten vallen weg.
 */
export function ervaringItems(
  reviews: readonly { id: string; tekst: string; naam: string }[],
  ervaringen: readonly { _id: string; citaat: string; naam: string }[],
  max = MAX_ERVARINGEN,
): { key: string; citaat: string; naam: string }[] {
  return [
    ...reviews.map((r) => ({ key: `r-${r.id}`, citaat: r.tekst, naam: r.naam })),
    ...ervaringen.map((e) => ({ key: e._id, citaat: e.citaat, naam: e.naam })),
  ]
    .filter((i) => i.citaat.trim())
    .slice(0, max)
    .map((i) => ({ key: i.key, citaat: metAanhalingstekens(kortCitaat(i.citaat)), naam: voornaam(i.naam) }));
}

/** Voegt lijsten met links samen zonder dubbele adressen (de eerste wint). */
export function zonderDubbele(...lijsten: readonly (readonly MenuItem[])[]): MenuItem[] {
  const gezien = new Set<string>();
  return lijsten.flat().filter((i) => {
    if (gezien.has(i.href)) return false;
    gezien.add(i.href);
    return true;
  });
}

/**
 * De dienstenkaarten zonder doodlopende link naar /afspraak: is er niets te
 * boeken, dan krijgt een kaart met de link /afspraak de vervangende linktekst en
 * link (bijv. "Stel je vraag" → /contact), of geen link als er geen vervanging
 * is. Met iets te boeken blijven de kaarten zoals ze zijn.
 */
export function zonderDoodlopendeAfspraak<K extends { link: string; linkTekst: string }>(
  kaarten: readonly K[],
  boekbaar: boolean,
  vervanging: { tekst: string; link: string } | null,
): K[] {
  if (boekbaar) return [...kaarten];
  const tekst = vervanging?.tekst.trim() && vervanging.link.trim() ? vervanging.tekst : "";
  return kaarten.map((k) =>
    veiligeLink(k.link, "") === "/afspraak" ? { ...k, linkTekst: tekst, link: tekst ? vervanging!.link : "" } : k,
  );
}
