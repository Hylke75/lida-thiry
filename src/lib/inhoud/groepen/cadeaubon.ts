// Beheerbare teksten rond het kopen van een cadeaubon: de pagina /cadeaubon, de
// bedankpagina en de twee e-mails (de bon zelf en de bevestiging aan de koper).
// De vaste onderdelen (de bon als kader, bedragen, code) staan in src/lib/email-html.ts.

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](/pagina) voor opmaak.";

export const CADEAUBON_PAGINA = sectie({
  sleutel: "cadeaubon.pagina",
  titel: "Cadeaubonpagina",
  uitleg: "De pagina /cadeaubon met het bestelformulier voor een cadeaubon.",
  variabelen: {
    prijs: "de prijs van één test, bijv. € 49,00",
    max: "het hoogste bedrag voor een bon (de prijs van de test), bijv. € 49,00",
  },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Cadeaubon" },
    titel: { soort: "tekst", label: "Titel", standaard: "Geef een cadeaubon" },
    intro: {
      soort: "opmaak",
      label: "Inleiding",
      uitleg: OPMAAK_UITLEG,
      regels: 4,
      standaard:
        "Ken je iemand die wel wat hulp kan gebruiken bij het kiezen van kleding die écht flatteert? Geef de online kledingadviestest cadeau. Je kiest zelf het bedrag en of wij de bon direct naar de ontvanger mailen, eventueel op een datum naar keuze.",
    },
    terug: { soort: "tekst", label: "Link terug naar de homepage", max: 60, standaard: "← Terug" },
    bedragLegenda: { soort: "tekst", label: "Formulier: kop boven de bedragen", max: 60, standaard: "Bedrag" },
    prijsKeuze: { soort: "tekst", label: "Keuze: bedrag van één test", standaard: "Eén complete test ({prijs})" },
    anderBedrag: { soort: "tekst", label: "Keuze: ander bedrag", max: 60, standaard: "Ander bedrag" },
    eigenBedragLabel: {
      soort: "tekst",
      label: "Veld: eigen bedrag",
      standaard: "Bedrag in euro (minimaal 5, maximaal de prijs van de test: {max})",
    },
    teHoog: {
      soort: "tekst",
      label: "Melding als het eigen bedrag te hoog is",
      standaard: "Een cadeaubon is maximaal de prijs van de test ({max}).",
    },
    bedragUitleg: {
      soort: "tekstvak",
      label: "Uitleg onder de bedragen",
      regels: 2,
      standaard:
        "De bon is één keer te gebruiken bij het bestellen van de test. Is de bon minder waard dan de test, dan betaalt de ontvanger het verschil bij.",
    },
    gegevensLegenda: { soort: "tekst", label: "Formulier: kop boven je eigen gegevens", max: 60, standaard: "Jouw gegevens" },
    koperNaam: { soort: "tekst", label: "Veld: je naam", max: 60, standaard: "Je naam" },
    koperEmail: { soort: "tekst", label: "Veld: je e-mailadres", max: 60, standaard: "Je e-mailadres" },
    bezorgingLegenda: { soort: "tekst", label: "Formulier: kop boven de bezorging", max: 60, standaard: "Bezorging" },
    bezorgingKoper: {
      soort: "tekst",
      label: "Keuze: bon naar de koper",
      standaard: "Naar mij — ik geef de bon zelf (je krijgt hem ook als PDF om te printen)",
    },
    bezorgingOntvanger: { soort: "tekst", label: "Keuze: bon naar de ontvanger", standaard: "Direct per e-mail naar de ontvanger" },
    ontvangerLegenda: { soort: "tekst", label: "Formulier: kop boven de ontvanger", max: 60, standaard: "Voor wie is de bon?" },
    ontvangerNaam: { soort: "tekst", label: "Veld: naam van de ontvanger (verplicht)", max: 80, standaard: "Naam van de ontvanger" },
    ontvangerNaamOptioneel: {
      soort: "tekst",
      label: "Veld: naam van de ontvanger (als de bon naar de koper gaat)",
      max: 80,
      standaard: "Naam van de ontvanger (optioneel)",
    },
    ontvangerEmail: { soort: "tekst", label: "Veld: e-mailadres van de ontvanger", max: 80, standaard: "E-mailadres van de ontvanger" },
    later: { soort: "tekst", label: "Vinkje: later versturen", standaard: "Later versturen, op een datum naar keuze" },
    verzenddatum: { soort: "tekst", label: "Veld: verzenddatum", max: 60, standaard: "Verzenddatum" },
    boodschap: { soort: "tekst", label: "Veld: persoonlijke boodschap", max: 80, standaard: "Persoonlijke boodschap (optioneel)" },
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
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel (betaald)", max: 80, standaard: "Cadeaubon" },
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
    ontvangerReserve: {
      soort: "tekst",
      label: "In plaats van {ontvanger} als naam en e-mailadres ontbreken",
      max: 60,
      standaard: "de ontvanger",
    },
    verwerkenBovenschrift: {
      soort: "tekst",
      label: "Klein label boven de titel (betaling wordt verwerkt)",
      max: 80,
      standaard: "Even geduld",
    },
    verwerkenTitel: { soort: "tekst", label: "Titel (betaling wordt verwerkt)", standaard: "We verwerken je betaling" },
    verwerkenTekst: {
      soort: "tekstvak",
      label: "Tekst (betaling wordt verwerkt)",
      regels: 2,
      standaard: "Zodra de betaling is bevestigd, sturen we de cadeaubon. Dit duurt meestal maar een paar seconden.",
    },
    misluktBovenschrift: { soort: "tekst", label: "Klein label boven de titel (betaling niet gelukt)", max: 80, standaard: "Betaling" },
    misluktTitel: { soort: "tekst", label: "Titel (betaling niet gelukt)", standaard: "Betaling niet gelukt" },
    misluktTekst: {
      soort: "tekstvak",
      label: "Tekst (betaling niet gelukt)",
      regels: 2,
      standaard: "Je betaling is niet afgerond; er is niets afgeschreven. Probeer het gerust opnieuw.",
    },
    misluktKnop: { soort: "tekst", label: "Knoptekst (betaling niet gelukt)", standaard: "Opnieuw proberen" },
    terugLink: { soort: "tekst", label: "Link terug naar de startpagina", max: 80, standaard: "← Terug naar de startpagina" },
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
    bedrijf: "naam van de website (alleen in de regel onder de titel van de bon)",
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
    boodschapLabel: {
      soort: "tekst",
      label: "Label boven de persoonlijke boodschap",
      uitleg: "Op de bon in de mail én op de bon als PDF.",
      standaard: "Persoonlijke boodschap",
    },
    bonTitel: { soort: "tekst", label: "De bon in de mail: titel", max: 60, standaard: "Cadeaubon" },
    bonOndertitel: {
      soort: "tekst",
      label: "De bon in de mail: regel onder de titel",
      max: 120,
      standaard: "Persoonlijk kledingadvies · {bedrijf}",
    },
    bonVoor: {
      soort: "tekst",
      label: "De bon: ‘voor’ met de naam van de ontvanger",
      uitleg: "Op de bon in de mail en als PDF. Valt weg als de naam van de ontvanger ontbreekt.",
      max: 80,
      standaard: "Voor {ontvanger}",
    },
    bonVan: {
      soort: "tekst",
      label: "De bon: ‘van’ met de naam van de koper",
      uitleg: "Op de bon in de mail en als PDF.",
      max: 80,
      standaard: "van {koper}",
    },
    bonCodeLabel: { soort: "tekst", label: "De bon: label boven de code", uitleg: "Op de bon in de mail en als PDF.", max: 40, standaard: "Code" },
    bonGeldig: { soort: "tekst", label: "De bon in de mail: geldigheid", max: 120, standaard: "Geldig tot en met {geldig_tot}" },
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

export const CADEAUBON_PDF = sectie({
  sleutel: "cadeaubon.pdf",
  titel: "De cadeaubon als PDF",
  uitleg:
    "De vaste teksten op de bon als PDF (A4 liggend) die met de mail meegaat, om te printen of door te sturen. ‘Voor’, ‘van’, het label boven de code en boven de boodschap staan bij ‘E-mail met de cadeaubon’.",
  variabelen: {
    geldig_tot: "laatste geldigheidsdag, bijv. 4 oktober 2027",
    adres: "het adres van de bestelpagina, bijv. www.lidathiry.nl/bestellen",
  },
  velden: {
    titel: { soort: "tekst", label: "Titel", max: 40, standaard: "Cadeaubon" },
    ondertitel: {
      soort: "tekst",
      label: "Regel onder de titel",
      max: 120,
      standaard: "voor de online persoonlijke kledingadviestest",
    },
    geldig: {
      soort: "tekst",
      label: "Geldigheid",
      max: 160,
      standaard: "Geldig tot en met {geldig_tot} · eenmalig te gebruiken",
    },
    uitleg: {
      soort: "tekstvak",
      label: "Uitleg onderaan: zo gebruik je de bon",
      regels: 2,
      max: 400,
      standaard: "Zo gebruik je de bon: ga naar {adres} en vul de code in bij ‘Kortingscode of cadeaubon’.",
    },
  },
});

export const CADEAUBON: Groep = {
  sleutel: "cadeaubon",
  titel: "Cadeaubon",
  omschrijving: "De cadeaubonpagina, de bedankpagina, de e-mails met de cadeaubon en de bon als PDF.",
  bekijkUrl: "/cadeaubon",
  secties: [CADEAUBON_PAGINA, CADEAUBON_BEDANKT, CADEAUBON_MAIL, CADEAUBON_KOPERMAIL, CADEAUBON_PDF],
};
