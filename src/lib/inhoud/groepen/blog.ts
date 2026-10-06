// Beheerbare teksten rond de blog: het overzicht (/blog) en de vaste blokken
// onder elk bericht (oproep tot de test, "Lees ook" en de nieuwsbrief).

import { sectie, type Groep } from "../schema";

export const BLOG_OVERZICHT = sectie({
  sleutel: "blog.overzicht",
  titel: "Blogoverzicht",
  uitleg: "De pagina /blog met alle berichten.",
  velden: {
    merk: {
      soort: "tekst",
      label: "Naam vóór het kleine label (linkt naar de homepage; leeg = alleen het label)",
      max: 60,
      standaard: "Lida Thiry",
    },
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", standaard: "Blog" },
    titel: { soort: "tekst", label: "Titel", standaard: "Stijltips & inspiratie" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Praktische tips over kleding, kleur en figuur, rechtstreeks van imago- en kledingadviseur Lida Thiry. Zodat je elke ochtend met plezier en zelfvertrouwen je kledingkast opentrekt.",
    },
    uitgelicht_label: { soort: "tekst", label: "Label bij het uitgelichte bericht", max: 40, standaard: "Uitgelicht" },
    alle_label: { soort: "tekst", label: "Filterknop voor alle berichten", max: 40, standaard: "Alles" },
    leeg_titel: { soort: "tekst", label: "Titel als er (nog) geen berichten zijn", standaard: "Binnenkort meer" },
    leeg_tekst: {
      soort: "tekstvak",
      label: "Tekst als er (nog) geen berichten zijn",
      regels: 2,
      standaard:
        "Er staan hier nog geen berichten. Meld je aan voor de nieuwsbrief, dan hoor je het als eerste wanneer er nieuwe stijltips verschijnen.",
    },
    leeg_filter: {
      soort: "tekst",
      label: "Tekst als een filter niets oplevert",
      standaard: "Er zijn geen berichten gevonden met dit filter.",
    },
    alle_berichten: { soort: "tekst", label: "Knop als een filter niets oplevert", max: 60, standaard: "Bekijk alle berichten" },
    tag_label: { soort: "tekst", label: "Tekst vóór de gekozen tag", max: 60, standaard: "Berichten met de tag" },
    filter_wissen: { soort: "tekst", label: "Link om het filter te wissen", max: 40, standaard: "filter wissen" },
    vorige: { soort: "tekst", label: "Bladeren: vorige pagina", max: 30, standaard: "Vorige" },
    volgende: { soort: "tekst", label: "Bladeren: volgende pagina", max: 30, standaard: "Volgende" },
    onderwerpen: { soort: "tekst", label: "Kop boven de tags", max: 60, standaard: "Onderwerpen" },
    rss_vraag: { soort: "tekst", label: "Zin vóór de RSS-link (onder het aanmeldblok)", max: 80, standaard: "Liever een feedlezer?" },
    rss_link: { soort: "tekst", label: "RSS-link", max: 60, standaard: "Volg de blog via RSS" },
  },
});

export const BLOG_ARTIKEL = sectie({
  sleutel: "blog.artikel",
  titel: "Onder elk bericht",
  uitleg: "De vaste blokken onder elk blogbericht: de oproep om de test te doen, ‘Lees ook’ en de nieuwsbrief.",
  velden: {
    cta_titel: { soort: "tekst", label: "Oproep: titel", standaard: "Benieuwd wat bij jouw figuur past?" },
    cta_tekst: {
      soort: "tekstvak",
      label: "Oproep: tekst",
      regels: 3,
      standaard:
        "Doe de online kledingadviestest: meet jezelf op, beantwoord een paar vragen en ontvang direct je persoonlijke kledingadvies als PDF.",
    },
    cta_knop: { soort: "tekst", label: "Oproep: knoptekst", max: 60, standaard: "Start de test" },
    cta_link: {
      soort: "tekst",
      label: "Oproep: link van de knop",
      uitleg: "Ook voor het blok {test} op een pagina. Bijv. /bestellen of /afspraak.",
      max: 200,
      standaard: "/bestellen",
    },
    lees_ook: { soort: "tekst", label: "Kop boven de gerelateerde berichten", standaard: "Lees ook" },
    alle_artikelen: { soort: "tekst", label: "Link naar alle berichten (naast ‘Lees ook’)", max: 60, standaard: "Alle artikelen" },
    nieuwsbrief_titel: {
      soort: "tekst",
      label: "Kop boven het aanmeldblok voor de nieuwsbrief",
      uitleg: "De rest van het aanmeldblok pas je aan bij Nieuwsbrief → Aanmeldblok op de website.",
      standaard: "Meer stijltips in je mailbox?",
    },
    delen_label: { soort: "tekst", label: "Tekst bij de deelknoppen", max: 60, standaard: "Deel dit bericht" },
    kopieer: { soort: "tekst", label: "Knop: link kopiëren", max: 40, standaard: "Kopieer link" },
    gekopieerd: { soort: "tekst", label: "Knop na het kopiëren", max: 40, standaard: "Link gekopieerd" },
    kopieer_vraag: {
      soort: "tekst",
      label: "Vraag als kopiëren niet automatisch lukt",
      uitleg: "In een venstertje met de link, om zelf te kopiëren (oudere browsers).",
      max: 60,
      standaard: "Kopieer de link:",
    },
  },
});

export const BLOG_SCHRIJFSTIJL = sectie({
  sleutel: "blog.schrijfstijl",
  titel: "Schrijfstijl voor de AI-schrijfhulp",
  uitleg:
    "Hoe de AI-schrijfhulp (Blog → Schrijven met AI) schrijft. Deze teksten zijn niet op de site te zien: ze gaan als vaste opdracht mee naar de AI, bij elk nieuw concept en elke bewerking.",
  velden: {
    merk: {
      soort: "tekst",
      label: "Naam van de schrijver of het merk",
      max: 80,
      standaard: "Lida Thiry",
    },
    over: {
      soort: "tekstvak",
      label: "Wie je bent en wat de site biedt",
      uitleg: "Zo begrijpt de AI voor wie het schrijft en waar de lezer heen kan.",
      regels: 4,
      max: 1_500,
      standaard:
        "imago- en kledingadviseur in Nederland. Op de site staat een betaalde online kledingadviestest: klanten meten zichzelf op, krijgen hun figuurtype te zien en ontvangen een persoonlijk kledingadvies als PDF.",
    },
    stem: {
      soort: "tekstvak",
      label: "Stem en toon",
      uitleg: "Hoe er geschreven wordt. De toon per bericht (warm, zakelijk, …) kies je daarnaast in het formulier.",
      regels: 4,
      max: 2_000,
      standaard:
        "Schrijf in het Nederlands, in de je-vorm, alsof Lida zelf schrijft (ik-perspectief mag). Praktisch en concreet: lezers moeten na het lezen iets kunnen doen met het advies. Positief over elk lichaam; geen afvaltips, geen oordeel over gewicht, geen medische uitspraken.",
    },
    vermijden: {
      soort: "tekstvak",
      label: "Wat de AI moet vermijden",
      regels: 3,
      max: 2_000,
      standaard:
        "Verzin geen feiten: geen statistieken, onderzoeken, citaten, klantverhalen of namen van merken en winkels. Algemeen vakkundig stijladvies is prima. Als iets een bron nodig heeft, laat het weg.",
    },
    afsluiting: {
      soort: "tekstvak",
      label: "Hoe een bericht eindigt",
      regels: 2,
      max: 1_000,
      standaard:
        "Sluit af met een korte, natuurlijke uitnodiging om de online kledingadviestest te doen via [de kledingadviestest](/bestellen) — niet opdringerig.",
    },
    links: {
      soort: "lijst",
      label: "Interne links die de AI mag gebruiken",
      uitleg: "Alleen deze links mag de AI in een bericht zetten. Gebruik paden op de eigen site, zoals /bestellen.",
      itemNaam: "link",
      max: 15,
      velden: {
        pad: { soort: "tekst", label: "Pad (bijv. /bestellen)", max: 200, standaard: "" },
        omschrijving: { soort: "tekst", label: "Waar de link naartoe gaat", max: 160, standaard: "" },
      },
      standaard: [
        { pad: "/bestellen", omschrijving: "de online kledingadviestest" },
        { pad: "/blog", omschrijving: "" },
      ],
    },
  },
});

export const BLOG: Groep = {
  sleutel: "blog",
  titel: "Blog",
  omschrijving:
    "Het blogoverzicht, de vaste blokken onder elk bericht (oproep tot de test, ‘Lees ook’, nieuwsbrief) en de schrijfstijl van de AI-schrijfhulp.",
  bekijkUrl: "/blog",
  secties: [BLOG_OVERZICHT, BLOG_ARTIKEL, BLOG_SCHRIJFSTIJL],
};
