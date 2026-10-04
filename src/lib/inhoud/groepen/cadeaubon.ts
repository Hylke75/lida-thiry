// Beheerbare teksten rond het kopen van een cadeaubon: de pagina /cadeaubon, de
// bedankpagina en de twee e-mails (de bon zelf en de bevestiging aan de koper).
// De vaste onderdelen (de bon als kader, bedragen, code) staan in src/lib/email-html.ts.

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](/pagina) voor opmaak.";

export const CADEAUBON_PAGINA = sectie({
  sleutel: "cadeaubon.pagina",
  titel: "Cadeaubonpagina",
  uitleg: "De pagina /cadeaubon met het bestelformulier voor een cadeaubon.",
  variabelen: { prijs: "de prijs van één test, bijv. € 49,00" },
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Geef een cadeaubon" },
    intro: {
      soort: "opmaak",
      label: "Inleiding",
      uitleg: OPMAAK_UITLEG,
      regels: 4,
      standaard:
        "Ken je iemand die wel wat hulp kan gebruiken bij het kiezen van kleding die écht flatteert? Geef de online kledingadviestest cadeau. Je kiest zelf het bedrag en of wij de bon direct naar de ontvanger mailen, eventueel op een datum naar keuze.",
    },
    prijsKeuze: { soort: "tekst", label: "Keuze: bedrag van één test", standaard: "Eén complete test ({prijs})" },
    bedragUitleg: {
      soort: "tekstvak",
      label: "Uitleg onder de bedragen",
      regels: 2,
      standaard:
        "De bon is één keer te gebruiken bij het bestellen van de test. Is de bon minder waard dan de test, dan betaalt de ontvanger het verschil bij.",
    },
    akkoordVoorwaarden: {
      soort: "opmaak",
      label: "Vinkje: akkoord met voorwaarden en privacy",
      regels: 2,
      max: 1_000,
      standaard:
        "Ik ga akkoord met de [voorwaarden](/voorwaarden) en de [privacyverklaring](/privacy). De bon is 12 maanden geldig en één keer te gebruiken; een eventueel restbedrag vervalt.",
    },
    knop: { soort: "tekst", label: "Knop naar de betaling", standaard: "Naar betaling" },
    knopBezig: { soort: "tekst", label: "Knop tijdens het doorsturen", standaard: "Bezig…" },
    foutAlgemeen: { soort: "tekst", label: "Foutmelding als er iets misgaat", standaard: "Er ging iets mis." },
    foutVerbinding: {
      soort: "tekst",
      label: "Foutmelding als de verbinding mislukt",
      standaard: "Kon niet doorgaan. Probeer het opnieuw.",
    },
    geenBetaling: {
      soort: "tekstvak",
      label: "Melding als er nog geen prijs is ingesteld",
      regels: 2,
      standaard: "Cadeaubonnen zijn op dit moment nog niet te koop. Kom binnenkort terug.",
    },
  },
});

export const CADEAUBON_BEDANKT = sectie({
  sleutel: "cadeaubon.bedankt",
  titel: "Bedankpagina na het betalen",
  variabelen: {
    ontvanger: "naam van de ontvanger",
    datum: "de geplande verzenddatum, bijv. 12 oktober 2026",
  },
  velden: {
    titel: { soort: "tekst", label: "Titel (betaald)", standaard: "Bedankt voor je cadeaubon!" },
    tekstKoper: {
      soort: "tekstvak",
      label: "Tekst als de bon naar de koper gaat",
      regels: 3,
      standaard: "Je betaling is ontvangen. De cadeaubon staat in je mailbox, met de bon als PDF om te printen of door te sturen.",
    },
    tekstOntvanger: {
      soort: "tekstvak",
      label: "Tekst als de bon direct naar de ontvanger is gestuurd",
      regels: 3,
      standaard: "Je betaling is ontvangen en de cadeaubon is naar {ontvanger} gestuurd. Je krijgt zelf een bevestiging met de factuur.",
    },
    tekstGepland: {
      soort: "tekstvak",
      label: "Tekst als de bon later naar de ontvanger gaat",
      regels: 3,
      standaard: "Je betaling is ontvangen. We sturen de cadeaubon op {datum} naar {ontvanger}. Je krijgt zelf nu al een bevestiging met de factuur.",
    },
    verwerkenTitel: { soort: "tekst", label: "Titel (betaling wordt verwerkt)", standaard: "We verwerken je betaling" },
    verwerkenTekst: {
      soort: "tekstvak",
      label: "Tekst (betaling wordt verwerkt)",
      regels: 2,
      standaard: "Zodra de betaling is bevestigd, sturen we de cadeaubon. Dit duurt meestal maar een paar seconden.",
    },
    misluktTitel: { soort: "tekst", label: "Titel (betaling niet gelukt)", standaard: "Betaling niet gelukt" },
    misluktTekst: {
      soort: "tekstvak",
      label: "Tekst (betaling niet gelukt)",
      regels: 2,
      standaard: "Je betaling is niet afgerond; er is niets afgeschreven. Probeer het gerust opnieuw.",
    },
    misluktKnop: { soort: "tekst", label: "Knoptekst (betaling niet gelukt)", standaard: "Opnieuw proberen" },
  },
});

export const CADEAUBON_MAIL = sectie({
  sleutel: "cadeaubon.mail",
  titel: "E-mail met de cadeaubon",
  uitleg:
    "De mail met de bon zelf (met de bon als PDF in de bijlage). Onder de tekst staat automatisch de bon met bedrag, code, geldigheid en de persoonlijke boodschap.",
  variabelen: {
    koper: "naam van de koper",
    ontvanger: "naam van de ontvanger (of ‘daar’ als die niet is ingevuld)",
    bedrag: "waarde van de bon, bijv. € 35,00",
    code: "de code van de bon",
    geldig_tot: "laatste geldigheidsdag, bijv. 4 oktober 2027",
  },
  velden: {
    onderwerpOntvanger: {
      soort: "tekst",
      label: "Onderwerp (aan de ontvanger)",
      standaard: "{koper} geeft je een cadeaubon voor persoonlijk kledingadvies",
    },
    kopOntvanger: { soort: "tekst", label: "Kop (aan de ontvanger)", standaard: "Er is een cadeau voor je!" },
    tekstOntvanger: {
      soort: "opmaak",
      label: "Tekst (aan de ontvanger)",
      uitleg: OPMAAK_UITLEG,
      regels: 5,
      standaard:
        "Beste {ontvanger},\n\n{koper} geeft je een cadeaubon van **{bedrag}** voor de online kledingadviestest van Lida Thiry. Ontdek welk figuurtype je hebt en welke kleding jou het mooist staat.",
    },
    onderwerpKoper: { soort: "tekst", label: "Onderwerp (aan de koper)", standaard: "Je cadeaubon voor persoonlijk kledingadvies" },
    kopKoper: { soort: "tekst", label: "Kop (aan de koper)", standaard: "Hier is je cadeaubon" },
    tekstKoper: {
      soort: "opmaak",
      label: "Tekst (aan de koper)",
      uitleg: OPMAAK_UITLEG,
      regels: 5,
      standaard:
        "Beste {koper},\n\nBedankt voor je bestelling! Hieronder staat de cadeaubon van **{bedrag}**. In de bijlage vind je de bon als PDF, om te printen of door te sturen.",
    },
    gebruik: {
      soort: "opmaak",
      label: "Uitleg: zo gebruik je de bon",
      regels: 3,
      standaard:
        "**Zo gebruik je de bon:** ga naar de bestelpagina en vul de code in bij ‘Kortingscode of cadeaubon’. De bon is één keer te gebruiken en geldig tot en met {geldig_tot}.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Bestel de test met je bon" },
    boodschapLabel: { soort: "tekst", label: "Label boven de persoonlijke boodschap", standaard: "Persoonlijke boodschap" },
  },
});

export const CADEAUBON_KOPERMAIL = sectie({
  sleutel: "cadeaubon.kopermail",
  titel: "E-mail aan de koper (bon naar de ontvanger)",
  uitleg:
    "Als de bon direct naar de ontvanger gaat, krijgt de koper deze bevestiging met de factuur. Ter controle staat de bon eronder.",
  variabelen: {
    koper: "naam van de koper",
    ontvanger: "naam van de ontvanger",
    ontvanger_email: "e-mailadres van de ontvanger",
    datum: "de geplande verzenddatum, bijv. 12 oktober 2026",
  },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Bedankt voor je cadeaubon" },
    kop: { soort: "tekst", label: "Kop", standaard: "Bedankt voor je cadeaubon!" },
    tekstVerzonden: {
      soort: "opmaak",
      label: "Tekst als de bon meteen is verstuurd",
      regels: 4,
      standaard: "Beste {koper},\n\nJe cadeaubon voor {ontvanger} is zojuist naar {ontvanger_email} gestuurd.",
    },
    tekstGepland: {
      soort: "opmaak",
      label: "Tekst als de bon later wordt verstuurd",
      regels: 4,
      standaard: "Beste {koper},\n\nJe cadeaubon voor {ontvanger} wordt op **{datum}** naar {ontvanger_email} gestuurd.",
    },
    naBon: {
      soort: "opmaak",
      label: "Tekst onder de bon",
      regels: 2,
      standaard: "De factuur vind je als bijlage bij deze mail. Vragen? Beantwoord gerust deze mail.",
    },
  },
});

export const CADEAUBON: Groep = {
  sleutel: "cadeaubon",
  titel: "Cadeaubon",
  omschrijving: "De cadeaubonpagina, de bedankpagina en de e-mails met de cadeaubon.",
  bekijkUrl: "/cadeaubon",
  secties: [CADEAUBON_PAGINA, CADEAUBON_BEDANKT, CADEAUBON_MAIL, CADEAUBON_KOPERMAIL],
};
