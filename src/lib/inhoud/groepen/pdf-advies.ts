// Beheerbare teksten van het persoonlijke advies als PDF (src/lib/pdf/document.tsx):
// de voorpagina en vaste labels, plus een optionele introductie- en slotpagina.
// De adviezen zelf staan bij de adviestypes; de namen van de maten komen uit
// Test → De metingen en Test → Stap: Over jou.

import { sectie, type Groep, type SectieWaarden } from "../schema";

const OPMAAK_UITLEG =
  "Lege regel = nieuwe alinea. Gebruik ## voor een tussenkop, - voor een opsomming en **vet** voor nadruk. Een link [tekst](https://…) wordt in de PDF als ‘tekst (adres)’ geschreven.";

export const PDF_ADVIES_VOORPAGINA = sectie({
  sleutel: "pdf-advies.voorpagina",
  titel: "Voorpagina en vaste labels",
  uitleg:
    "De voorpagina van het advies (titel, type, silhouet en maten) en de inhoudsopgave. Nieuwe teksten gelden voor adviezen die vanaf nu worden gemaakt; bekijk het resultaat met de voorbeeld-PDF bij een type in Beheer → Adviestypes.",
  variabelen: {
    naam: "naam van de klant (alleen in de regel onder de titel)",
    datum: "datum van het advies, bijv. 6 oktober 2026 (alleen in de regel onder de titel)",
    silhouet: "naam van het silhouet, bijv. Zandloper (alleen bij het silhouet)",
    bedrijf: "de bedrijfsnaam (alleen in de voettekst)",
    type: "de code van het figuurtype, bijv. X2 (alleen in de voettekst)",
  },
  velden: {
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: "Zet één woord tussen *sterretjes* om het als cursief koraalrood accent te tonen.",
      max: 80,
      standaard: "Jouw persoonlijke *kledingadvies*",
    },
    voor: { soort: "tekst", label: "Regel onder de titel", max: 120, standaard: "Voor {naam} · {datum}" },
    type_label: { soort: "tekst", label: "Klein label boven het figuurtype", max: 40, standaard: "Jouw type" },
    silhouet: { soort: "tekst", label: "Regel met het silhouet", max: 80, standaard: "Silhouet: {silhouet}" },
    figuur_eigen: {
      soort: "tekst",
      label: "Onderschrift bij de tekening (getekend naar de eigen maten)",
      max: 120,
      standaard: "Jouw silhouet, getekend naar je eigen maten",
    },
    figuur_standaard: {
      soort: "tekst",
      label: "Onderschrift bij de tekening (standaardsilhouet)",
      uitleg: "Als de eigen maten er niet (meer) zijn, staat het standaardsilhouet van het type op de voorpagina.",
      max: 120,
      standaard: "Silhouet {silhouet}",
    },
    maten_label: {
      soort: "tekst",
      label: "Klein label boven de maten",
      uitleg: "De namen van de maten pas je aan bij Test → De metingen (lengte en gewicht bij Test → Stap: Over jou).",
      max: 40,
      standaard: "Jouw maten",
    },
    inhoud_label: { soort: "tekst", label: "Klein label boven de inhoudsopgave", max: 40, standaard: "In dit advies" },
    inhoud_titel: { soort: "tekst", label: "Titel van de inhoudsopgave", max: 60, standaard: "Inhoud" },
    voettekst: { soort: "tekst", label: "Voettekst op elke pagina", max: 120, standaard: "© {bedrijf} · Type {type}" },
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
      uitleg: "Zet één woord tussen *sterretjes* om het als cursief koraalrood accent te tonen.",
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
      uitleg: "Zet één woord tussen *sterretjes* om het als cursief koraalrood accent te tonen.",
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
    "Het persoonlijke advies als PDF: de voorpagina en vaste labels, en een optionele introductie- en slotpagina. De adviezen zelf beheer je bij Adviestypes.",
  secties: [PDF_ADVIES_VOORPAGINA, PDF_ADVIES_INTRO, PDF_ADVIES_SLOT],
};

/** Alle beheerbare teksten van de advies-PDF (op de server gelezen, als prop doorgegeven). */
export interface AdviesPdfTeksten {
  voorpagina: SectieWaarden<typeof PDF_ADVIES_VOORPAGINA>;
  intro: SectieWaarden<typeof PDF_ADVIES_INTRO>;
  slot: SectieWaarden<typeof PDF_ADVIES_SLOT>;
  /** Namen van de maten in het overzicht op de voorpagina (lengte_cm, gewicht_kg, borst, …). */
  maten: Readonly<Record<string, string>>;
}
