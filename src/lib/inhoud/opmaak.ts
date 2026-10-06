// Eenvoudige, veilige opmaak voor beheerbare teksten. Geen HTML: alleen
//   ## Kop / ### Subkop
//   - opsommingsteken
//   **vet**
//   [linktekst](https://…, mailto:… of /pad)
//   {variabele}              (ingevuld door de pagina of e-mail)
//   {blok} op een eigen regel (vervangen door een blok van de pagina, bijv. {bedrijfsgegevens})
//   ![omschrijving](https://…) op een eigen regel = afbeelding (alleen https)
// Lege regel = nieuwe alinea; een enkele regelovergang blijft een regelovergang.

export type Inline =
  | { soort: "tekst"; tekst: string }
  | { soort: "vet"; kinderen: Inline[] }
  | { soort: "link"; url: string; kinderen: Inline[] }
  | { soort: "variabele"; naam: string }
  | { soort: "regel" };

export type Blok =
  | { soort: "kop"; niveau: 2 | 3; inhoud: Inline[] }
  | { soort: "alinea"; inhoud: Inline[] }
  | { soort: "lijst"; items: Inline[][] }
  | { soort: "blok"; naam: string }
  | { soort: "afbeelding"; url: string; alt: string };

const VEILIGE_URL = /^(https?:\/\/|mailto:|\/(?!\/))/i;

/**
 * Of een link veilig is: http(s), mailto of een intern pad (één /). Backslashes,
 * tabs en regeleinden zijn nooit toegestaan: browsers lezen "/\evil.com" (en
 * "/<tab>/evil.com") als "//evil.com", een ander domein.
 */
export function veiligeUrl(url: string): boolean {
  const u = url.trim();
  return VEILIGE_URL.test(u) && !/[\\\t\n\r]/.test(u);
}

/** Zet een regel tekst om in inline-onderdelen. */
function parseerInline(tekst: string): Inline[] {
  const uit: Inline[] = [];
  let buffer = "";
  const spoel = () => {
    if (buffer) uit.push({ soort: "tekst", tekst: buffer });
    buffer = "";
  };
  let i = 0;
  while (i < tekst.length) {
    const rest = tekst.slice(i);
    if (rest[0] === "\n") {
      spoel();
      uit.push({ soort: "regel" });
      i += 1;
      continue;
    }
    if (rest.startsWith("**")) {
      const eind = rest.indexOf("**", 2);
      if (eind > 2) {
        spoel();
        uit.push({ soort: "vet", kinderen: parseerInline(rest.slice(2, eind)) });
        i += eind + 2;
        continue;
      }
    }
    if (rest[0] === "[") {
      const m = /^\[([^\]\n]+)\]\(([^)\s]+)\)/.exec(rest);
      if (m && veiligeUrl(m[2])) {
        spoel();
        uit.push({ soort: "link", url: m[2].trim(), kinderen: parseerInline(m[1]) });
        i += m[0].length;
        continue;
      }
    }
    if (rest[0] === "{") {
      const m = /^\{([a-z_]+)\}/.exec(rest);
      if (m) {
        spoel();
        uit.push({ soort: "variabele", naam: m[1] });
        i += m[0].length;
        continue;
      }
    }
    buffer += rest[0];
    i += 1;
  }
  spoel();
  return uit;
}

/** Zet een opgemaakte tekst om in blokken. */
export function parseerOpmaak(tekst: string): Blok[] {
  const blokken: Blok[] = [];
  const regels = tekst.replace(/\r\n?/g, "\n").split("\n");
  let alinea: string[] = [];
  let lijst: string[] = [];

  const sluitAlinea = () => {
    if (alinea.length) blokken.push({ soort: "alinea", inhoud: parseerInline(alinea.join("\n")) });
    alinea = [];
  };
  const sluitLijst = () => {
    if (lijst.length) blokken.push({ soort: "lijst", items: lijst.map(parseerInline) });
    lijst = [];
  };

  for (const ruweRegel of regels) {
    const regel = ruweRegel.trimEnd();
    const kop = /^(#{2,3})\s+(.+)$/.exec(regel.trim());
    const item = /^\s*[-*]\s+(.+)$/.exec(regel);
    // Bloknamen mogen cijfers bevatten (bijv. {nieuwsbrief_zomer_2026}), net als in paginas/regels.ts.
    const blok = /^\{([a-z][a-z0-9_]*)\}$/.exec(regel.trim());
    const beeld = /^!\[([^\]\n]*)\]\((https:\/\/[^)\s]+)\)$/.exec(regel.trim());
    if (!regel.trim()) {
      sluitAlinea();
      sluitLijst();
    } else if (kop) {
      sluitAlinea();
      sluitLijst();
      blokken.push({ soort: "kop", niveau: kop[1].length === 2 ? 2 : 3, inhoud: parseerInline(kop[2]) });
    } else if (item) {
      sluitAlinea();
      lijst.push(item[1]);
    } else if (beeld) {
      sluitAlinea();
      sluitLijst();
      blokken.push({ soort: "afbeelding", url: beeld[2], alt: beeld[1].trim() });
    } else if (blok) {
      sluitAlinea();
      sluitLijst();
      blokken.push({ soort: "blok", naam: blok[1] });
    } else {
      sluitLijst();
      alinea.push(regel.trim());
    }
  }
  sluitAlinea();
  sluitLijst();
  return blokken;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export interface HtmlOpties {
  /** Waarden voor {variabele}; worden ge-escaped. */
  variabelen?: Readonly<Record<string, string | number>>;
  /** Kant-en-klare HTML voor {blok}-regels (niet ge-escaped). */
  blokken?: Readonly<Record<string, string>>;
  /** Inline-stijlen per element (voor e-mail). */
  stijl?: Partial<Record<"h2" | "h3" | "p" | "ul" | "li" | "a" | "img", string>>;
}

function inlineHtml(delen: Inline[], o: HtmlOpties): string {
  const st = (el: "a") => (o.stijl?.[el] ? ` style="${o.stijl[el]}"` : "");
  return delen
    .map((d) => {
      switch (d.soort) {
        case "tekst":
          return escapeHtml(d.tekst);
        case "regel":
          return "<br>";
        case "vet":
          return `<strong>${inlineHtml(d.kinderen, o)}</strong>`;
        case "link":
          return `<a href="${escapeHtml(d.url)}"${st("a")}>${inlineHtml(d.kinderen, o)}</a>`;
        case "variabele":
          return o.variabelen && d.naam in o.variabelen
            ? escapeHtml(String(o.variabelen[d.naam]))
            : escapeHtml(`{${d.naam}}`);
      }
    })
    .join("");
}

/** Zet opgemaakte tekst om in (veilige) HTML, bijvoorbeeld voor e-mails. */
export function opmaakNaarHtml(tekst: string, o: HtmlOpties = {}): string {
  const st = (el: keyof NonNullable<HtmlOpties["stijl"]>) => (o.stijl?.[el] ? ` style="${o.stijl[el]}"` : "");
  return parseerOpmaak(tekst)
    .map((b) => {
      switch (b.soort) {
        case "kop":
          return `<h${b.niveau}${st(b.niveau === 2 ? "h2" : "h3")}>${inlineHtml(b.inhoud, o)}</h${b.niveau}>`;
        case "alinea":
          return `<p${st("p")}>${inlineHtml(b.inhoud, o)}</p>`;
        case "lijst":
          return `<ul${st("ul")}>${b.items.map((i) => `<li${st("li")}>${inlineHtml(i, o)}</li>`).join("")}</ul>`;
        case "blok":
          return o.blokken?.[b.naam] ?? "";
        case "afbeelding":
          return `<img src="${escapeHtml(b.url)}" alt="${escapeHtml(b.alt)}"${st("img")}>`;
      }
    })
    .join("\n");
}

/** Platte tekst zonder opmaaktekens (bijv. voor meta-omschrijvingen). */
export function opmaakNaarTekst(tekst: string, variabelen: Readonly<Record<string, string | number>> = {}): string {
  const plat = (delen: Inline[]): string =>
    delen
      .map((d) =>
        d.soort === "tekst"
          ? d.tekst
          : d.soort === "regel"
            ? " "
            : d.soort === "variabele"
              ? String(variabelen[d.naam] ?? `{${d.naam}}`)
              : plat(d.kinderen),
      )
      .join("");
  return parseerOpmaak(tekst)
    .map((b) =>
      b.soort === "lijst"
        ? b.items.map(plat).join(" ")
        : b.soort === "blok" || b.soort === "afbeelding"
          ? ""
          : plat(b.inhoud),
    )
    .filter(Boolean)
    .join(" ");
}
