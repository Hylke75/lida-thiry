// RSS 2.0-feed van de blog. Puur: krijgt kant-en-klare items en geeft XML terug.

interface RssItem {
  titel: string;
  /** Absolute URL van het bericht (ook gebruikt als guid). */
  url: string;
  /** ISO-datum van publicatie. */
  datum: string;
  omschrijving: string;
  categorieen: readonly string[];
  auteur?: string;
}

export interface RssKanaal {
  titel: string;
  /** Absolute URL van het blogoverzicht. */
  link: string;
  /** Absolute URL van de feed zelf (atom:link rel="self"). */
  feedUrl: string;
  omschrijving: string;
  taal?: string;
  items: readonly RssItem[];
}

/** Ontsnapt tekst voor XML en haalt tekens weg die in XML 1.0 niet mogen. */
export function xmlTekst(s: string): string {
  return s
    // Stuurtekens (behalve tab en regeleinden) zijn ongeldig in XML 1.0.
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Datum in RFC 822-vorm, zoals RSS 2.0 vraagt ("Sun, 04 Oct 2026 18:00:00 GMT"). */
export function rfc822(iso: string | Date): string {
  const d = iso instanceof Date ? iso : new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toUTCString();
}

export function bouwRss(k: RssKanaal): string {
  const items = k.items.map((i) => {
    const regels = [
      `<title>${xmlTekst(i.titel)}</title>`,
      `<link>${xmlTekst(i.url)}</link>`,
      `<guid isPermaLink="true">${xmlTekst(i.url)}</guid>`,
      `<pubDate>${rfc822(i.datum)}</pubDate>`,
      `<description>${xmlTekst(i.omschrijving)}</description>`,
      ...(i.auteur ? [`<dc:creator>${xmlTekst(i.auteur)}</dc:creator>`] : []),
      ...i.categorieen.filter((c) => c.trim()).map((c) => `<category>${xmlTekst(c)}</category>`),
    ];
    return `    <item>\n${regels.map((r) => `      ${r}`).join("\n")}\n    </item>`;
  });
  const laatste = k.items.reduce<string | null>((max, i) => (!max || i.datum > max ? i.datum : max), null);
  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">`,
    `  <channel>`,
    `    <title>${xmlTekst(k.titel)}</title>`,
    `    <link>${xmlTekst(k.link)}</link>`,
    `    <description>${xmlTekst(k.omschrijving)}</description>`,
    `    <language>${xmlTekst(k.taal ?? "nl-NL")}</language>`,
    `    <atom:link href="${xmlTekst(k.feedUrl)}" rel="self" type="application/rss+xml" />`,
    ...(laatste ? [`    <lastBuildDate>${rfc822(laatste)}</lastBuildDate>`] : []),
    ...items,
    `  </channel>`,
    `</rss>`,
    ``,
  ].join("\n");
}
