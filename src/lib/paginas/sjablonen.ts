// Startpagina's die met één klik als concept kunnen worden aangemaakt.
// Feiten die alleen Lida zelf kan invullen staan als [aan te vullen: …]:
// zolang die er staan, kan de pagina niet worden gepubliceerd.

import type { PaginaInvoer } from "./beheer";

export interface Startpagina {
  sleutel: string;
  /** Korte uitleg op de knop in het beheer. */
  omschrijving: string;
  pagina: PaginaInvoer;
}

const basis = {
  omslag_url: null,
  omslag_alt: "",
  menu_label: "",
  seo_titel: "",
  niet_indexeren: false,
} as const;

export const STARTPAGINAS: readonly Startpagina[] = [
  {
    sleutel: "over-mij",
    omschrijving: "Wie je bent, waarom je dit werk doet en een uitnodiging voor de test.",
    pagina: {
      ...basis,
      titel: "Over mij",
      slug: "over-mij",
      intro: "[aan te vullen: één of twee zinnen over wie je bent en wat je voor je klanten doet]",
      inhoud: [
        "[foto: een portretfoto van jezelf]",
        "",
        "## Wie ben ik?",
        "",
        "Ik ben Lida Thiry, imago- en kledingadviseur. [aan te vullen: je achtergrond, opleiding en sinds wanneer je mensen adviseert]",
        "",
        "## Waarom ik dit werk doe",
        "",
        "[aan te vullen: wat je drijft en wat je je klanten wilt meegeven]",
        "",
        "## Mijn aanpak",
        "",
        "[aan te vullen: hoe je werkt, bijvoorbeeld met persoonlijk advies, een kleuranalyse of een garderobecheck]",
        "",
        "## Ontdek je eigen figuurtype",
        "",
        "Wil je weten welke kleding jouw figuur het mooist laat uitkomen? Met de online kledingadviestest meet je jezelf op, beantwoord je een paar vragen en ontvang je je persoonlijke advies.",
        "",
        "{test}",
      ].join("\n"),
      in_menu: true,
      in_footer: false,
      volgorde: 10,
      seo_omschrijving: "",
    },
  },
  {
    sleutel: "werkwijze",
    omschrijving: "Stap voor stap uitgelegd hoe de test en het advies werken.",
    pagina: {
      ...basis,
      titel: "Werkwijze",
      slug: "werkwijze",
      intro: "Zo werkt het kledingadvies, stap voor stap.",
      inhoud: [
        "## 1. Je doet de online test",
        "",
        "Je meet jezelf op met behulp van duidelijke instructies en beantwoordt een paar vragen. [aan te vullen: hoe lang dit ongeveer duurt]",
        "",
        "## 2. Je ontvangt je persoonlijke advies",
        "",
        "Op basis van je maten bepaalt de test je figuurtype. Je ontvangt je persoonlijke advies als PDF, met uitleg over wat jouw figuur mooi laat uitkomen.",
        "",
        "## 3. Verder met persoonlijk advies",
        "",
        "[aan te vullen: of en hoe klanten daarnaast een persoonlijke afspraak kunnen maken, wat dat inhoudt en wat het kost]",
        "",
        "## Klaar om te beginnen?",
        "",
        "{test}",
      ].join("\n"),
      in_menu: true,
      in_footer: false,
      volgorde: 20,
      seo_omschrijving: "",
    },
  },
  {
    sleutel: "veelgestelde-vragen",
    omschrijving: "Antwoorden op vragen die vaak gesteld worden.",
    pagina: {
      ...basis,
      titel: "Veelgestelde vragen",
      slug: "veelgestelde-vragen",
      intro: "Antwoorden op vragen die ik vaak krijg. Staat jouw vraag er niet bij? Neem gerust contact met me op.",
      inhoud: [
        "### Hoe meet ik mezelf op?",
        "",
        "In de test staat bij elke maat een duidelijke uitleg. [aan te vullen: eventuele extra tips, bijvoorbeeld welk meetlint je gebruikt]",
        "",
        "### Wat kost de test?",
        "",
        "[aan te vullen: de prijs, of een zin met een link naar de bestelpagina]",
        "",
        "### Hoe ontvang ik mijn advies?",
        "",
        "Je ontvangt je persoonlijke advies als PDF. [aan te vullen: hoe snel en op welke manier]",
        "",
        "### Wat gebeurt er met mijn maten?",
        "",
        "Hoe ik met je gegevens en maten omga, lees je in de [privacyverklaring](/privacy).",
        "",
        "### Kan ik ook persoonlijk advies krijgen?",
        "",
        "[aan te vullen]",
        "",
        "### Staat je vraag er niet bij?",
        "",
        "Stuur me gerust een bericht via de [contactpagina](/contact).",
      ].join("\n"),
      in_menu: false,
      in_footer: true,
      volgorde: 30,
      seo_omschrijving: "",
    },
  },
  {
    sleutel: "contact",
    omschrijving: "Een contactformulier en je bedrijfsgegevens.",
    pagina: {
      ...basis,
      titel: "Contact",
      slug: "contact",
      intro: "Heb je een vraag over de kledingadviestest of over je persoonlijke advies? Stuur me gerust een bericht.",
      inhoud: [
        "## Stuur een bericht",
        "",
        "Vul het formulier in, dan neem ik zo snel mogelijk contact met je op.",
        "",
        "{contactformulier}",
        "",
        "## Gegevens",
        "",
        "{bedrijfsgegevens}",
      ].join("\n"),
      in_menu: true,
      in_footer: true,
      volgorde: 40,
      seo_omschrijving: "",
    },
  },
];

export function vindStartpagina(sleutel: string): Startpagina | undefined {
  return STARTPAGINAS.find((s) => s.sleutel === sleutel);
}
