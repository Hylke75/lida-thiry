import { sectie, type Groep } from "../schema";

export const BESTELLEN_PAGINA = sectie({
  sleutel: "bestellen.pagina",
  titel: "Bestelpagina",
  uitleg: "De kop van de bestelpagina. De prijs komt uit Beheer → Instellingen.",
  variabelen: { prijs: "de prijs inclusief valuta, bijv. € 49,00 (wordt vet en in de accentkleur getoond)" },
  velden: {
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
  },
});

export const BESTELLEN_FORMULIER = sectie({
  sleutel: "bestellen.formulier",
  titel: "Bestelformulier",
  uitleg:
    "De zinnen bij de vinkjes en de knop. In de zinnen bij de vinkjes kun je **vet** en links als [voorwaarden](/voorwaarden) gebruiken; links openen in een nieuw tabblad zodat het formulier ingevuld blijft. " +
    "Beide vinkjes zijn wettelijk nodig: laat wijzigingen in deze zinnen controleren door een deskundige.",
  velden: {
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
    titel: { soort: "tekst", label: "Titel", standaard: "Bedankt voor je bestelling!" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard:
        "Je betaling is ontvangen. Je kunt de test meteen starten. We hebben je de link ook gemaild, zodat je later verder kunt gaan.",
    },
    knop: { soort: "tekst", label: "Knoptekst", standaard: "Start de test →" },
  },
});

export const BESTELLEN_VERWERKEN = sectie({
  sleutel: "bestellen.verwerken",
  titel: "Bedankpagina: betaling wordt verwerkt",
  uitleg: "Zolang de betaling nog niet is bevestigd. De pagina ververst zichzelf.",
  velden: {
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

export const BESTELLEN: Groep = {
  sleutel: "bestellen",
  titel: "Bestellen",
  omschrijving: "De bestelpagina, het bestelformulier en de bedankpagina na het betalen.",
  bekijkUrl: "/bestellen",
  secties: [BESTELLEN_PAGINA, BESTELLEN_FORMULIER, BESTELLEN_BETAALD, BESTELLEN_VERWERKEN, BESTELLEN_MISLUKT],
};
