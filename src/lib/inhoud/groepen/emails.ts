// Beheerbare teksten van de e-mails aan klanten. De vaste onderdelen (het
// besteloverzicht, de factuurregel, de knop zelf en de reservelink) staan in
// src/lib/email-html.ts.

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";

export const EMAILS_ALGEMEEN = sectie({
  sleutel: "emails.algemeen",
  titel: "Alle e-mails",
  velden: {
    voettekst: {
      soort: "tekst",
      label: "Voettekst (onderaan elke e-mail)",
      standaard: "© Lida Thiry Imago & Kledingadvies",
    },
  },
});

export const EMAILS_BEVESTIGING = sectie({
  sleutel: "emails.bevestiging",
  titel: "Bevestiging van de bestelling (met testlink)",
  uitleg:
    "Wordt direct na de betaling verstuurd. Tussen de tekst en de knop staat automatisch het besteloverzicht (met de factuur als bijlage, als die er is).",
  variabelen: {
    naam: "naam van de klant",
    geldig_dagen: "hoeveel dagen de testlink geldig is, bijv. 30",
  },
  velden: {
    onderwerp: {
      soort: "tekst",
      label: "Onderwerp",
      standaard: "Bedankt voor je bestelling – je kledingadviestest staat klaar",
    },
    kop: { soort: "tekst", label: "Kop", standaard: "Bedankt voor je bestelling!" },
    tekst: {
      soort: "opmaak",
      label: "Tekst (boven het besteloverzicht)",
      uitleg: OPMAAK_UITLEG,
      regels: 5,
      standaard:
        "Beste {naam},\n\nWat fijn dat je de kledingadviestest hebt besteld. Je persoonlijke test staat voor je klaar. Neem er rustig de tijd voor en houd een meetlint bij de hand.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Start de test" },
    na_knop: {
      soort: "opmaak",
      label: "Tekst onder de knop",
      regels: 2,
      standaard: "Je kunt later verdergaan met dezelfde link; die is {geldig_dagen} dagen geldig.",
    },
    herroeping: {
      soort: "opmaak",
      label: "Kleine letters: herroepingsrecht",
      regels: 2,
      standaard:
        "Bij je bestelling heb je ingestemd met directe levering van de digitale inhoud en erkend dat je daarmee je herroepingsrecht verliest.",
    },
    knop_werkt_niet: {
      soort: "tekst",
      label: "Kleine letters: regel boven de reservelink",
      standaard: "Werkt de knop niet? Kopieer deze link:",
    },
  },
});

export const EMAILS_HERINNERING = sectie({
  sleutel: "emails.herinnering",
  titel: "Herinnering (test nog niet gedaan)",
  uitleg: "Wordt een paar dagen na de betaling verstuurd als de klant nog niet aan de test is begonnen.",
  variabelen: {
    naam: "naam van de klant",
    verloopdatum: "laatste dag dat de testlink geldig is, bijv. 12 oktober 2026",
    verloopzin:
      "de zin uit ‘Zin over de geldigheid’ (met de verloopdatum ingevuld); leeg als de link geen einddatum heeft",
  },
  velden: {
    onderwerp: {
      soort: "tekst",
      label: "Onderwerp",
      standaard: "Herinnering: je kledingadviestest staat nog klaar",
    },
    kop: { soort: "tekst", label: "Kop", standaard: "Je kledingadviestest wacht nog op je" },
    tekst: {
      soort: "opmaak",
      label: "Tekst (boven de knop)",
      uitleg: OPMAAK_UITLEG,
      regels: 7,
      standaard:
        "Beste {naam},\n\nEen paar dagen geleden heb je de kledingadviestest besteld, maar je bent er nog niet aan begonnen. Geen zorgen, je test staat gewoon voor je klaar!{verloopzin}\n\nHet invullen duurt ongeveer een kwartier. Pak een meetlint, zoek een rustig moment en ontdek welke kleding jouw figuur het mooist laat uitkomen.",
    },
    verloopzin: {
      soort: "tekst",
      label: "Zin over de geldigheid",
      uitleg: "Wordt op de plek van {verloopzin} gezet, met een spatie ervoor.",
      standaard: "Je link is geldig tot en met {verloopdatum}.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Start de test" },
    knop_werkt_niet: {
      soort: "tekst",
      label: "Kleine letters: regel boven de reservelink",
      standaard: "Werkt de knop niet? Kopieer deze link:",
    },
  },
});

export const EMAILS_ADVIES = sectie({
  sleutel: "emails.advies",
  titel: "Persoonlijk advies (met PDF)",
  uitleg: "Wordt verstuurd zodra de test is afgerond. Het advies zit als PDF in de bijlage; de knop opent het ook.",
  variabelen: {
    naam: "naam van de klant",
    type: "de typecode van de klant, bijv. 6H",
  },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Je persoonlijke kledingadvies staat klaar" },
    kop: { soort: "tekst", label: "Kop", standaard: "Je persoonlijke kledingadvies" },
    tekst: {
      soort: "opmaak",
      label: "Tekst (boven de knop)",
      uitleg: OPMAAK_UITLEG,
      regels: 5,
      standaard:
        "Beste {naam},\n\nJe advies is klaar! Op basis van je antwoorden is jouw type **{type}**. Je vindt je persoonlijke advies in de bijgevoegde PDF.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Bekijk je advies (PDF)" },
  },
});

export const EMAILS: Groep = {
  sleutel: "emails",
  titel: "E-mails",
  omschrijving: "De e-mails aan klanten: bevestiging met testlink, herinnering en het persoonlijke advies.",
  secties: [EMAILS_BEVESTIGING, EMAILS_HERINNERING, EMAILS_ADVIES, EMAILS_ALGEMEEN],
};
