// Beheerbare teksten rond reviews: de uitnodigingsmail en het formulier op
// /review/<token>. De sterren, tekenteller en foutmeldingen bij de velden
// staan in de code (src/lib/reviews/regels.ts).

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";

export const REVIEWS_UITNODIGING = sectie({
  sleutel: "reviews.uitnodiging",
  titel: "E-mail: vraag om een review",
  uitleg:
    "Wordt automatisch verstuurd een aantal dagen nadat het advies is verzonden (instelling ‘review_na_dagen’, standaard 7). Elke klant krijgt deze mail één keer.",
  variabelen: { naam: "voornaam van de klant" },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Hoe bevalt je kledingadvies?" },
    kop: { soort: "tekst", label: "Kop", standaard: "Hoe bevalt je kledingadvies?" },
    tekst: {
      soort: "opmaak",
      label: "Tekst (boven de knop)",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard:
        "Beste {naam},\n\nEen tijdje geleden ontving je je persoonlijke kledingadvies. Ik ben benieuwd: heb je er al iets mee gedaan, en hoe bevalt het?\n\nWil je in een paar zinnen je ervaring delen? Daar help je mij enorm mee, en andere vrouwen die nog twijfelen ook. Het kost je maar een minuutje.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Deel je ervaring" },
    na_knop: {
      soort: "opmaak",
      label: "Tekst onder de knop",
      regels: 3,
      standaard:
        "Je kiest zelf of je reactie op de website mag staan. Geen zin of geen tijd? Helemaal goed, je krijgt hierover geen herinnering.\n\nHartelijke groet,\nLida",
    },
    knop_werkt_niet: {
      soort: "tekst",
      label: "Kleine letters: regel boven de reservelink",
      standaard: "Werkt de knop niet? Kopieer deze link:",
    },
  },
});

export const REVIEWS_FORMULIER = sectie({
  sleutel: "reviews.formulier",
  titel: "Reviewformulier",
  uitleg: "De pagina die de klant opent via de link in de mail.",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Hoe bevalt je kledingadvies?" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard: "Fijn dat je even de tijd neemt! Vertel in je eigen woorden wat je van de test en je advies vond.",
    },
    sterren_label: { soort: "tekst", label: "Vraag bij de sterren", standaard: "Hoeveel sterren geef je?" },
    tekst_label: { soort: "tekst", label: "Label: je ervaring", standaard: "Je ervaring" },
    tekst_uitleg: {
      soort: "tekst",
      label: "Hulptekst bij je ervaring",
      standaard: "Wat vond je van de test en het advies? Wat heb je eraan gehad?",
    },
    naam_label: { soort: "tekst", label: "Label: naam", standaard: "Naam zoals getoond" },
    naam_uitleg: {
      soort: "tekst",
      label: "Hulptekst bij de naam",
      standaard: "Bijvoorbeeld je voornaam en woonplaats. Alleen je voornaam mag ook.",
    },
    toestemming: { soort: "tekst", label: "Vinkje: publicatie", standaard: "Mijn reactie mag op de website staan" },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Versturen" },
    knop_bijwerken: { soort: "tekst", label: "Knoptekst bij aanpassen", max: 60, standaard: "Wijzigingen opslaan" },
    bedankt_titel: { soort: "tekst", label: "Bedankt: titel", standaard: "Dankjewel!" },
    bedankt_tekst: {
      soort: "tekstvak",
      label: "Bedankt: tekst",
      regels: 3,
      standaard: "Wat fijn dat je je ervaring wilt delen. Ik lees elke reactie met veel plezier.",
    },
    bewerken_tekst: {
      soort: "tekst",
      label: "Bedankt: regel over aanpassen",
      standaard: "Wil je nog iets veranderen? Dat kan, zolang ik je reactie nog niet heb bekeken.",
    },
    bewerken_knop: { soort: "tekst", label: "Knop: reactie aanpassen", max: 60, standaard: "Reactie aanpassen" },
    afgesloten_titel: { soort: "tekst", label: "Al verwerkt: titel", standaard: "Bedankt voor je reactie" },
    afgesloten_tekst: {
      soort: "tekstvak",
      label: "Al verwerkt: tekst",
      regels: 3,
      standaard:
        "Ik heb je reactie inmiddels bekeken, dus aanpassen kan hier niet meer. Wil je toch iets wijzigen? Neem dan gerust contact met me op.",
    },
    fout: {
      soort: "tekst",
      label: "Foutmelding bij opslaan",
      standaard: "Er ging iets mis bij het opslaan. Probeer het nog eens.",
    },
  },
});

export const REVIEWS: Groep = {
  sleutel: "reviews",
  titel: "Reviews",
  omschrijving: "De e-mail waarin klanten om een review worden gevraagd, en het reviewformulier.",
  secties: [REVIEWS_UITNODIGING, REVIEWS_FORMULIER],
};
