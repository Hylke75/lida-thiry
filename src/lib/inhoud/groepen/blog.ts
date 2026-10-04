// Beheerbare teksten rond de blog: het overzicht (/blog) en de vaste blokken
// onder elk bericht (oproep tot de test, "Lees ook" en de nieuwsbrief).

import { sectie, type Groep } from "../schema";

export const BLOG_OVERZICHT = sectie({
  sleutel: "blog.overzicht",
  titel: "Blogoverzicht",
  uitleg: "De pagina /blog met alle berichten.",
  velden: {
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
    lees_ook: { soort: "tekst", label: "Kop boven de gerelateerde berichten", standaard: "Lees ook" },
    nieuwsbrief_titel: {
      soort: "tekst",
      label: "Kop boven het aanmeldblok voor de nieuwsbrief",
      uitleg: "De rest van het aanmeldblok pas je aan bij Nieuwsbrief → Aanmeldblok op de website.",
      standaard: "Meer stijltips in je mailbox?",
    },
    delen_label: { soort: "tekst", label: "Tekst bij de deelknoppen", max: 60, standaard: "Deel dit bericht" },
  },
});

export const BLOG: Groep = {
  sleutel: "blog",
  titel: "Blog",
  omschrijving: "Het blogoverzicht en de vaste blokken onder elk bericht (oproep tot de test, ‘Lees ook’, nieuwsbrief).",
  bekijkUrl: "/blog",
  secties: [BLOG_OVERZICHT, BLOG_ARTIKEL],
};
