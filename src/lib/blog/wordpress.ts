// Pure omzetting van WordPress-berichten (de REST-API van de oude site
// www.lidathiry.nl) naar blogberichten in de opmaak van src/lib/inhoud/opmaak.ts.
// Zonder imports, zodat de importfunctie (supabase/functions/blog-import, Deno)
// dit bestand ongewijzigd kan gebruiken en het in Vitest te testen is.

/** Wat er met een link gebeurt: een (nieuw) adres, null = alleen de tekst houden, false = link mét inhoud weglaten. */
export type LinkKeuze = string | null | false;

export interface OmzetOpties {
  /** Nieuw https-adres voor een afbeelding, of null om haar weg te laten. */
  afbeelding: (src: string) => string | null;
  /** Wat er met een link moet gebeuren (zie LinkKeuze). */
  link: (href: string) => LinkKeuze;
}

const ENTITEITEN: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ", hellip: "…", ndash: "–", mdash: "—",
  lsquo: "‘", rsquo: "’", ldquo: "“", rdquo: "”", laquo: "«", raquo: "»", euro: "€", eacute: "é",
  egrave: "è", euml: "ë", ecirc: "ê", aacute: "á", agrave: "à", auml: "ä", iuml: "ï", iacute: "í",
  ouml: "ö", oacute: "ó", uuml: "ü", uacute: "ú", ccedil: "ç", copy: "©", reg: "®", trade: "™",
  deg: "°", times: "×", middot: "·", bull: "•", shy: "",
};

/** Zet HTML-entiteiten om in tekens. */
export function decodeerEntiteiten(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return ENTITEITEN[e.toLowerCase()] ?? m;
  });
}

/** Platte tekst uit een stukje HTML (titels, samenvattingen). */
export function htmlNaarTekst(html: string): string {
  return decodeerEntiteiten(
    html
      .replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " "),
  )
    .replace(/\s+/g, " ")
    .trim();
}

/** Samenvatting uit de WordPress-excerpt: zonder "[…]" of "Lees verder", hooguit 500 tekens. */
export function samenvattingUitExcerpt(html: string): string {
  const t = htmlNaarTekst(html)
    .replace(/\s*\[(…|\.\.\.)\]\s*$/, "…")
    .replace(/\s*(lees verder|read more)\s*(»|›|→)?\s*$/i, "")
    .trim();
  return t.length > 500 ? `${t.slice(0, 499).replace(/\s+\S*$/, "")}…` : t;
}

function attribuut(attrs: string, naam: string): string | null {
  const m = new RegExp(`(?:^|\\s)${naam}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`, "i").exec(attrs);
  return m ? decodeerEntiteiten(m[1] ?? m[2] ?? m[3] ?? "").trim() : null;
}

/** Alle afbeeldingsadressen (src) in de HTML, in volgorde van voorkomen. */
export function verzamelAfbeeldingen(html: string): string[] {
  const uit: string[] = [];
  for (const m of html.matchAll(/<img\b([^>]*)>/gi)) {
    const src = attribuut(m[1], "src");
    if (src && !uit.includes(src)) uit.push(src);
  }
  return uit;
}

/** Tekst veilig voor de opmaak: geen {variabelen} en geen losse opmaaktekens. */
function veiligeTekst(s: string): string {
  return s.replace(/[{}]/g, (c) => (c === "{" ? "(" : ")")).replace(/\*\*/g, "*");
}

/** Linktekst of alt-tekst: geen haken of regeleinden. */
function labelTekst(s: string): string {
  return s.replace(/\[/g, "(").replace(/\]/g, ")").replace(/\s+/g, " ").trim();
}

/** Adres voor in de opmaak: zonder spaties en haakjes (die zouden de link breken). */
function opmaakUrl(url: string): string {
  return url.trim().replace(/ /g, "%20").replace(/\(/g, "%28").replace(/\)/g, "%29");
}

const BLOK = new Set(["p", "pre", "div", "figure", "figcaption", "blockquote", "table", "tr", "td", "th", "section", "article", "address", "center"]);
const NEGEER_INHOUD = new Set(["script", "style", "noscript", "form", "button", "select", "textarea", "svg"]);

/**
 * Zet de HTML van een WordPress-bericht om in de opmaak van de nieuwe site:
 * koppen (h1–h3 → ##, h4–h6 → ###), lijsten, **vet**, links, afbeeldingen op een
 * eigen regel en alinea's. Cursief, kleuren en uitlijning vervallen (de opmaak
 * kent ze niet); YouTube-video's worden een link.
 */
export function htmlNaarOpmaak(html: string, opties: OmzetOpties): string {
  const blokken: string[] = [];
  let regel = ""; // de alinea (of het lijstitem / de kop) die wordt opgebouwd
  let voorvoegsel = ""; // "## ", "### " of "- " voor de huidige regel
  let vetDiepte = 0;
  let vetOpen = false; // of de ** al in `regel` staat
  let link: { start: number; url: LinkKeuze; geldig: boolean } | null = null;
  let wegDiepte = 0; // > 0: binnen een link die met inhoud vervalt
  let negeerTot: string | null = null;
  const lijsten: { soort: "ul" | "ol"; teller: number }[] = [];

  const sluitVet = () => {
    if (!vetOpen) return;
    const rest = regel.match(/\s*$/)?.[0] ?? "";
    regel = regel.slice(0, regel.length - rest.length);
    if (regel.endsWith("**")) regel = regel.slice(0, -2); // lege **
    else regel += "**";
    regel += rest;
    vetOpen = false;
  };

  const spoel = () => {
    sluitVet();
    if (link) link.geldig = false;
    const tekst = regel.replace(/[ \t]+/g, " ").replace(/ ?\n ?/g, "\n").replace(/^\n+|\n+$/g, "").trim();
    if (tekst) {
      if (voorvoegsel) blokken.push(voorvoegsel + tekst.replace(/\n/g, " "));
      else blokken.push(tekst);
    }
    regel = "";
    voorvoegsel = "";
  };

  const schrijf = (tekst: string) => {
    if (wegDiepte > 0 || !tekst) return;
    if (vetDiepte > 0 && !vetOpen) {
      if (!tekst.trim()) {
        regel += tekst;
        return;
      }
      const voor = tekst.match(/^\s*/)?.[0] ?? "";
      regel += `${voor}**`;
      vetOpen = true;
      tekst = tekst.slice(voor.length);
    }
    regel += tekst;
  };

  const blok = (b: string) => {
    spoel();
    blokken.push(b);
  };

  for (const m of html.matchAll(/<!--[\s\S]*?-->|<(\/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*)>|[^<]+|</g)) {
    const [geheel, sluit, ruweNaam, attrs = ""] = m;
    const naam = ruweNaam?.toLowerCase();

    if (negeerTot) {
      if (sluit && naam === negeerTot) negeerTot = null;
      continue;
    }
    if (geheel.startsWith("<!--")) continue;

    if (!naam) {
      const tekst = veiligeTekst(decodeerEntiteiten(geheel === "<" ? "<" : geheel)).replace(/\s+/g, " ");
      schrijf(tekst);
      continue;
    }

    if (!sluit && NEGEER_INHOUD.has(naam)) {
      if (!/\/\s*$/.test(attrs)) negeerTot = naam;
      continue;
    }

    if (naam === "a") {
      if (!sluit) {
        if (wegDiepte > 0) {
          wegDiepte++;
          continue;
        }
        const href = attribuut(attrs, "href");
        const keuze = href ? opties.link(href) : null;
        if (keuze === false) {
          wegDiepte = 1;
          continue;
        }
        link = { start: regel.length, url: keuze, geldig: true };
      } else {
        if (wegDiepte > 0) {
          wegDiepte--;
          continue;
        }
        if (link && link.geldig && typeof link.url === "string" && !vetOpenBinnen(regel, link.start)) {
          const binnen = regel.slice(link.start);
          const label = labelTekst(binnen);
          if (label) {
            const voor = binnen.match(/^\s*/)?.[0] ?? "";
            const na = binnen.match(/\s*$/)?.[0] ?? "";
            regel = `${regel.slice(0, link.start)}${voor}[${label}](${opmaakUrl(link.url)})${na}`;
          }
        }
        link = null;
      }
      continue;
    }
    if (wegDiepte > 0) continue;

    switch (naam) {
      case "strong":
      case "b":
        if (!sluit) vetDiepte++;
        else if (vetDiepte > 0 && --vetDiepte === 0) sluitVet();
        break;
      case "br":
        if (voorvoegsel) schrijf(" ");
        else {
          sluitVet();
          regel += "\n";
        }
        break;
      case "h1":
      case "h2":
      case "h3":
      case "h4":
      case "h5":
      case "h6":
        spoel();
        if (!sluit) voorvoegsel = Number(naam[1]) <= 3 ? "## " : "### ";
        break;
      case "ul":
      case "ol":
        spoel();
        if (!sluit) lijsten.push({ soort: naam, teller: 0 });
        else lijsten.pop();
        break;
      case "li":
        spoel();
        if (!sluit) {
          const l = lijsten[lijsten.length - 1];
          voorvoegsel = "- ";
          if (l?.soort === "ol") regel = `${++l.teller}. `;
        }
        break;
      case "hr":
        spoel();
        break;
      case "img": {
        const src = attribuut(attrs, "src");
        const url = src ? opties.afbeelding(src) : null;
        if (url && /^https:\/\//.test(url)) {
          const alt = labelTekst(veiligeTekst(attribuut(attrs, "alt") ?? ""));
          blok(`![${alt}](${opmaakUrl(url)})`);
        }
        break;
      }
      case "iframe": {
        const src = attribuut(attrs, "src") ?? "";
        const yt = /youtube(?:-nocookie)?\.com\/embed\/([\w-]{6,})/.exec(src);
        const vimeo = /player\.vimeo\.com\/video\/(\d+)/.exec(src);
        const titel = labelTekst(veiligeTekst(attribuut(attrs, "title") ?? ""));
        const url = yt ? `https://www.youtube.com/watch?v=${yt[1]}` : vimeo ? `https://vimeo.com/${vimeo[1]}` : null;
        if (url) blok(`[${titel ? `Bekijk de video: ${titel}` : "Bekijk de video"}](${url})`);
        if (!/\/\s*$/.test(attrs)) negeerTot = "iframe";
        break;
      }
      default:
        if (BLOK.has(naam)) spoel();
    }
  }
  spoel();
  // Lijstitems direct onder elkaar (één lijst); de rest gescheiden door een lege regel.
  return blokken.reduce((uit, b, i) => {
    if (i === 0) return b;
    const lijst = b.startsWith("- ") && blokken[i - 1].startsWith("- ");
    return uit + (lijst ? "\n" : "\n\n") + b;
  }, "");
}

/** Of er sinds `start` een ** geopend en niet gesloten is (dan zou een link de vette tekst doorsnijden). */
function vetOpenBinnen(regel: string, start: number): boolean {
  return ((regel.slice(start).match(/\*\*/g) ?? []).length & 1) === 1;
}

/** Bestandsnaam zonder WordPress-formaat (-300x200) of bewerkingsachtervoegsel (-e1614443244947), kleine letters. */
export function basisBeeldnaam(url: string): string {
  const naam = (url.split(/[?#]/)[0].split("/").pop() ?? "").toLowerCase();
  return naam.replace(/(-e\d{9,})?(-\d+x\d+)?(\.[a-z0-9]+)$/, "$3");
}

/** Haalt een afbeelding aan het begin van de tekst weg als die gelijk is aan de omslag (anders staat ze er twee keer). */
export function zonderDubbeleOmslag(opmaak: string, omslagUrl: string | null, oorspronkelijk: (url: string) => string | undefined): string {
  if (!omslagUrl) return opmaak;
  const blokken = opmaak.split("\n\n");
  const omslag = basisBeeldnaam(oorspronkelijk(omslagUrl) ?? omslagUrl);
  // Alleen binnen de eerste paar blokken: verderop is het een bewuste herhaling.
  for (let i = 0; i < Math.min(blokken.length, 4); i++) {
    const m = /^!\[[^\]]*\]\((https:\/\/[^)\s]+)\)$/.exec(blokken[i]);
    if (m && basisBeeldnaam(oorspronkelijk(m[1]) ?? m[1]) === omslag) {
      blokken.splice(i, 1);
      return blokken.join("\n\n");
    }
  }
  return opmaak;
}

export interface WpTerm {
  id: number;
  name: string;
  slug: string;
  taxonomy: string;
  parent?: number;
}

/**
 * De categorie van het nieuwe bericht (de nieuwe site kent er één per bericht):
 * de meest specifieke (een subcategorie gaat voor haar hoofdcategorie), anders de
 * eerste. De overige categorieën gaan, met de WordPress-tags, naar de tags.
 */
export function kiesCategorieEnTags(
  categorieen: WpTerm[],
  tags: WpTerm[],
  ouderVan: (id: number) => number | undefined,
): { categorie: string | null; tags: string[] } {
  const ids = new Set(categorieen.map((c) => c.id));
  const kind = categorieen.find((c) => {
    const ouder = c.parent ?? ouderVan(c.id);
    return ouder !== undefined && ouder !== 0 && ids.has(ouder);
  });
  const gekozen = kind ?? categorieen.find((c) => c.slug !== "uncategorized" && c.slug !== "geen-categorie") ?? null;
  const namen = [
    ...categorieen.filter((c) => c !== gekozen && c.slug !== "uncategorized").map((c) => c.name),
    ...tags.map((t) => t.name),
  ];
  const schoon = namen
    .map((n) => htmlNaarTekst(n).toLowerCase().replace(/\s+/g, " ").trim().slice(0, 40).trim())
    .filter(Boolean);
  return {
    categorie: gekozen ? htmlNaarTekst(gekozen.name).slice(0, 60) : null,
    tags: [...new Set(schoon)].slice(0, 15),
  };
}

/** Opslagpad in de bucket voor een upload van de oude site: wp/2024/05/bestand.jpeg (veilige tekens). */
export function opslagPad(url: string): string | null {
  const m = /\/wp-content\/uploads\/(.+)$/.exec(url.split(/[?#]/)[0]);
  if (!m) return null;
  let delen: string[];
  try {
    delen = decodeURIComponent(m[1]).split("/");
  } catch {
    delen = m[1].split("/");
  }
  const schoon = delen
    .map((d) =>
      d
        .normalize("NFKD")
        .replace(/[̀-ͯ]/g, "")
        .replace(/[^A-Za-z0-9._-]+/g, "-")
        .replace(/^-+|-+$/g, ""),
    )
    .filter(Boolean);
  if (!schoon.length) return null;
  const naam = schoon[schoon.length - 1].replace(/\.([A-Za-z0-9]+)$/, (e) => e.toLowerCase());
  return ["wp", ...schoon.slice(0, -1), naam].join("/");
}

const OUDE_HOST = /^(?:www\.)?lidathiry\.nl$/i;

/** Of een adres naar de oude site wijst (met of zonder www, http of https). */
export function isOudeSite(url: string): boolean {
  try {
    return OUDE_HOST.test(new URL(url.trim()).hostname);
  } catch {
    return false;
  }
}

/** Een adres op de oude site als https://www.lidathiry.nl/… (de server zonder www stuurt daarheen). */
export function normaliseerOudeUrl(url: string): string {
  const u = new URL(url.trim());
  if (OUDE_HOST.test(u.hostname)) {
    u.protocol = "https:";
    u.hostname = "www.lidathiry.nl";
  }
  return u.toString();
}

export interface LinkContext {
  /** WordPress-bericht-id → slug, voor links als /?p=5732. */
  slugVanId: Map<number, string>;
  /** Slugs van alle geïmporteerde berichten. */
  slugs: Set<string>;
  /** Categorie-slug → naam, voor links als /categorie/kleuren-dragen/. */
  categorieen: Map<string, string>;
}

const BEELD_EXT = /\.(jpe?g|png|gif|webp|bmp)$/i;

/**
 * Bepaalt het nieuwe adres van een link in een oud bericht. Links naar een ander
 * bericht gaan naar /blog/slug, categorieën naar het gefilterde blogoverzicht,
 * aanmeldlinks van de oude Mailchimp-nieuwsbrief vervallen (de nieuwe site heeft
 * een eigen nieuwsbrief) en links naar een afbeelding (vergroting) worden gewone
 * tekst. Overige paden op de oude site worden relatief, zodat een doorverwijzing
 * in het beheer ze later kan opvangen.
 */
export function bepaalLink(href: string, ctx: LinkContext): LinkKeuze {
  const ruw = href.trim();
  if (/^mailto:/i.test(ruw)) return ruw;
  if (/list-manage\.com|mailchi\.mp|eepurl\.com/i.test(ruw)) return false;
  let u: URL;
  try {
    u = new URL(ruw, "https://www.lidathiry.nl/");
  } catch {
    return null;
  }
  if (u.protocol !== "http:" && u.protocol !== "https:") return null;
  if (!OUDE_HOST.test(u.hostname)) return u.toString();

  const pad = u.pathname.replace(/\/{2,}/g, "/");
  if (pad.startsWith("/wp-content/")) return BEELD_EXT.test(pad) ? null : normaliseerOudeUrl(u.toString());
  const p = u.searchParams.get("p");
  if (p && /^\d+$/.test(p)) {
    const slug = ctx.slugVanId.get(Number(p));
    return slug ? `/blog/${slug}` : null;
  }
  if (u.search && pad === "/") return null; // ?page_id=…, ?s=… enz.

  const delen = pad.split("/").filter(Boolean);
  if (!delen.length) return "/";
  if (delen[0] === "categorie" || delen[0] === "category") {
    const naam = ctx.categorieen.get(delen[delen.length - 1]);
    return naam ? `/blog?categorie=${encodeURIComponent(naam)}` : "/blog";
  }
  if (delen[0] === "tag" && delen[1]) return `/blog?tag=${encodeURIComponent(decodeerPad(delen[1]).replace(/-/g, " "))}`;
  if (delen[0] === "author" || delen[0] === "feed") return delen[0] === "feed" ? "/blog/rss.xml" : "/blog";
  if (delen.length === 1 && ctx.slugs.has(delen[0])) return `/blog/${delen[0]}`;
  return `/${delen.join("/")}${u.hash}`;
}

function decodeerPad(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}
