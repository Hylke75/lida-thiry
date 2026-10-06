// Beheerbare teksten rond afspraken: het boekingsblok (/afspraak en het blok
// {afspraak} op een pagina), de pagina met de persoonlijke afspraaklink en de
// mails aan de klant. De meldingen aan de beheerder zijn vaste tekst.

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";

const MAIL_VARIABELEN = {
  naam: "naam van de klant",
  soort: "soort afspraak, bijv. ‘Kleuradvies’",
  datum: "datum, bijv. ‘maandag 5 oktober 2026’",
  tijd: "begintijd, bijv. ‘14:30’",
  eindtijd: "eindtijd, bijv. ‘16:00’",
  locatie: "locatie van de afspraak (of ‘online’)",
} as const;

export const AFSPRAKEN_BOEKEN = sectie({
  sleutel: "afspraken.boeken",
  titel: "Afspraak maken (formulier)",
  uitleg:
    "Het boekingsformulier op /afspraak en waar je {afspraak} op een eigen regel in een pagina zet (Beheer → Pagina's).",
  variabelen: { bedrag: "het bedrag van de aanbetaling (alleen in de uitleg bij een aanbetaling)" },
  velden: {
    bovenschrift: {
      soort: "tekst",
      label: "Klein label boven het formulier (op /afspraak)",
      max: 80,
      standaard: "Persoonlijk advies",
    },
    paginakop: {
      soort: "tekst",
      label: "Paginatitel voor schermlezers (op /afspraak)",
      uitleg: "Niet zichtbaar; schermlezers en zoekmachines gebruiken hem als hoofdkop van de pagina.",
      max: 80,
      standaard: "Afspraak maken",
    },
    titel: { soort: "tekst", label: "Titel", standaard: "Maak een afspraak" },
    intro: {
      soort: "tekstvak",
      label: "Inleiding",
      regels: 3,
      standaard: "Kies hieronder wat voor afspraak je wilt maken, en daarna een dag en tijd die jou goed uitkomen.",
    },
    stap_soort: { soort: "tekst", label: "Stap 1: kop", standaard: "Waarvoor wil je langskomen?" },
    stap_datum: { soort: "tekst", label: "Stap 2: kop", standaard: "Kies een dag" },
    stap_tijd: { soort: "tekst", label: "Stap 3: kop", standaard: "Kies een tijd" },
    stap_gegevens: { soort: "tekst", label: "Stap 4: kop", standaard: "Je gegevens" },
    geen_soorten: {
      soort: "tekstvak",
      label: "Als er (nog) niets te boeken is",
      regels: 2,
      standaard: "Online een afspraak maken is op dit moment niet mogelijk. Neem gerust contact met me op.",
    },
    geen_soorten_titel: {
      soort: "tekst",
      label: "Op /afspraak als er niets te boeken is: titel",
      uitleg: "Zolang er geen actieve afspraaksoort is, toont /afspraak deze titel, de tekst hierboven en een knop naar contact.",
      max: 120,
      standaard: "Persoonlijk advies",
    },
    geen_soorten_knop: {
      soort: "tekst",
      label: "Op /afspraak als er niets te boeken is: knoptekst (leeg = geen knop)",
      max: 60,
      standaard: "Stel je vraag",
    },
    geen_soorten_link: {
      soort: "tekst",
      label: "Op /afspraak als er niets te boeken is: link van de knop",
      uitleg: "Bijv. /contact. Bestaat die pagina (nog) niet, dan staat er geen knop.",
      max: 200,
      standaard: "/contact",
    },
    geen_soorten_test: {
      soort: "tekst",
      label: "Op /afspraak als er niets te boeken is: tekst van de link naar de figuurtest (leeg = geen link)",
      max: 80,
      standaard: "Of begin zelf met de online figuurtest",
    },
    geen_tijden: {
      soort: "tekstvak",
      label: "Als er geen tijden vrij zijn",
      regels: 2,
      standaard: "Er zijn op dit moment geen tijden vrij voor deze afspraak. Probeer het later nog eens of neem contact met me op.",
    },
    naam_label: { soort: "tekst", label: "Veld: naam", max: 60, standaard: "Naam" },
    email_label: { soort: "tekst", label: "Veld: e-mailadres", max: 60, standaard: "E-mailadres" },
    telefoon_label: { soort: "tekst", label: "Veld: telefoonnummer", max: 60, standaard: "Telefoonnummer (optioneel)" },
    opmerking_label: { soort: "tekst", label: "Label bij het opmerkingveld", standaard: "Wil je alvast iets kwijt? (optioneel)" },
    privacy: {
      soort: "opmaak",
      label: "Akkoord met de privacyverklaring (naast het vinkje)",
      uitleg: OPMAAK_UITLEG,
      regels: 2,
      max: 1_000,
      standaard: "Ik ga akkoord met de verwerking van mijn gegevens volgens de [privacyverklaring](/privacy).",
    },
    aanbetaling_uitleg: {
      soort: "tekstvak",
      label: "Uitleg bij een aanbetaling",
      uitleg: "Verschijnt bij afspraken met een aanbetaling, vlak boven de knop. {bedrag} = het bedrag.",
      regels: 2,
      standaard:
        "Voor deze afspraak vraag ik een aanbetaling van {bedrag}. Je betaalt via iDEAL of een andere betaalmethode; daarna is je afspraak definitief.",
    },
    knop: { soort: "tekst", label: "Knoptekst (zonder aanbetaling)", max: 60, standaard: "Afspraak bevestigen" },
    knop_betalen: { soort: "tekst", label: "Knoptekst (met aanbetaling)", max: 60, standaard: "Bevestigen en aanbetalen" },
    knop_bezig: { soort: "tekst", label: "Knoptekst tijdens het versturen", max: 60, standaard: "Bezig…" },
    succes_titel: { soort: "tekst", label: "Titel na boeken", standaard: "Je afspraak staat!" },
    succes: {
      soort: "tekstvak",
      label: "Melding na boeken",
      regels: 2,
      standaard: "Je ontvangt een bevestiging per e-mail, met een agenda-uitnodiging en een link om je afspraak te bekijken of te annuleren.",
    },
    succes_aanvraag: {
      soort: "tekstvak",
      label: "Melding na boeken (als je afspraken handmatig bevestigt)",
      regels: 2,
      standaard: "Bedankt voor je aanvraag! Ik bevestig je afspraak zo snel mogelijk per e-mail.",
    },
    bezet: {
      soort: "tekst",
      label: "Melding als de tijd net door iemand anders is gekozen",
      standaard: "Deze tijd is helaas net door iemand anders gekozen. Kies een andere tijd.",
    },
    fout: {
      soort: "tekst",
      label: "Foutmelding",
      standaard: "Het boeken is niet gelukt. Probeer het over een paar minuten opnieuw.",
    },
  },
});

export const AFSPRAKEN_PAGINA = sectie({
  sleutel: "afspraken.pagina",
  titel: "Pagina ‘Je afspraak’ (persoonlijke link)",
  uitleg: "De pagina achter de link in de bevestigingsmail, waar de klant de afspraak ziet en kan annuleren.",
  variabelen: {
    uren: "hoeveel uur vooraf annuleren nog kan (de instelling ‘minimaal vooraf’)",
    status: "de status van de afspraak, bijv. ‘Bevestigd’ (alleen in de statusregel)",
  },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Persoonlijk advies" },
    titel: { soort: "tekst", label: "Titel", standaard: "Je afspraak" },
    status: { soort: "tekst", label: "Statusregel onder de titel", max: 80, standaard: "Status: {status}" },
    label_afspraak: { soort: "tekst", label: "Overzicht: soort afspraak", max: 40, standaard: "Afspraak" },
    label_datum: { soort: "tekst", label: "Overzicht: datum", max: 40, standaard: "Datum" },
    label_tijd: { soort: "tekst", label: "Overzicht: tijd", max: 40, standaard: "Tijd" },
    label_locatie: { soort: "tekst", label: "Overzicht: locatie", max: 40, standaard: "Locatie" },
    online: { soort: "tekst", label: "Locatie bij een online afspraak (zonder eigen locatie)", max: 60, standaard: "Online" },
    label_aanbetaling: { soort: "tekst", label: "Overzicht: aanbetaling", max: 40, standaard: "Aanbetaling" },
    betaald: { soort: "tekst", label: "Achter de aanbetaling als die betaald is (tussen haakjes)", max: 40, standaard: "betaald" },
    label_naam: { soort: "tekst", label: "Overzicht: naam", max: 40, standaard: "Naam" },
    betaling_bezig: {
      soort: "tekstvak",
      label: "Terwijl de betaling wordt verwerkt",
      regels: 2,
      standaard: "We wachten nog op de bevestiging van je betaling. Dit duurt meestal maar even; deze pagina ververst vanzelf.",
    },
    betaling_mislukt: {
      soort: "tekstvak",
      label: "Als de betaling niet is gelukt",
      regels: 2,
      standaard: "Je betaling is niet gelukt of afgebroken, daarom is de afspraak niet doorgegaan. Je kunt opnieuw een afspraak maken.",
    },
    aangevraagd: {
      soort: "tekstvak",
      label: "Bij een aanvraag die nog bevestigd moet worden",
      regels: 2,
      standaard: "Je aanvraag is binnen. Je ontvangt een e-mail zodra ik de afspraak heb bevestigd.",
    },
    annuleren_uitleg: {
      soort: "tekstvak",
      label: "Uitleg bij annuleren",
      regels: 2,
      standaard: "Kun je toch niet? Annuleer je afspraak dan uiterlijk {uren} uur van tevoren, dan komt de tijd weer vrij voor een ander.",
    },
    annuleren_knop: { soort: "tekst", label: "Knop annuleren", max: 60, standaard: "Afspraak annuleren" },
    te_laat: {
      soort: "tekstvak",
      label: "Als annuleren online niet meer kan",
      regels: 2,
      standaard: "Online annuleren kan tot {uren} uur van tevoren. Neem contact met me op als je toch niet kunt.",
    },
    geannuleerd: {
      soort: "tekstvak",
      label: "Na annuleren",
      regels: 2,
      standaard: "Deze afspraak is geannuleerd. Wil je een nieuwe afspraak maken? Dat kan via de knop hieronder.",
    },
    agenda_knop: { soort: "tekst", label: "Knop ‘Zet in je agenda’", max: 60, standaard: "Zet in je agenda" },
    nieuwe_knop: { soort: "tekst", label: "Knop ‘Nieuwe afspraak maken’ (na annuleren)", max: 60, standaard: "Nieuwe afspraak maken" },
    bevestig_vraag: {
      soort: "tekst",
      label: "Vraag na klikken op annuleren",
      max: 160,
      standaard: "Weet je het zeker? De afspraak wordt direct geannuleerd.",
    },
    bevestig_knop: { soort: "tekst", label: "Knop om het annuleren te bevestigen", max: 60, standaard: "Ja, annuleer mijn afspraak" },
    fout_te_laat: {
      soort: "tekst",
      label: "Foutmelding: annuleren kan niet meer",
      max: 160,
      standaard: "Online annuleren kan niet meer.",
    },
    fout_annuleren: {
      soort: "tekst",
      label: "Foutmelding: annuleren mislukt",
      max: 160,
      standaard: "Annuleren is niet gelukt. Probeer het later opnieuw.",
    },
  },
});

export const AFSPRAKEN_BEVESTIGMAIL = sectie({
  sleutel: "afspraken.bevestigmail",
  titel: "Bevestiging van de afspraak",
  uitleg:
    "Gaat naar de klant zodra de afspraak vaststaat (direct, of na de aanbetaling of jouw bevestiging). Onder de tekst staan automatisch de details; het agendabestand (.ics) gaat als bijlage mee.",
  variabelen: MAIL_VARIABELEN,
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Je afspraak op {datum} om {tijd} is bevestigd" },
    kop: { soort: "tekst", label: "Kop", standaard: "Tot ziens op {datum}!" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard:
        "Beste {naam},\n\nFijn dat je een afspraak hebt gemaakt. Hieronder staan de details; in de bijlage vind je een agenda-uitnodiging.\n\nHartelijke groet,\nLida Thiry",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Bekijk of annuleer je afspraak" },
    na_knop: {
      soort: "opmaak",
      label: "Tekst onder de knop",
      uitleg: OPMAAK_UITLEG,
      regels: 2,
      standaard: "Kun je toch niet? Annuleer dan op tijd via de knop, dan komt de tijd weer vrij voor een ander.",
    },
  },
});

export const AFSPRAKEN_AANVRAAGMAIL = sectie({
  sleutel: "afspraken.aanvraagmail",
  titel: "Ontvangstbevestiging van een aanvraag",
  uitleg: "Alleen als je afspraken handmatig bevestigt: de klant krijgt deze mail direct na het aanvragen.",
  variabelen: MAIL_VARIABELEN,
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Je aanvraag voor {datum} om {tijd}" },
    kop: { soort: "tekst", label: "Kop", standaard: "Bedankt voor je aanvraag" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard:
        "Beste {naam},\n\nBedankt voor je aanvraag. Ik bekijk hem zo snel mogelijk en stuur je een bevestiging zodra de afspraak vaststaat.\n\nHartelijke groet,\nLida Thiry",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Bekijk je aanvraag" },
  },
});

export const AFSPRAKEN_HERINNERINGMAIL = sectie({
  sleutel: "afspraken.herinneringmail",
  titel: "Herinnering (een dag van tevoren)",
  uitleg: "Gaat de dag vóór de afspraak naar de klant (bij de nachtelijke controle).",
  variabelen: MAIL_VARIABELEN,
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Herinnering: morgen om {tijd} je afspraak" },
    kop: { soort: "tekst", label: "Kop", standaard: "Tot morgen!" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard: "Beste {naam},\n\nEen korte herinnering aan je afspraak van morgen. Ik kijk ernaar uit!\n\nHartelijke groet,\nLida Thiry",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Bekijk je afspraak" },
  },
});

export const AFSPRAKEN_ANNULEERMAIL = sectie({
  sleutel: "afspraken.annuleermail",
  titel: "Annulering",
  uitleg:
    "Gaat naar de klant als de afspraak is geannuleerd (door de klant zelf, of door jou vanuit het beheer). Een eventuele reden komt onder de tekst.",
  variabelen: MAIL_VARIABELEN,
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Je afspraak op {datum} is geannuleerd" },
    kop: { soort: "tekst", label: "Kop", standaard: "Je afspraak is geannuleerd" },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      uitleg: OPMAAK_UITLEG,
      regels: 6,
      standaard:
        "Beste {naam},\n\nJe afspraak ({soort}) op {datum} om {tijd} is geannuleerd. Heb je een aanbetaling gedaan, dan neem ik contact met je op over het terugbetalen.\n\nHartelijke groet,\nLida Thiry",
    },
    reden_kop: { soort: "tekst", label: "Regel boven de reden", standaard: "Toelichting:" },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Maak een nieuwe afspraak" },
  },
});

export const AFSPRAKEN: Groep = {
  sleutel: "afspraken",
  titel: "Afspraken",
  omschrijving: "Het boekingsformulier, de pagina ‘Je afspraak’ en de mails rond afspraken (bevestiging, herinnering, annulering).",
  bekijkUrl: "/afspraak",
  secties: [
    AFSPRAKEN_BOEKEN,
    AFSPRAKEN_PAGINA,
    AFSPRAKEN_BEVESTIGMAIL,
    AFSPRAKEN_AANVRAAGMAIL,
    AFSPRAKEN_HERINNERINGMAIL,
    AFSPRAKEN_ANNULEERMAIL,
  ],
};
