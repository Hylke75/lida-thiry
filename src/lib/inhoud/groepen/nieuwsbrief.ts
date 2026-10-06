// Beheerbare teksten rond de nieuwsbrief: het aanmeldblok op de website, de
// bevestigingsmail (dubbele opt-in), de pagina's na bevestigen en afmelden, en
// het vinkje bij het bestellen. De toestemmingsteksten worden bij elke aanmelding
// letterlijk opgeslagen als bewijs van toestemming (AVG).

import { sectie, type Groep } from "../schema";

const OPMAAK_UITLEG = "Lege regel = nieuwe alinea. Gebruik **vet** of [linktekst](https://…) voor opmaak.";
const TOESTEMMING_UITLEG =
  "Deze tekst wordt bij elke aanmelding letterlijk bewaard als bewijs van toestemming. Laat wijzigingen controleren door een deskundige.";

export const NIEUWSBRIEF_AANMELDEN = sectie({
  sleutel: "nieuwsbrief.aanmelden",
  titel: "Aanmeldblok op de website",
  uitleg: "Het blok op de homepage waarmee bezoekers zich aanmelden. Ze krijgen eerst een mail om hun aanmelding te bevestigen.",
  velden: {
    bovenschrift: {
      soort: "tekst",
      label: "Klein label boven de titel (homepage)",
      max: 80,
      standaard: "Een beetje kleur in je inbox",
    },
    titel: { soort: "tekst", label: "Titel", standaard: "Blijf geïnspireerd" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard:
        "Praktische stijltips, nieuwe artikelen en af en toe iets moois om zelf te proberen. Geen spam, en afmelden kan altijd met één klik.",
    },
    naam_label: { soort: "tekst", label: "Label bij het naamveld", standaard: "Voornaam (optioneel)" },
    email_label: { soort: "tekst", label: "Label bij het e-mailveld", standaard: "E-mailadres" },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Ja, stuur maar" },
    toestemming_tekst: {
      soort: "opmaak",
      label: "Toestemmingstekst onder het formulier",
      uitleg: TOESTEMMING_UITLEG,
      regels: 3,
      max: 1_000,
      standaard:
        "Door je aan te melden ga je ermee akkoord dat Lida Thiry Imago & Kledingadvies je de nieuwsbrief per e-mail stuurt. Je kunt je altijd afmelden via de link onderaan elke mail. Lees meer in de [privacyverklaring](/privacy).",
    },
    succes: {
      soort: "tekstvak",
      label: "Melding na aanmelden",
      regels: 2,
      standaard:
        "Bijna klaar! Check je mailbox en klik op de link in de mail om je aanmelding te bevestigen. Niets ontvangen? Kijk dan ook even in je spammap.",
    },
    fout: {
      soort: "tekst",
      label: "Foutmelding",
      standaard: "Aanmelden lukte niet. Controleer je e-mailadres en probeer het opnieuw.",
    },
  },
});

export const NIEUWSBRIEF_BEVESTIGMAIL = sectie({
  sleutel: "nieuwsbrief.bevestigmail",
  titel: "Bevestigingsmail (dubbele opt-in)",
  uitleg: "Wordt direct na het aanmelden via de website verstuurd. Pas na een klik op de knop is iemand echt aangemeld.",
  variabelen: { naam: "de voornaam die is ingevuld, of ‘daar’ als die leeg is (‘Hoi daar,’)" },
  velden: {
    onderwerp: { soort: "tekst", label: "Onderwerp", standaard: "Bevestig je aanmelding voor de nieuwsbrief" },
    kop: { soort: "tekst", label: "Kop", standaard: "Nog één klik…" },
    tekst: {
      soort: "opmaak",
      label: "Tekst (boven de knop)",
      uitleg: OPMAAK_UITLEG,
      regels: 5,
      standaard:
        "Hoi {naam},\n\nLeuk dat je je hebt aangemeld voor de nieuwsbrief van Lida Thiry Imago & Kledingadvies! Klik op de knop hieronder om je aanmelding te bevestigen.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Ja, ik meld me aan" },
    na_knop: {
      soort: "opmaak",
      label: "Kleine letters onder de knop",
      regels: 2,
      standaard: "Heb je je niet aangemeld? Dan kun je deze mail gewoon negeren; je ontvangt dan niets van ons.",
    },
    knop_werkt_niet: {
      soort: "tekst",
      label: "Kleine letters: regel boven de reservelink",
      standaard: "Werkt de knop niet? Kopieer deze link:",
    },
  },
});

export const NIEUWSBRIEF_BEVESTIGD = sectie({
  sleutel: "nieuwsbrief.bevestigd",
  titel: "Pagina na bevestigen",
  uitleg: "Wat iemand ziet na een klik op de bevestigingslink in de mail.",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Gelukt, je bent aangemeld!" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard: "Bedankt voor het bevestigen. Je ontvangt voortaan de nieuwsbrief met stijltips en inspiratie. Tot snel in je mailbox!",
    },
    ongeldig_titel: { soort: "tekst", label: "Titel bij een ongeldige link", standaard: "Deze link werkt niet (meer)" },
    ongeldig_tekst: {
      soort: "tekstvak",
      label: "Tekst bij een ongeldige link",
      regels: 2,
      standaard: "Misschien is de link niet volledig gekopieerd. Meld je anders opnieuw aan via de homepage.",
    },
  },
});

export const NIEUWSBRIEF_AFMELDEN = sectie({
  sleutel: "nieuwsbrief.afmelden",
  titel: "Afmeldpagina",
  uitleg: "De pagina achter de afmeldlink onderaan elke nieuwsbrief. Afmelden gebeurt pas na een klik op de knop.",
  velden: {
    vraag_titel: { soort: "tekst", label: "Titel", standaard: "Afmelden voor de nieuwsbrief" },
    vraag_tekst: {
      soort: "tekstvak",
      label: "Tekst boven de knop",
      regels: 2,
      standaard: "Wil je de nieuwsbrief niet meer ontvangen? Klik dan op de knop hieronder.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Afmelden" },
    afgemeld_titel: { soort: "tekst", label: "Titel na afmelden", standaard: "Je bent afgemeld" },
    afgemeld_tekst: {
      soort: "tekstvak",
      label: "Bevestiging na afmelden",
      regels: 2,
      standaard: "Je ontvangt de nieuwsbrief niet meer. Jammer dat je gaat, en bedankt voor het lezen!",
    },
    opnieuw_tekst: {
      soort: "tekstvak",
      label: "Tekst ‘toch weer aanmelden’",
      regels: 2,
      standaard: "Per ongeluk afgemeld of toch van gedachten veranderd? Dan kun je je hier meteen weer aanmelden.",
    },
    opnieuw_knop: { soort: "tekst", label: "Knop ‘toch weer aanmelden’", max: 60, standaard: "Toch weer aanmelden" },
    opnieuw_toestemming: {
      soort: "opmaak",
      label: "Toestemmingstekst bij opnieuw aanmelden",
      uitleg: TOESTEMMING_UITLEG,
      regels: 2,
      max: 1_000,
      standaard:
        "Ik wil de nieuwsbrief van Lida Thiry Imago & Kledingadvies weer per e-mail ontvangen. Afmelden kan altijd via de link onderaan elke mail.",
    },
    welkom_terug_titel: { soort: "tekst", label: "Titel na opnieuw aanmelden", standaard: "Welkom terug!" },
    welkom_terug_tekst: {
      soort: "tekstvak",
      label: "Tekst na opnieuw aanmelden",
      regels: 2,
      standaard: "Je bent weer aangemeld en ontvangt de nieuwsbrief voortaan weer.",
    },
    ongeldig_titel: { soort: "tekst", label: "Titel bij een ongeldige link", standaard: "Deze link werkt niet (meer)" },
    ongeldig_tekst: {
      soort: "tekstvak",
      label: "Tekst bij een ongeldige link",
      regels: 2,
      standaard:
        "Misschien is de link niet volledig gekopieerd. Wil je je afmelden? Stuur dan een mailtje, dan regelen we het voor je.",
    },
  },
});

export const NIEUWSBRIEF_BESTELLING = sectie({
  sleutel: "nieuwsbrief.bestelling",
  titel: "Vinkje bij het bestellen",
  uitleg:
    "Een vinkje in het bestelformulier (standaard uit) waarmee klanten zich bij hun bestelling aanmelden. " +
    "Ze worden aangemeld zodra de bestelling betaald is. " +
    TOESTEMMING_UITLEG,
  velden: {
    vinkje: {
      soort: "opmaak",
      label: "Tekst bij het vinkje",
      regels: 2,
      max: 1_000,
      standaard: "Ja, stuur mij af en toe de nieuwsbrief met stijltips en aanbiedingen (afmelden kan altijd).",
    },
  },
});

export const NIEUWSBRIEF: Groep = {
  sleutel: "nieuwsbrief",
  titel: "Nieuwsbrief",
  omschrijving:
    "Het aanmeldblok op de website, de bevestigingsmail, de pagina's na bevestigen en afmelden, en het vinkje bij het bestellen.",
  bekijkUrl: "/",
  secties: [
    NIEUWSBRIEF_AANMELDEN,
    NIEUWSBRIEF_BEVESTIGMAIL,
    NIEUWSBRIEF_BEVESTIGD,
    NIEUWSBRIEF_AFMELDEN,
    NIEUWSBRIEF_BESTELLING,
  ],
};
