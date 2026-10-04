// Beheerbare teksten rond het contactformulier: het formulier zelf (blok
// {contactformulier} op een pagina), de ontvangstbevestiging aan de afzender en
// de antwoordmail die vanuit Beheer → Berichten wordt verstuurd.

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";

export const CONTACT_FORMULIER = sectie({
  sleutel: "contact.formulier",
  titel: "Contactformulier",
  uitleg:
    "Het formulier dat verschijnt waar je {contactformulier} op een eigen regel in een pagina zet (Beheer → Pagina's).",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Stuur me een bericht" },
    intro: {
      soort: "tekstvak",
      label: "Inleiding",
      regels: 3,
      standaard:
        "Heb je een vraag over de test, je bestelling of persoonlijk advies? Laat het me weten. Ik reageer meestal binnen twee werkdagen.",
    },
    naam_label: { soort: "tekst", label: "Label bij het naamveld", standaard: "Naam" },
    email_label: { soort: "tekst", label: "Label bij het e-mailveld", standaard: "E-mailadres" },
    telefoon_label: { soort: "tekst", label: "Label bij het telefoonveld", standaard: "Telefoonnummer (optioneel)" },
    onderwerp_label: { soort: "tekst", label: "Label bij de onderwerpkeuze", standaard: "Waar gaat je bericht over?" },
    onderwerp_kies: { soort: "tekst", label: "Eerste (lege) keuze in de lijst", standaard: "Kies een onderwerp" },
    onderwerpen: {
      soort: "lijst",
      label: "Onderwerpen om uit te kiezen",
      uitleg: "Laat de lijst leeg om de onderwerpkeuze te verbergen.",
      itemNaam: "onderwerp",
      max: 15,
      velden: { onderwerp: { soort: "tekst", label: "Onderwerp", max: 80, standaard: "" } },
      standaard: [
        { _id: "test", onderwerp: "Vraag over de test" },
        { _id: "bestelling", onderwerp: "Bestelling" },
        { _id: "advies", onderwerp: "Persoonlijk advies" },
        { _id: "samenwerking", onderwerp: "Samenwerking" },
        { _id: "anders", onderwerp: "Anders" },
      ],
    },
    bericht_label: { soort: "tekst", label: "Label bij het berichtveld", standaard: "Je bericht" },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Versturen" },
    privacy: {
      soort: "opmaak",
      label: "Privacyzin onder het formulier",
      uitleg: OPMAAK_UITLEG,
      regels: 2,
      max: 1_000,
      standaard:
        "Ik gebruik je gegevens alleen om je bericht te beantwoorden. Lees meer in de [privacyverklaring](/privacy).",
    },
    succes_titel: { soort: "tekst", label: "Titel na versturen", standaard: "Bedankt voor je bericht!" },
    succes: {
      soort: "tekstvak",
      label: "Melding na versturen",
      regels: 2,
      standaard:
        "Je bericht is goed aangekomen. Je ontvangt een bevestiging per e-mail en ik neem zo snel mogelijk contact met je op.",
    },
    fout: {
      soort: "tekst",
      label: "Foutmelding",
      standaard: "Versturen is niet gelukt. Probeer het over een paar minuten opnieuw.",
    },
  },
});

export const CONTACT_BEVESTIGMAIL = sectie({
  sleutel: "contact.bevestigmail",
  titel: "Ontvangstbevestiging aan de afzender",
  uitleg: "Wordt direct na het versturen van het contactformulier gestuurd. Onder de tekst staat het bericht zelf.",
  variabelen: { naam: "de naam die is ingevuld", onderwerp: "het gekozen onderwerp (of ‘je bericht’)" },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp van de mail", standaard: "Bedankt voor je bericht" },
    kop: { soort: "tekst", label: "Kop", standaard: "Bedankt voor je bericht!" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard:
        "Beste {naam},\n\nBedankt voor je bericht. Ik heb het goed ontvangen en reageer zo snel mogelijk, meestal binnen twee werkdagen.\n\nHartelijke groet,\nLida Thiry",
    },
    citaat_kop: { soort: "tekst", label: "Regel boven het geciteerde bericht", standaard: "Je bericht:" },
  },
});

export const CONTACT_ANTWOORDMAIL = sectie({
  sleutel: "contact.antwoordmail",
  titel: "Antwoordmail",
  uitleg:
    "De mail waarmee je vanuit Beheer → Berichten een bericht beantwoordt. Je eigen antwoord staat bovenaan; daaronder het oorspronkelijke bericht en de voettekst.",
  variabelen: {
    naam: "de naam van de afzender",
    onderwerp: "het onderwerp van het oorspronkelijke bericht (of ‘je bericht’)",
    datum: "de datum van het oorspronkelijke bericht",
  },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp van de mail", standaard: "Re: {onderwerp}" },
    citaat_kop: { soort: "tekst", label: "Regel boven het geciteerde bericht", standaard: "Op {datum} schreef {naam}:" },
    voettekst: {
      soort: "tekstvak",
      label: "Voettekst",
      regels: 2,
      standaard:
        "Je ontvangt deze mail als antwoord op je bericht via het contactformulier van Lida Thiry Imago & Kledingadvies. Je kunt gewoon op deze mail reageren.",
    },
  },
});

export const CONTACT: Groep = {
  sleutel: "contact",
  titel: "Contact",
  omschrijving: "Het contactformulier, de ontvangstbevestiging aan de afzender en de antwoordmail vanuit Berichten.",
  secties: [CONTACT_FORMULIER, CONTACT_BEVESTIGMAIL, CONTACT_ANTWOORDMAIL],
};
