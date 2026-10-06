// Opdrachten voor Claude bij het schrijven van blogberichten. Puur (geen netwerk),
// zodat de prompts te testen en te lezen zijn. De schrijfstijl (naam, stem, wat te
// vermijden, toegestane links) is beheerbaar: Beheer → Teksten → Blog → Schrijfstijl.

import { BLOG_SCHRIJFSTIJL } from "../inhoud/groepen/blog";
import { standaardWaarden, type SectieWaarden } from "../inhoud/schema";

/** De beheerbare schrijfstijl van de AI-schrijfhulp. */
export type Schrijfstijl = SectieWaarden<typeof BLOG_SCHRIJFSTIJL>;

/** De standaard-schrijfstijl (zoals in de code). */
export function standaardSchrijfstijl(): Schrijfstijl {
  return standaardWaarden(BLOG_SCHRIJFSTIJL);
}

/** De korte naam van de schrijver (de voornaam uit de merknaam, bijv. "Lida"). */
export function korteNaam(stijl: Schrijfstijl): string {
  return stijl.merk.trim().split(/\s+/)[0] || "Lida";
}

/** Vervangt "Lida" in de vaste omschrijvingen door de naam uit de schrijfstijl. */
const metNaam = (tekst: string, naam: string) => (naam === "Lida" ? tekst : tekst.replace(/\bLida\b/g, naam));

export const TONEN = {
  warm: "warm en persoonlijk, alsof Lida een klant aan tafel adviseert",
  inspirerend: "inspirerend en motiverend, met aandacht voor zelfvertrouwen",
  zakelijk: "helder en deskundig, zonder franje",
  speels: "luchtig en speels, met een knipoog",
} as const;
export type Toon = keyof typeof TONEN;

export const LENGTES = {
  kort: { label: "Kort (± 500 woorden)", woorden: 500 },
  middel: { label: "Gemiddeld (± 900 woorden)", woorden: 900 },
  lang: { label: "Uitgebreid (± 1400 woorden)", woorden: 1400 },
} as const;
export type Lengte = keyof typeof LENGTES;

export interface SchrijfOpdracht {
  steekwoorden: string[];
  /** Optioneel: het onderwerp of de werktitel in eigen woorden. */
  onderwerp?: string;
  toon: Toon;
  lengte: Lengte;
  /** Optioneel: voor wie het bericht vooral is, bijv. "vrouwen van 50+". */
  doelgroep?: string;
  /** Optioneel: figuurtypes waar het bericht over gaat (namen, bijv. "Zandloper"). */
  figuurtypes?: string[];
  /** Optioneel: extra wensen, bijv. "noem de najaarscollectie". */
  extra?: string;
}

const kort = (v: unknown, max: number) => (typeof v === "string" ? v.trim().slice(0, max) : "");

/** Maakt een veilige opdracht van onbetrouwbare invoer uit het beheer. */
export function normaliseerOpdracht(ruw: unknown): { ok: true; opdracht: SchrijfOpdracht } | { ok: false; fout: string } {
  const o = ruw && typeof ruw === "object" ? (ruw as Record<string, unknown>) : {};
  const bron = Array.isArray(o.steekwoorden) ? o.steekwoorden : typeof o.steekwoorden === "string" ? o.steekwoorden.split(/[,\n;]/) : [];
  const steekwoorden = [...new Set(bron.map((s) => kort(s, 60)).filter(Boolean))].slice(0, 12);
  if (!steekwoorden.length) return { ok: false, fout: "Vul minstens één steekwoord in." };
  const toon = (typeof o.toon === "string" && o.toon in TONEN ? o.toon : "warm") as Toon;
  const lengte = (typeof o.lengte === "string" && o.lengte in LENGTES ? o.lengte : "middel") as Lengte;
  const figuurtypes = Array.isArray(o.figuurtypes) ? o.figuurtypes.map((f) => kort(f, 40)).filter(Boolean).slice(0, 10) : [];
  return {
    ok: true,
    opdracht: {
      steekwoorden,
      toon,
      lengte,
      ...(kort(o.onderwerp, 200) ? { onderwerp: kort(o.onderwerp, 200) } : {}),
      ...(kort(o.doelgroep, 120) ? { doelgroep: kort(o.doelgroep, 120) } : {}),
      ...(figuurtypes.length ? { figuurtypes } : {}),
      ...(kort(o.extra, 1000) ? { extra: kort(o.extra, 1000) } : {}),
    },
  };
}

/** De toegestane interne links als leesbare opsomming: "/bestellen (de online kledingadviestest) en /blog". */
function linkOpsomming(stijl: Schrijfstijl): string {
  const links = stijl.links
    .map((l) => ({ pad: l.pad.trim(), omschrijving: l.omschrijving.trim() }))
    .filter((l) => l.pad)
    .map((l) => (l.omschrijving ? `${l.pad} (${l.omschrijving})` : l.pad));
  if (links.length <= 1) return links.join("");
  return `${links.slice(0, -1).join(", ")} en ${links[links.length - 1]}`;
}

function opmaakUitleg(stijl: Schrijfstijl): string {
  const links = linkOpsomming(stijl);
  const linkRegel = links
    ? `- [linktekst](/pad) voor een link; gebruik alleen deze interne links: ${links}`
    : "- geen links: zet geen [linktekst](/pad) in de tekst";
  return `Gebruik uitsluitend deze eenvoudige opmaak in de tekst (geen HTML, geen andere Markdown):
- "## " aan het begin van een regel voor een tussenkop, "### " voor een kleinere kop (geen # voor de hoofdtitel: die staat apart)
- "- " aan het begin van een regel voor een opsommingsteken
- **vet** voor nadruk (spaarzaam)
${linkRegel}
- een lege regel tussen alinea's
- waar een foto het verhaal versterkt, een eigen regel "[foto: korte beschrijving van de gewenste foto]"; de schrijver vervangt die later door een echte foto`;
}

/** Vaste systeemopdracht: wie de schrijver is en hoe er geschreven wordt (de schrijfstijl uit het beheer). */
export function systeemPrompt(figuurtypeNamen: string[], stijl: Schrijfstijl = standaardSchrijfstijl()): string {
  const merk = stijl.merk.trim() || "Lida Thiry";
  const over = stijl.over.trim();
  const delen = [
    `Je schrijft blogberichten voor de website van ${merk}${over ? `, ${over}` : "."}`,
    `Figuurtypes die ${korteNaam(stijl)} gebruikt: ${figuurtypeNamen.length ? figuurtypeNamen.join(", ") : "Zandloper, Peer/driehoek, Omgekeerde driehoek, Rechthoek, De 8"}. Gebruik deze namen als je naar figuurtypes verwijst.`,
    stijl.stem.trim(),
    stijl.vermijden.trim(),
    stijl.afsluiting.trim(),
    opmaakUitleg(stijl),
  ];
  return delen.filter(Boolean).join("\n\n");
}

/** De vraag voor één nieuw bericht. */
export function schrijfVraag(o: SchrijfOpdracht, naam = "Lida"): string {
  const regels = [
    `Schrijf een blogbericht van ongeveer ${LENGTES[o.lengte].woorden} woorden.`,
    `Steekwoorden: ${o.steekwoorden.join(", ")}.`,
    o.onderwerp ? `Onderwerp / werktitel: ${o.onderwerp}` : "",
    `Toon: ${metNaam(TONEN[o.toon], naam)}.`,
    o.doelgroep ? `Doelgroep: ${o.doelgroep}.` : "",
    o.figuurtypes?.length ? `Ga in het bijzonder in op deze figuurtypes: ${o.figuurtypes.join(", ")}.` : "",
    o.extra ? `Extra wensen van ${naam} (volg ze, tenzij ze ingaan tegen de regels hierboven):\n${o.extra}` : "",
    "",
    "Lever ook: een pakkende titel (max. 70 tekens), een samenvatting van 1–2 zinnen voor het blogoverzicht, 3–6 tags (kleine letters), een SEO-titel (max. 60 tekens), een SEO-omschrijving (max. 155 tekens), een korte slug (kleine letters en streepjes) en een beschrijving van een passende omslagfoto.",
  ];
  return regels.filter((r, i) => r !== "" || i > 0).join("\n");
}

/** JSON-schema voor het antwoord (structured output). */
export const SCHRIJF_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titel", "slug", "samenvatting", "inhoud", "tags", "seo_titel", "seo_omschrijving", "omslag_suggestie"],
  properties: {
    titel: { type: "string" },
    slug: { type: "string" },
    samenvatting: { type: "string" },
    inhoud: { type: "string", description: "De volledige tekst in de toegestane opmaak, zonder de titel." },
    tags: { type: "array", items: { type: "string" } },
    seo_titel: { type: "string" },
    seo_omschrijving: { type: "string" },
    omslag_suggestie: { type: "string", description: "Beschrijving van een passende omslagfoto." },
  },
} as const;

export const BEWERKINGEN = {
  verbeter: "Verbeter de tekst: vloeiender, duidelijker en zonder taalfouten. Houd de inhoud, lengte en toon gelijk.",
  korter: "Maak de tekst ongeveer een derde korter. Behoud de kern en de tussenkoppen waar mogelijk.",
  langer: "Werk de tekst verder uit met meer concrete, praktische tips (ongeveer de helft langer). Verzin geen feiten.",
  eenvoudiger: "Herschrijf de tekst in eenvoudiger Nederlands (B1-niveau), met korte zinnen.",
  persoonlijker: "Maak de tekst persoonlijker en warmer, alsof Lida de lezer direct aanspreekt.",
} as const;
export type Bewerking = keyof typeof BEWERKINGEN;

export function bewerkVraag(bewerking: Bewerking, tekst: string, naam = "Lida"): string {
  return `${metNaam(BEWERKINGEN[bewerking], naam)}

Geef alleen de nieuwe tekst terug, in dezelfde opmaak. Laat regels als "[foto: …]" en "![…](…)" staan.

<tekst>
${tekst}
</tekst>`;
}

export const SUGGESTIE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["titels", "samenvatting", "seo_titel", "seo_omschrijving", "tags"],
  properties: {
    titels: { type: "array", items: { type: "string" } },
    samenvatting: { type: "string" },
    seo_titel: { type: "string" },
    seo_omschrijving: { type: "string" },
    tags: { type: "array", items: { type: "string" } },
  },
} as const;

export function suggestieVraag(titel: string, inhoud: string): string {
  return `Hieronder staat een blogbericht. Stel voor: 5 alternatieve titels (max. 70 tekens), een samenvatting van 1–2 zinnen, een SEO-titel (max. 60 tekens), een SEO-omschrijving (max. 155 tekens) en 3–6 tags (kleine letters).

<titel>${titel}</titel>
<tekst>
${inhoud}
</tekst>`;
}

/**
 * Prijzen in dollar per miljoen tokens (invoer, uitvoer). Bij een weigering kan de
 * API het verzoek op een ander model afmaken (server-side fallback); dan telt de
 * prijs van dát model. Onbekend model: de prijs van Claude Opus 5.5.
 */
const PRIJZEN: Record<string, readonly [number, number]> = {
  "claude-opus-5-5": [4, 20],
  "claude-opus-5": [5, 25],
  "claude-opus-4-8": [5, 25],
  "claude-opus-4-7": [5, 25],
  "claude-opus-4-6": [5, 25],
  "claude-fable-5-1": [10, 50],
  "claude-fable-5": [10, 50],
  "claude-sonnet-5-5": [2, 10],
  "claude-sonnet-5": [2, 10],
  "claude-sonnet-4-6": [3, 15],
  "claude-haiku-4-5": [1, 5],
};

export interface AiGebruik {
  invoer: number;
  uitvoer: number;
  kosten: number;
  /** Het model dat het antwoord leverde (bij een fallback niet het gevraagde model). */
  model: string;
}

/**
 * Tokengebruik en kosten van één antwoord. Met `iterations` (bijv. bij een
 * fallback: eerst het geweigerde model, dan het fallbackmodel) telt elke stap
 * tegen de prijs van het model dat hem uitvoerde.
 */
export function berekenGebruik(
  model: string,
  usage: {
    input_tokens: number | null;
    output_tokens: number;
    iterations?: readonly { input_tokens?: number | null; output_tokens?: number | null; model?: string | null }[] | null;
  },
): AiGebruik {
  const stappen = usage.iterations ?? [];
  if (!stappen.length) {
    const invoer = usage.input_tokens ?? 0;
    return { invoer, uitvoer: usage.output_tokens, kosten: kostenDollarcent(invoer, usage.output_tokens, model), model };
  }
  let invoer = 0;
  let uitvoer = 0;
  let kosten = 0;
  for (const s of stappen) {
    const i = s.input_tokens ?? 0;
    const u = s.output_tokens ?? 0;
    invoer += i;
    uitvoer += u;
    kosten += kostenDollarcent(i, u, s.model || model);
  }
  return { invoer, uitvoer, kosten: Math.round(kosten * 100) / 100, model };
}

/** Kosten in dollarcent (standaard Claude Opus 5.5: $4 / $20 per miljoen tokens). */
export function kostenDollarcent(invoer: number, uitvoer: number, model = "claude-opus-5-5"): number {
  const [pIn, pUit] = PRIJZEN[model] ?? PRIJZEN["claude-opus-5-5"];
  return Math.round(((invoer * pIn + uitvoer * pUit) / 1_000_000) * 100 * 100) / 100;
}
