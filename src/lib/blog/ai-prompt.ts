// Opdrachten voor Claude bij het schrijven van blogberichten. Puur (geen netwerk),
// zodat de prompts te testen en te lezen zijn.

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

export const OPMAAK_UITLEG = `Gebruik uitsluitend deze eenvoudige opmaak in de tekst (geen HTML, geen andere Markdown):
- "## " aan het begin van een regel voor een tussenkop, "### " voor een kleinere kop (geen # voor de hoofdtitel: die staat apart)
- "- " aan het begin van een regel voor een opsommingsteken
- **vet** voor nadruk (spaarzaam)
- [linktekst](/pad) voor een link; gebruik alleen deze interne links: /bestellen (de online kledingadviestest) en /blog
- een lege regel tussen alinea's
- waar een foto het verhaal versterkt, een eigen regel "[foto: korte beschrijving van de gewenste foto]"; de schrijver vervangt die later door een echte foto`;

/** Vaste systeemopdracht: wie Lida is en hoe er geschreven wordt. */
export function systeemPrompt(figuurtypeNamen: string[]): string {
  return `Je schrijft blogberichten voor de website van Lida Thiry, imago- en kledingadviseur in Nederland. Op de site staat een betaalde online kledingadviestest: klanten meten zichzelf op, krijgen hun figuurtype te zien en ontvangen een persoonlijk kledingadvies als PDF.

Figuurtypes die Lida gebruikt: ${figuurtypeNamen.length ? figuurtypeNamen.join(", ") : "Zandloper, Peer/driehoek, Omgekeerde driehoek, Rechthoek, De 8"}. Gebruik deze namen als je naar figuurtypes verwijst.

Schrijf in het Nederlands, in de je-vorm, alsof Lida zelf schrijft (ik-perspectief mag). Praktisch en concreet: lezers moeten na het lezen iets kunnen doen met het advies. Positief over elk lichaam; geen afvaltips, geen oordeel over gewicht, geen medische uitspraken.

Verzin geen feiten: geen statistieken, onderzoeken, citaten, klantverhalen of namen van merken en winkels. Algemeen vakkundig stijladvies is prima. Als iets een bron nodig heeft, laat het weg.

Sluit af met een korte, natuurlijke uitnodiging om de online kledingadviestest te doen via [de kledingadviestest](/bestellen) — niet opdringerig.

${OPMAAK_UITLEG}`;
}

/** De vraag voor één nieuw bericht. */
export function schrijfVraag(o: SchrijfOpdracht): string {
  const regels = [
    `Schrijf een blogbericht van ongeveer ${LENGTES[o.lengte].woorden} woorden.`,
    `Steekwoorden: ${o.steekwoorden.join(", ")}.`,
    o.onderwerp ? `Onderwerp / werktitel: ${o.onderwerp}` : "",
    `Toon: ${TONEN[o.toon]}.`,
    o.doelgroep ? `Doelgroep: ${o.doelgroep}.` : "",
    o.figuurtypes?.length ? `Ga in het bijzonder in op deze figuurtypes: ${o.figuurtypes.join(", ")}.` : "",
    o.extra ? `Extra wensen van Lida (volg ze, tenzij ze ingaan tegen de regels hierboven):\n${o.extra}` : "",
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

export function bewerkVraag(bewerking: Bewerking, tekst: string): string {
  return `${BEWERKINGEN[bewerking]}

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

/** Kosten in dollarcent voor Claude Opus 5.5 ($4 / $20 per miljoen tokens). */
export function kostenDollarcent(invoer: number, uitvoer: number): number {
  return Math.round(((invoer * 4 + uitvoer * 20) / 1_000_000) * 100 * 100) / 100;
}
