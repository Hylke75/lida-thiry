import { sectie, type Groep } from "../schema";

export const WEBSITE_HERO = sectie({
  sleutel: "website.hero",
  titel: "Bovenaan de homepage",
  uitleg: "Het eerste wat bezoekers zien. De prijs wordt automatisch achter de knoptekst gezet.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", standaard: "Lida Thiry · Imago & Kledingadvies" },
    titel: {
      soort: "tekst",
      label: "Titel",
      standaard: "Ontdek je figuurtype en kleed je zoals het bij jou past",
    },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Doe de online kledingadviestest op basis van je lengte, maten en een paar vragen over je figuur. Je ziet direct je figuurtype en ontvangt een persoonlijk advies als PDF.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Start de test" },
    prijsregel: {
      soort: "tekst",
      label: "Regel onder de knop (als de prijs bekend is)",
      standaard: "Eenmalig, inclusief btw · direct beginnen",
    },
    geenPrijs: {
      soort: "tekst",
      label: "Regel onder de knop (als er nog geen prijs is)",
      standaard: "De prijs wordt binnenkort bekendgemaakt.",
    },
  },
});

export const WEBSITE_STAPPEN = sectie({
  sleutel: "website.stappen",
  titel: "Zo werkt het",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Zo werkt het" },
    stappen: {
      soort: "lijst",
      label: "Stappen",
      itemNaam: "stap",
      max: 6,
      velden: {
        titel: { soort: "tekst", label: "Titel" , standaard: "" },
        tekst: { soort: "tekstvak", label: "Tekst", regels: 2, standaard: "" },
      },
      standaard: [
        {
          titel: "Bestel en betaal veilig",
          tekst: "Je rekent eenvoudig af via iDEAL of een andere betaalmethode. Direct daarna kun je beginnen.",
        },
        {
          titel: "Meet jezelf op",
          tekst: "Met een meetlint en duidelijke illustraties vul je je lengte, maten en een paar vragen over je figuur in.",
        },
        {
          titel: "Ontvang je persoonlijke advies",
          tekst: "Je krijgt meteen je figuurtype te zien en ontvangt je persoonlijke kledingadvies als PDF in je mailbox.",
        },
      ],
    },
  },
});

export const WEBSITE_FIGUURTYPES = sectie({
  sleutel: "website.figuurtypes",
  titel: "De figuurtypes",
  uitleg: "De figuurtypes zelf (naam, tekening, omschrijving) beheer je bij Lichaamstypes.",
  variabelen: { aantal: "het aantal actieve figuurtypes, in letters (bijv. vijf)" },
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "De {aantal} figuurtypes" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Ieder lichaam is anders, maar de verhoudingen tussen schouders, taille en heupen vallen grofweg in {aantal} types. De test bepaalt welk type het beste bij jou past.",
    },
  },
});

export const WEBSITE_ADVIES = sectie({
  sleutel: "website.advies",
  titel: "Wat zit er in je advies",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Wat zit er in je persoonlijke advies?" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Je advies is geen algemeen lijstje, maar afgestemd op jouw maten en antwoorden. Je ontvangt het als overzichtelijke PDF die je kunt bewaren, printen of meenemen als je gaat winkelen.",
    },
    punten: {
      soort: "lijst",
      label: "Opsomming",
      itemNaam: "punt",
      max: 12,
      velden: { tekst: { soort: "tekst", label: "Tekst", standaard: "" } },
      standaard: [
        { tekst: "Jouw figuurtype, met uitleg over wat dat betekent voor je verhoudingen" },
        { tekst: "Welke snitten, lengtes en pasvormen jouw figuur mooi laten uitkomen" },
        { tekst: "Tips voor broeken, rokken, jurken, jasjes en tops" },
        { tekst: "Wat je beter kunt vermijden, en waarom" },
        { tekst: "Een overzicht van je eigen maten om bij het winkelen te gebruiken" },
      ],
    },
  },
});

export const WEBSITE_OVER = sectie({
  sleutel: "website.over",
  titel: "Over Lida",
  uitleg: "Vervang de teksten tussen [vierkante haken] door je eigen verhaal.",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Over Lida" },
    initialen: { soort: "tekst", label: "Initialen in de cirkel", max: 4, standaard: "LT" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      regels: 10,
      standaard: [
        "Ik ben Lida Thiry, imago- en kledingadviseur. [aan te vullen: korte introductie — achtergrond, opleiding en hoeveel jaar ervaring.]",
        "[aan te vullen: waarom je dit werk doet en wat je klanten wilt meegeven, bijvoorbeeld: “Ik geloof dat iedere vrouw zich goed kan voelen in haar kleding, als ze weet wat bij haar figuur past.”]",
        "Deze online test is gebaseerd op de methode die ik ook in mijn persoonlijke adviesgesprekken gebruik.",
      ].join("\n\n"),
    },
  },
});

export const WEBSITE_ERVARINGEN = sectie({
  sleutel: "website.ervaringen",
  titel: "Ervaringen van klanten",
  uitleg:
    "Gebruik alleen echte reacties, met toestemming van de klant. Zolang de lijst leeg is, wordt dit blok niet getoond.",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Ervaringen" },
    ervaringen: {
      soort: "lijst",
      label: "Ervaringen",
      itemNaam: "ervaring",
      max: 9,
      velden: {
        citaat: { soort: "tekstvak", label: "Citaat", regels: 3, max: 600, standaard: "" },
        naam: { soort: "tekst", label: "Naam (bijv. Anna, Utrecht)", standaard: "" },
      },
      standaard: [],
    },
  },
});

export const WEBSITE_VRAGEN = sectie({
  sleutel: "website.vragen",
  titel: "Veelgestelde vragen",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Veelgestelde vragen" },
    vragen: {
      soort: "lijst",
      label: "Vragen",
      itemNaam: "vraag",
      velden: {
        vraag: { soort: "tekst", label: "Vraag", standaard: "" },
        antwoord: { soort: "tekstvak", label: "Antwoord", regels: 3, standaard: "" },
      },
      standaard: [
        {
          vraag: "Hoe lang duurt de test?",
          antwoord:
            "Reken op ongeveer 15 tot 20 minuten. Het meeste daarvan gaat zitten in het opmeten; de vragen zelf zijn zo beantwoord.",
        },
        {
          vraag: "Wat heb ik nodig?",
          antwoord:
            "Een flexibel meetlint (zo'n zacht lint van de naaidoos) en bij voorkeur iemand die je even helpt met meten. Draag dunne, nauwsluitende kleding of meet in je ondergoed: dan zijn de maten het nauwkeurigst.",
        },
        {
          vraag: "Wat krijg ik precies?",
          antwoord:
            "Na het invullen zie je direct je figuurtype. Daarnaast ontvang je een persoonlijke PDF met uitleg over je type en concreet kledingadvies: welke snitten, lengtes en pasvormen bij je passen, en wat je beter kunt laten hangen.",
        },
        {
          vraag: "Wat gebeurt er met mijn maten?",
          antwoord:
            "Je maten gebruiken we alleen om jouw advies te maken. Ze worden beveiligd opgeslagen in de EU en na een vaste termijn geanonimiseerd. Meer lees je in de privacyverklaring.",
        },
        {
          vraag: "Kan ik de test later doen of verder gaan?",
          antwoord:
            "Ja. Na je betaling ontvang je je persoonlijke testlink ook per e-mail. Zo kun je de test starten op een moment dat het jou uitkomt, bijvoorbeeld wanneer er iemand is die je kan helpen met meten.",
        },
      ],
    },
  },
});

export const WEBSITE_AFSLUITING = sectie({
  sleutel: "website.afsluiting",
  titel: "Afsluiting onderaan",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Klaar om te ontdekken wat bij jou past?" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 2,
      standaard:
        "Pak een meetlint, vraag iemand om je te helpen en ontvang vandaag nog je persoonlijke kledingadvies.",
    },
  },
});

export const WEBSITE: Groep = {
  sleutel: "website",
  titel: "Website",
  omschrijving: "De teksten op de homepage: introductie, stappen, Over Lida, ervaringen en veelgestelde vragen.",
  bekijkUrl: "/",
  secties: [
    WEBSITE_HERO,
    WEBSITE_STAPPEN,
    WEBSITE_FIGUURTYPES,
    WEBSITE_ADVIES,
    WEBSITE_OVER,
    WEBSITE_ERVARINGEN,
    WEBSITE_VRAGEN,
    WEBSITE_AFSLUITING,
  ],
};
