import { sectie, type Groep } from "../schema";

export const BESTELLEN_PAGINA = sectie({
  sleutel: "bestellen.pagina",
  titel: "Bestelpagina",
  uitleg: "De kop van de bestelpagina. De prijs komt uit Beheer → Instellingen.",
  variabelen: { prijs: "de prijs inclusief valuta, bijv. € 49,00 (wordt vet en in de accentkleur getoond)" },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Online figuurtest" },
    titel: { soort: "tekst", label: "Titel", standaard: "Bestellen" },
    prijsregel: {
      soort: "tekst",
      label: "Regel met de prijs",
      standaard: "Online kledingadviestest — {prijs}",
    },
    btw: { soort: "tekst", label: "Kleine tekst achter de prijs", standaard: "(incl. btw)" },
    geenPrijs: {
      soort: "tekstvak",
      label: "Melding als er nog geen prijs is ingesteld",
      regels: 2,
      standaard: "De prijs is nog niet ingesteld, dus bestellen is nu niet mogelijk. Kom binnenkort terug.",
    },
    terug: { soort: "tekst", label: "Link terug naar de homepage", max: 60, standaard: "← Terug" },
  },
});

export const BESTELLEN_FORMULIER = sectie({
  sleutel: "bestellen.formulier",
  titel: "Bestelformulier",
  uitleg:
    "De zinnen bij de vinkjes en de knop. In de zinnen bij de vinkjes kun je **vet** en links als [voorwaarden](/voorwaarden) gebruiken; links openen in een nieuw tabblad zodat het formulier ingevuld blijft. " +
    "Beide vinkjes zijn wettelijk nodig: laat wijzigingen in deze zinnen controleren door een deskundige.",
  velden: {
    naamLabel: { soort: "tekst", label: "Veld: naam", max: 60, standaard: "Naam" },
    emailLabel: { soort: "tekst", label: "Veld: e-mailadres", max: 60, standaard: "E-mailadres" },
    adresLabel: { soort: "tekst", label: "Veld: adres", max: 60, standaard: "Adres" },
    postcodeLabel: { soort: "tekst", label: "Veld: postcode", max: 60, standaard: "Postcode" },
    plaatsLabel: { soort: "tekst", label: "Veld: plaats", max: 60, standaard: "Plaats" },
    kortingscodeLabel: {
      soort: "tekst",
      label: "Veld: kortingscode of cadeaubon",
      max: 80,
      standaard: "Kortingscode of cadeaubon (optioneel)",
    },
    akkoordVoorwaarden: {
      soort: "opmaak",
      label: "Vinkje: akkoord met voorwaarden en privacy",
      regels: 2,
      max: 1_000,
      standaard: "Ik ga akkoord met de [voorwaarden](/voorwaarden) en de [privacyverklaring](/privacy).",
    },
    akkoordLevering: {
      soort: "opmaak",
      label: "Vinkje: directe levering en herroepingsrecht",
      regels: 2,
      max: 1_000,
      standaard:
        "Ik ga ermee akkoord dat de digitale inhoud direct wordt geleverd en dat ik daarmee mijn herroepingsrecht verlies.",
    },
    knop: { soort: "tekst", label: "Knop naar de betaling", standaard: "Naar betaling" },
    knopBezig: { soort: "tekst", label: "Knop tijdens het doorsturen", standaard: "Bezig…" },
    foutAlgemeen: {
      soort: "tekst",
      label: "Foutmelding als er iets misgaat",
      standaard: "Er ging iets mis.",
    },
    foutVerbinding: {
      soort: "tekst",
      label: "Foutmelding als de verbinding mislukt",
      standaard: "Kon niet doorgaan. Probeer het opnieuw.",
    },
  },
});

export const BESTELLEN_BETAALD = sectie({
  sleutel: "bestellen.betaald",
  titel: "Bedankpagina: betaling gelukt",
  uitleg: "Na een geslaagde betaling. De knop leidt naar de persoonlijke test van de klant.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Betaling gelukt" },
    titel: { soort: "tekst", label: "Titel", standaard: "Bedankt voor je bestelling!" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard:
        "Je betaling is ontvangen. Je kunt de test meteen starten. We hebben je de link ook gemaild, zodat je later verder kunt gaan.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Start de test →" },
    geenLink: {
      soort: "tekstvak",
      label: "Tekst als de testlink hier niet (meer) wordt getoond",
      uitleg: "De testlink staat alleen kort na het betalen op deze pagina; daarna verwijst deze tekst naar de mail.",
      regels: 2,
      standaard: "Je persoonlijke link naar de test staat in de bevestigingsmail. Kijk ook even in je spammap.",
    },
    terugLink: {
      soort: "tekst",
      label: "Link terug naar de startpagina",
      uitleg: "Onderaan de bedankpagina, ook als de betaling nog wordt verwerkt of niet is gelukt.",
      max: 80,
      standaard: "← Terug naar de startpagina",
    },
  },
});

export const BESTELLEN_VERWERKEN = sectie({
  sleutel: "bestellen.verwerken",
  titel: "Bedankpagina: betaling wordt verwerkt",
  uitleg: "Zolang de betaling nog niet is bevestigd. De pagina ververst zichzelf.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Even geduld" },
    titel: { soort: "tekst", label: "Titel", standaard: "We verwerken je betaling" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard:
        "Zodra de betaling is bevestigd, verschijnt hier de knop om de test te starten. Dit duurt meestal maar een paar seconden.",
    },
  },
});

export const BESTELLEN_MISLUKT = sectie({
  sleutel: "bestellen.mislukt",
  titel: "Bedankpagina: betaling niet gelukt",
  uitleg: "Als de betaling is mislukt, afgebroken of verlopen. De knop leidt terug naar de bestelpagina.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Betaling" },
    titel: { soort: "tekst", label: "Titel", standaard: "Betaling niet gelukt" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard: "Je betaling is niet afgerond; er is niets afgeschreven. Probeer het gerust opnieuw.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Opnieuw proberen" },
  },
});

export const BESTELLEN_HERVAT = sectie({
  sleutel: "bestellen.hervat",
  titel: "Bestelling afronden (link uit de betaalherinnering)",
  uitleg: "De pagina achter de knop in de betaalherinnering. De knop maakt een nieuwe betaling aan.",
  variabelen: { naam: "naam van de klant", bedrag: "het te betalen bedrag, bijv. € 49,00" },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Je bestelling" },
    titel: { soort: "tekst", label: "Titel", standaard: "Je bestelling afronden" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard: "Hoi {naam}, je bestelling van de kledingadviestest ({bedrag}) staat nog voor je klaar. Met de knop ga je naar de betaling.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Verder naar betalen" },
    alBetaaldTitel: { soort: "tekst", label: "Titel als er al betaald is", standaard: "Deze bestelling is al betaald" },
    alBetaaldTekst: {
      soort: "tekstvak",
      label: "Tekst als er al betaald is",
      regels: 2,
      standaard: "Je hoeft niets meer te doen. De link naar je test staat in de bevestigingsmail; kwijt? Vraag hem opnieuw aan via ‘Mijn advies’.",
    },
    ongeldigTitel: { soort: "tekst", label: "Titel als de link niet (meer) werkt", standaard: "Deze link werkt niet meer" },
    ongeldigTekst: {
      soort: "tekstvak",
      label: "Tekst als de link niet (meer) werkt",
      regels: 2,
      standaard: "De link is verlopen of de bestelling kan niet meer worden afgerond. Je kunt de test gewoon opnieuw bestellen.",
    },
    opnieuwKnop: { soort: "tekst", label: "Knop naar de bestelpagina", standaard: "Opnieuw bestellen" },
    mijnAdviesKnop: { soort: "tekst", label: "Knop naar ‘Mijn advies’ (als er al betaald is)", max: 60, standaard: "Mijn advies" },
  },
});

export const BESTELLEN_FACTUUR = sectie({
  sleutel: "bestellen.factuur",
  titel: "Factuur (PDF)",
  uitleg:
    "De vaste teksten op de factuur die als PDF met de bevestigingsmail meegaat, bij de test én bij een cadeaubon. Bedrijfsnaam, adres, KvK- en btw-nummer komen uit Beheer → Instellingen. Laat de wettelijke onderdelen (factuurnummer, datum, btw) herkenbaar staan.",
  variabelen: {
    datum: "de betaaldatum, bijv. 6 oktober 2026 (alleen bij ‘voldaan’)",
    code: "de gebruikte kortingscode (alleen bij de korting)",
    procent: "het btw-percentage, bijv. 21 (alleen bij de btw-regel)",
    nummer: "het factuurnummer (alleen in de regel in de mail)",
  },
  velden: {
    titel: { soort: "tekst", label: "Titel", max: 40, standaard: "Factuur" },
    aanLabel: { soort: "tekst", label: "Label boven de gegevens van de klant", max: 40, standaard: "Factuur aan" },
    nummerLabel: { soort: "tekst", label: "Label: factuurnummer", max: 40, standaard: "Factuurnummer" },
    datumLabel: { soort: "tekst", label: "Label: factuurdatum", max: 40, standaard: "Factuurdatum" },
    omschrijvingKop: { soort: "tekst", label: "Kolomkop: omschrijving", max: 40, standaard: "Omschrijving" },
    bedragKop: { soort: "tekst", label: "Kolomkop: bedrag", max: 40, standaard: "Bedrag (incl. btw)" },
    korting: { soort: "tekst", label: "Regel: korting (zonder code)", max: 60, standaard: "Korting" },
    kortingMetCode: { soort: "tekst", label: "Regel: korting met code", max: 80, standaard: "Korting (code {code})" },
    subtotaal: { soort: "tekst", label: "Regel: subtotaal", max: 60, standaard: "Subtotaal excl. btw" },
    btw: { soort: "tekst", label: "Regel: btw", max: 60, standaard: "Btw {procent}%" },
    totaal: { soort: "tekst", label: "Regel: totaal", max: 60, standaard: "Totaal incl. btw" },
    voldaan: {
      soort: "tekstvak",
      label: "Melding ‘voldaan’ (betalingsvoorwaarden)",
      regels: 2,
      max: 500,
      standaard: "Voldaan: betaald via Mollie op {datum}. Je hoeft niets meer te betalen.",
    },
    voettekst: {
      soort: "tekst",
      label: "Extra tekst in de voettekst (leeg = niets extra)",
      uitleg: "Komt achter de bedrijfsnaam, het KvK- en het btw-nummer onderaan de factuur, bijv. een IBAN of website.",
      max: 160,
      standaard: "",
    },
    mailRegel: {
      soort: "tekst",
      label: "Regel over de factuur in de bevestigingsmail",
      uitleg: "In de mail na een bestelling of cadeaubon, als er een factuur is meegestuurd.",
      max: 200,
      standaard: "Factuurnummer {nummer} — de factuur vind je als bijlage bij deze mail.",
    },
  },
});

export const BESTELLEN: Groep = {
  sleutel: "bestellen",
  titel: "Bestellen",
  omschrijving: "De bestelpagina, het bestelformulier, de bedankpagina na het betalen en de factuur.",
  bekijkUrl: "/bestellen",
  secties: [
    BESTELLEN_PAGINA,
    BESTELLEN_FORMULIER,
    BESTELLEN_BETAALD,
    BESTELLEN_VERWERKEN,
    BESTELLEN_MISLUKT,
    BESTELLEN_HERVAT,
    BESTELLEN_FACTUUR,
  ],
};
