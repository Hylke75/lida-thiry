// Beheerbare teksten van de pagina /mijn-advies, waar klanten hun advies of
// testlink opnieuw per e-mail kunnen aanvragen. De mail zelf staat bij E-mails.

import { sectie, type Groep } from "../schema";

export const MIJN_ADVIES_PAGINA = sectie({
  sleutel: "mijn-advies.pagina",
  titel: "Pagina ‘Mijn advies’",
  uitleg:
    "Na het versturen ziet iedereen dezelfde bevestiging, ook als het e-mailadres onbekend is. Zo kan niemand achterhalen wie er een test heeft gedaan.",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Mijn advies opnieuw ontvangen" },
    intro: {
      soort: "opmaak",
      label: "Inleiding",
      regels: 4,
      standaard:
        "Ben je de mail met je persoonlijke advies kwijt, of wil je verder met een test die je nog niet hebt afgerond? Vul het e-mailadres in waarmee je hebt besteld. We sturen je dan een mail met nieuwe links.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Stuur mij de links" },
    knopBezig: { soort: "tekst", label: "Knop tijdens het versturen", standaard: "Bezig…" },
    bevestiging: {
      soort: "tekstvak",
      label: "Bevestiging na het versturen",
      regels: 3,
      standaard:
        "Bedankt! Als we een bestelling op dit e-mailadres vinden, ontvang je binnen een paar minuten een mail met je links. Kijk ook even in je spammap.",
    },
    foutVerbinding: {
      soort: "tekst",
      label: "Foutmelding als de verbinding mislukt",
      standaard: "Versturen lukte niet. Probeer het opnieuw.",
    },
    verwijzing: {
      soort: "tekst",
      label: "Verwijzing op de bedankpagina na het bestellen",
      standaard: "Later je advies of testlink kwijt? Vraag ze opnieuw aan via ‘Mijn advies’.",
    },
  },
});

export const MIJN_ADVIES: Groep = {
  sleutel: "mijn-advies",
  titel: "Mijn advies",
  omschrijving: "De pagina waar klanten hun advies of testlink opnieuw per e-mail aanvragen.",
  bekijkUrl: "/mijn-advies",
  secties: [MIJN_ADVIES_PAGINA],
};
