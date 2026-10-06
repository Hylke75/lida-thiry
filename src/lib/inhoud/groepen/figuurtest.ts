// Beheerbare teksten van de productpagina /figuurtest: wat de online figuurtest
// is, wat je krijgt, een (getekend, algemeen) voorbeeld van de PDF, wat je nodig
// hebt, de prijs en de knop naar /bestellen.
//
// Let op: de figuurtypes zelf (namen, tekeningen, uitleg) zijn alleen voor
// betalende klanten. Deze pagina is openbaar: schrijf hier dus nooit typenamen,
// -kenmerken of echt advies per type.

import { sectie, type Groep } from "../schema";

const ACCENT_UITLEG = "Zet één kort woord tussen *sterretjes* om het als cursief accent te tonen.";
const GEEN_TYPES =
  "Openbare pagina: noem geen figuurtypes of advies per type; die zijn alleen voor klanten (achter de testlink).";

export const FIGUURTEST_PAGINA = sectie({
  sleutel: "figuurtest.pagina",
  titel: "Bovenaan: titel, kernpunten en prijs",
  uitleg: `De kop van /figuurtest met de belangrijkste feiten, de prijs en de knop naar het bestelformulier. De prijs komt uit Beheer → Instellingen; zolang die leeg is, staat hier de melding van de bestelpagina (Teksten → Bestellen). ${GEEN_TYPES}`,
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Online figuurtest" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      max: 120,
      standaard: "Ontdek welke kleding *jouw* figuur mooi laat uitkomen",
    },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      max: 600,
      standaard:
        "Meet jezelf thuis op, beantwoord een paar vragen en zie direct welk figuurtype je hebt. Daarna ontvang je een persoonlijk kledingadvies als PDF, afgestemd op jouw maten en antwoorden.",
    },
    feiten: {
      soort: "lijst",
      label: "Kernpunten (naast de prijs)",
      uitleg: "Korte feiten, bijvoorbeeld hoe lang de test duurt en wat je krijgt.",
      itemNaam: "kernpunt",
      max: 5,
      velden: {
        label: { soort: "tekst", label: "Label (klein)", max: 40, standaard: "" },
        tekst: { soort: "tekst", label: "Tekst", max: 100, standaard: "" },
      },
      standaard: [
        { label: "Duur", tekst: "Ongeveer 15 tot 20 minuten" },
        { label: "Uitslag", tekst: "Direct na het invullen" },
        { label: "Advies", tekst: "Persoonlijke PDF in je mailbox" },
        { label: "Waar", tekst: "Gewoon vanuit huis" },
      ],
    },
    prijsLabel: { soort: "tekst", label: "Label boven de prijs", max: 40, standaard: "Prijs" },
    btw: { soort: "tekst", label: "Kleine tekst achter de prijs", max: 40, standaard: "incl. btw, eenmalig" },
    knop: { soort: "tekst", label: "Knop naar het bestelformulier", max: 60, standaard: "Start de figuurtest" },
    knopUitleg: {
      soort: "tekst",
      label: "Kleine regel onder de knop (leeg = geen)",
      max: 160,
      standaard: "Je rekent veilig af via iDEAL of een andere betaalmethode en kunt direct beginnen.",
    },
  },
});

export const FIGUURTEST_INHOUD = sectie({
  sleutel: "figuurtest.inhoud",
  titel: "Wat je krijgt (met voorbeeld van de PDF)",
  uitleg: `Wat er in de uitslag en het advies zit, met een getekend voorbeeld van de PDF: pagina's met een kop en grijze regels, zonder echte inhoud. ${GEEN_TYPES}`,
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Wat je krijgt" },
    titel: { soort: "tekst", label: "Titel", uitleg: ACCENT_UITLEG, max: 120, standaard: "Je uitslag en je persoonlijke advies" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      max: 600,
      standaard:
        "Geen algemeen lijstje, maar advies dat past bij jouw verhoudingen, lengte en antwoorden. Je bewaart het als overzichtelijke PDF, om terug te lezen of mee te nemen als je gaat winkelen.",
    },
    punten: {
      soort: "lijst",
      label: "Opsomming (met vinkjes)",
      itemNaam: "punt",
      max: 8,
      velden: { tekst: { soort: "tekst", label: "Tekst", max: 160, standaard: "" } },
      standaard: [
        { tekst: "Je persoonlijke figuurtype, direct zichtbaar na het invullen" },
        { tekst: "Een persoonlijke PDF met kledingadvies, afgestemd op jouw maten" },
        { tekst: "Welke snitten, lengtes en pasvormen bij je passen, en wat je beter kunt laten hangen" },
        { tekst: "Een overzicht van je eigen maten om bij het winkelen te gebruiken" },
      ],
    },
    voorbeeldTitel: { soort: "tekst", label: "Voorbeeld van de PDF: titel", max: 80, standaard: "Zo ziet je advies eruit" },
    voorbeeldPaginas: {
      soort: "lijst",
      label: "Voorbeeld van de PDF: koppen van de pagina's",
      uitleg: "Algemene koppen, zonder figuurtype of echt advies. De regels eronder zijn grijze balkjes.",
      itemNaam: "pagina",
      max: 4,
      velden: { kop: { soort: "tekst", label: "Kop", max: 40, standaard: "" } },
      standaard: [{ kop: "Jouw maten" }, { kop: "Wat jou flatteert" }, { kop: "Tips per kledingstuk" }, { kop: "Mee om te winkelen" }],
    },
    voorbeeldOnderschrift: {
      soort: "tekst",
      label: "Voorbeeld van de PDF: onderschrift",
      max: 200,
      standaard: "Voorbeeldweergave. Jouw PDF is persoonlijk en gaat over jouw figuur en maten.",
    },
  },
});

export const FIGUURTEST_VOORBEREIDING = sectie({
  sleutel: "figuurtest.voorbereiding",
  titel: "Wat heb je nodig?",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Voorbereiding" },
    titel: { soort: "tekst", label: "Titel", uitleg: ACCENT_UITLEG, max: 120, standaard: "Wat heb je nodig?" },
    punten: {
      soort: "lijst",
      label: "Benodigdheden",
      itemNaam: "punt",
      max: 6,
      velden: {
        titel: { soort: "tekst", label: "Titel", max: 80, standaard: "" },
        tekst: { soort: "tekstvak", label: "Tekst", regels: 2, max: 300, standaard: "" },
      },
      standaard: [
        { titel: "Een flexibel meetlint", tekst: "Zo'n zacht lint uit de naaidoos." },
        { titel: "Iemand die even helpt", tekst: "Samen meten gaat makkelijker en de maten worden nauwkeuriger." },
        {
          titel: "Dunne kleding",
          tekst: "Draag dunne, nauwsluitende kleding of meet in je ondergoed: dan zijn de maten het nauwkeurigst.",
        },
      ],
    },
    later: {
      soort: "tekstvak",
      label: "Tekst onder de benodigdheden (leeg = geen)",
      regels: 2,
      max: 400,
      standaard:
        "Geen meetlint of hulp bij de hand? Geen probleem: na je betaling ontvang je je persoonlijke testlink ook per e-mail, zodat je de test kunt doen wanneer het jou uitkomt.",
    },
  },
});

export const FIGUURTEST_AFSLUITING = sectie({
  sleutel: "figuurtest.afsluiting",
  titel: "Vragen en afsluiting",
  uitleg:
    "De veelgestelde vragen op /figuurtest zijn dezelfde als op de homepage (Teksten → Website → Veelgestelde vragen); hier stel je alleen de kop en de afsluiting in.",
  velden: {
    vragenBovenschrift: { soort: "tekst", label: "Vragen: klein label boven de titel", max: 80, standaard: "Goed om te weten" },
    vragenTitel: { soort: "tekst", label: "Vragen: titel (leeg = geen vragen tonen)", max: 120, standaard: "Veelgestelde vragen" },
    titel: { soort: "tekst", label: "Afsluiting: titel", uitleg: ACCENT_UITLEG, max: 120, standaard: "Klaar om te beginnen?" },
    tekst: {
      soort: "tekstvak",
      label: "Afsluiting: tekst",
      regels: 2,
      max: 400,
      standaard: "Pak een meetlint, vraag iemand om je te helpen en ontdek vandaag nog wat jou goed staat.",
    },
    knop: { soort: "tekst", label: "Afsluiting: knoptekst", max: 60, standaard: "Start de figuurtest" },
  },
});

export const FIGUURTEST: Groep = {
  sleutel: "figuurtest",
  titel: "Figuurtest",
  omschrijving:
    "De pagina over de online figuurtest (/figuurtest): wat je krijgt, een voorbeeld van het advies, wat je nodig hebt, de prijs en de knop naar het bestelformulier.",
  bekijkUrl: "/figuurtest",
  secties: [FIGUURTEST_PAGINA, FIGUURTEST_INHOUD, FIGUURTEST_VOORBEREIDING, FIGUURTEST_AFSLUITING],
};
