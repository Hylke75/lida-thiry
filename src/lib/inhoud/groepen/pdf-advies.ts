// Beheerbare teksten van het persoonlijke advies als PDF (src/lib/pdf/document.tsx):
// de voorpagina en vaste labels, plus een optionele introductie- en slotpagina.
// De adviezen zelf staan bij de adviestypes.

import { sectie, type Groep, type SectieWaarden } from "../schema";

const OPMAAK_UITLEG =
  "Lege regel = nieuwe alinea. Gebruik ## voor een tussenkop, - voor een opsomming en **vet** voor nadruk. Een link [tekst](https://…) wordt in de PDF als ‘tekst (adres)’ geschreven.";

export const PDF_ADVIES_VOORPAGINA = sectie({
  sleutel: "pdf-advies.voorpagina",
  titel: "Voorpagina en vaste teksten",
  uitleg:
    "De voorpagina van het advies, de aanhef en de regels boven- en onderaan elke pagina. Nieuwe teksten gelden voor adviezen die vanaf nu worden gemaakt; bekijk het resultaat met de voorbeeld-PDF bij een type in Beheer → Adviestypes.",
  variabelen: {
    naam: "voornaam of naam van de klant (alleen in de aanhef)",
    letter: "letter van het silhouet, bijv. A (alleen onder de silhouettekening)",
    silhouet: "naam van het silhouet, bijv. Peer / driehoek (alleen onder de silhouettekening)",
    bedrijf: "de bedrijfsnaam (alleen bovenaan en onderaan de pagina's)",
    type: "de code van het figuurtype, bijv. 10A (alleen bovenaan en onderaan de pagina's)",
  },
  velden: {
    titel: {
      soort: "tekst",
      label: "Titel op de voorpagina",
      uitleg: "Staat in groene kapitalen naast de groene baan.",
      max: 60,
      standaard: "Online stijladvies",
    },
    aanhef: { soort: "tekst", label: "Aanhef boven het advies", max: 80, standaard: "Beste {naam}" },
    silhouet: {
      soort: "tekst",
      label: "Onderschrift bij de silhouettekening",
      uitleg: "Vet onder de eerste afbeelding van het onderdeel ‘Je silhouet’.",
      max: 60,
      standaard: "{letter}-silhouet",
    },
    koptekst: {
      soort: "tekst",
      label: "Regel rechtsboven op elke pagina",
      uitleg: "Links bovenaan staan de maand en het jaar van het advies.",
      max: 80,
      standaard: "{bedrijf}",
    },
    voettekst: { soort: "tekst", label: "Regel linksonder op elke pagina", max: 80, standaard: "{type}" },
  },
});

export const PDF_ADVIES_INTRO = sectie({
  sleutel: "pdf-advies.intro",
  titel: "Introductiepagina (optioneel)",
  uitleg:
    "Een pagina direct na de voorpagina, bijvoorbeeld een persoonlijk woord van Lida of uitleg over hoe je het advies leest. Leeg = geen introductiepagina.",
  variabelen: { naam: "naam van de klant" },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 60, standaard: "" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: "Zet één woord tussen *sterretjes* om het als cursief roze accent te tonen.",
      max: 120,
      standaard: "",
    },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: `${OPMAAK_UITLEG} Zonder tekst wordt de pagina niet getoond.`,
      regels: 10,
      max: 8_000,
      standaard: "",
    },
  },
});

export const PDF_ADVIES_SLOT = sectie({
  sleutel: "pdf-advies.slot",
  titel: "Slotpagina (optioneel)",
  uitleg:
    "Een laatste pagina na het advies, met bijvoorbeeld iets over Lida, contactgegevens, een uitnodiging voor een persoonlijke afspraak en een disclaimer. Blokken die leeg zijn, worden overgeslagen; als alles leeg is, is er geen slotpagina.",
  variabelen: { naam: "naam van de klant" },
  velden: {
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: "Zet één woord tussen *sterretjes* om het als cursief roze accent te tonen.",
      max: 120,
      standaard: "",
    },
    over: { soort: "opmaak", label: "Over Lida", uitleg: OPMAAK_UITLEG, regels: 6, max: 4_000, standaard: "" },
    contact: { soort: "opmaak", label: "Contact", uitleg: OPMAAK_UITLEG, regels: 4, max: 2_000, standaard: "" },
    oproep: {
      soort: "opmaak",
      label: "Uitnodiging (bijv. voor een persoonlijke afspraak)",
      uitleg: OPMAAK_UITLEG,
      regels: 4,
      max: 2_000,
      standaard: "",
    },
    disclaimer: { soort: "tekstvak", label: "Disclaimer (kleine letters onderaan)", regels: 3, max: 1_500, standaard: "" },
  },
});

export const PDF_ADVIES: Groep = {
  sleutel: "pdf-advies",
  titel: "PDF-advies",
  omschrijving:
    "Het persoonlijke advies als PDF: de voorpagina en vaste teksten, en een optionele introductie- en slotpagina. De adviezen zelf beheer je bij Adviestypes.",
  secties: [PDF_ADVIES_VOORPAGINA, PDF_ADVIES_INTRO, PDF_ADVIES_SLOT],
};

/** Alle beheerbare teksten van de advies-PDF (op de server gelezen, als prop doorgegeven). */
export interface AdviesPdfTeksten {
  voorpagina: SectieWaarden<typeof PDF_ADVIES_VOORPAGINA>;
  intro: SectieWaarden<typeof PDF_ADVIES_INTRO>;
  slot: SectieWaarden<typeof PDF_ADVIES_SLOT>;
}
