import { sectie, type Groep } from "../schema";

/** Uitleg bij afbeeldingsvelden (Beheer → Teksten). */
const BEELD_UITLEG =
  "Kies een foto uit de mediabibliotheek (bij voorkeur echte foto's, geen stockfoto's). Zonder foto staat er een rustig kleurvlak.";
const ALT_UITLEG = "Beschrijf kort wat er op de foto te zien is, voor wie de foto niet kan zien. Leeg = decoratief.";
const ACCENT_UITLEG = "Zet één kort woord tussen *sterretjes* om het als cursief koraalrood accent te tonen.";

export const WEBSITE_KOP = sectie({
  sleutel: "website.kop",
  titel: "Kop en voettekst",
  uitleg:
    "Het woordmerk, de knop rechtsboven en het standaardmenu. Pagina's met ‘in menu’ (Beheer → Pagina's) vervangen het standaardmenu; de naam zelf stel je in bij Website → Instellingen.",
  velden: {
    subregel: {
      soort: "tekst",
      label: "Kleine regel onder de naam",
      max: 60,
      standaard: "Kleur- en stijladvies",
    },
    knop: { soort: "tekst", label: "Knop rechtsboven: tekst", max: 40, standaard: "Start de figuurtest" },
    knopLink: {
      soort: "tekst",
      label: "Knop rechtsboven: link",
      uitleg: "Een pad op de site, zoals /figuurtest (de pagina over de test) of /bestellen.",
      max: 200,
      standaard: "/figuurtest",
    },
    menu: {
      soort: "lijst",
      label: "Standaardmenu",
      uitleg:
        "Wordt gebruikt zolang er geen pagina's ‘in menu’ staan. Links naar een pagina die (nog) niet gepubliceerd is, worden overgeslagen, net als /afspraak zolang er geen actieve afspraaksoort is (Beheer → Afspraken). Ook de voettekst toont deze links.",
      itemNaam: "link",
      max: 8,
      velden: {
        label: { soort: "tekst", label: "Tekst", max: 40, standaard: "" },
        link: { soort: "tekst", label: "Link (bijv. /blog)", max: 200, standaard: "" },
      },
      standaard: [
        { label: "Figuurtest", link: "/figuurtest" },
        { label: "Afspraak", link: "/afspraak" },
        { label: "Blog", link: "/blog" },
        { label: "Cadeaubon", link: "/cadeaubon" },
        { label: "Over Lida", link: "/over-mij" },
        { label: "Contact", link: "/contact" },
      ],
    },
    voetLinks: {
      soort: "lijst",
      label: "Voettekst: vaste links",
      uitleg:
        "Staan altijd in de voettekst, na het menu en de pagina's met ‘in footer’. Dubbele links worden één keer getoond; links naar een pagina die niet bestaat (en /afspraak zonder actieve afspraaksoort), worden overgeslagen.",
      itemNaam: "link",
      max: 8,
      velden: {
        label: { soort: "tekst", label: "Tekst", max: 40, standaard: "" },
        link: { soort: "tekst", label: "Link (bijv. /blog)", max: 200, standaard: "" },
      },
      standaard: [
        { label: "Figuurtest", link: "/figuurtest" },
        { label: "Blog", link: "/blog" },
        { label: "Cadeaubon", link: "/cadeaubon" },
        { label: "Mijn advies", link: "/mijn-advies" },
      ],
    },
    voetTagline: {
      soort: "tekst",
      label: "Voettekst: korte zin (leeg = geen)",
      uitleg: "Bijvoorbeeld wat je doet of voor wie, in één zin.",
      max: 160,
      standaard: "",
    },
    voetContactregel: {
      soort: "tekst",
      label: "Voettekst: regel met adres of contact (leeg = geen)",
      uitleg: "Bijvoorbeeld ‘Utrecht · info@lidathiry.nl’. Je telefoonnummer (Website → Instellingen) staat er al automatisch bij.",
      max: 160,
      standaard: "",
    },
    voetPrivacy: { soort: "tekst", label: "Voettekst: tekst van de link naar de privacyverklaring", max: 40, standaard: "Privacy" },
    voetVoorwaarden: { soort: "tekst", label: "Voettekst: tekst van de link naar de voorwaarden", max: 40, standaard: "Voorwaarden" },
    voetContact: {
      soort: "tekst",
      label: "Voettekst: tekst van de link naar contact",
      uitleg: "Alleen zichtbaar als er een gepubliceerde pagina /contact is.",
      max: 40,
      standaard: "Contact",
    },
  },
});

export const WEBSITE_HERO = sectie({
  sleutel: "website.hero",
  titel: "Bovenaan de homepage",
  uitleg: "Het eerste wat bezoekers zien: wat ze hier vinden, wat het ze oplevert en wat de volgende stap is.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Meer kleur. Minder twijfel." },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      standaard: "Ontdek welke kleding *echt* bij jouw figuur past",
    },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Met de online figuurtest ontdek je op basis van je lengte, maten en een paar vragen welk figuurtype je hebt. Je persoonlijke kledingadvies helpt je gerichter kiezen, makkelijker combineren en je meer jezelf voelen in wat je draagt.",
    },
    knop: { soort: "tekst", label: "Knoptekst", max: 60, standaard: "Start de figuurtest" },
    knopLink: {
      soort: "tekst",
      label: "Knop: link",
      uitleg: "Standaard naar de pagina over de figuurtest (/figuurtest); kan ook een anker zijn, zoals #advies voor de adviesroutes verderop.",
      max: 200,
      standaard: "/figuurtest",
    },
    tweedeLink: { soort: "tekst", label: "Tweede link: tekst (leeg = geen link)", max: 60, standaard: "Eerst kennismaken met Lida" },
    tweedeLinkAdres: { soort: "tekst", label: "Tweede link: adres", max: 200, standaard: "#over" },
    pluspunten: {
      soort: "lijst",
      label: "Pluspunten onder de knoppen",
      uitleg: "Korte, ware pluspunten (een paar woorden).",
      itemNaam: "pluspunt",
      max: 4,
      velden: { tekst: { soort: "tekst", label: "Tekst", max: 40, standaard: "" } },
      standaard: [{ tekst: "Persoonlijk advies" }, { tekst: "Gewoon vanuit huis" }, { tekst: "Direct online starten" }],
    },
    stickerTitel: { soort: "tekst", label: "Sticker op de foto: titel (leeg = geen sticker)", max: 40, standaard: "Kleding doet iets." },
    stickerTekst: {
      soort: "tekst",
      label: "Sticker op de foto: tekst",
      max: 120,
      standaard: "Met je uitstraling, je energie én je zelfvertrouwen.",
    },
    afbeelding: { soort: "afbeelding", label: "Foto (staand, ongeveer 4:5)", uitleg: BEELD_UITLEG, standaard: "" },
    afbeeldingAlt: { soort: "tekst", label: "Beschrijving van de foto", uitleg: ALT_UITLEG, max: 200, standaard: "" },
  },
});

export const WEBSITE_DIENSTEN = sectie({
  sleutel: "website.diensten",
  titel: "Adviesroutes",
  uitleg:
    "Kaarten met de manieren waarop bezoekers kunnen beginnen. Een lege prijs wordt niet getoond. Een kaart met de link /afspraak verwijst automatisch naar contact zolang er geen actieve afspraaksoort is (zie de twee velden onderaan).",
  variabelen: {
    prijs: "de prijs van de online test (uit de instellingen)",
    afspraak_vanaf: "‘vanaf’ + de laagste prijs van de afspraaksoorten (leeg als die er niet zijn)",
  },
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Waar wil je mee beginnen?" },
    titel: { soort: "tekst", label: "Titel", uitleg: ACCENT_UITLEG, standaard: "Kies wat jij nu nodig hebt" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 2,
      standaard:
        "Geen ingewikkeld traject. Je kiest wat bij jouw vraag past en krijgt concrete handvatten waar je direct iets aan hebt.",
    },
    kaarten: {
      soort: "lijst",
      label: "Kaarten",
      itemNaam: "kaart",
      max: 6,
      velden: {
        kicker: { soort: "tekst", label: "Categorie (klein, boven de titel)", max: 40, standaard: "" },
        titel: { soort: "tekst", label: "Titel", max: 90, standaard: "" },
        tekst: { soort: "tekstvak", label: "Tekst (maximaal drie regels)", regels: 2, max: 300, standaard: "" },
        prijs: { soort: "tekst", label: "Prijs (leeg = niet tonen)", max: 40, standaard: "" },
        linkTekst: { soort: "tekst", label: "Linktekst", max: 60, standaard: "" },
        link: { soort: "tekst", label: "Link (bijv. /bestellen)", max: 200, standaard: "" },
        afbeelding: { soort: "afbeelding", label: "Foto (liggend, 1,2:1)", uitleg: BEELD_UITLEG, standaard: "" },
        afbeeldingAlt: { soort: "tekst", label: "Beschrijving van de foto", uitleg: ALT_UITLEG, max: 200, standaard: "" },
        kleur: {
          soort: "tekst",
          label: "Accentkleur",
          uitleg: "coral, sage of butter (leeg = op volgorde)",
          max: 20,
          standaard: "",
        },
      },
      standaard: [
        {
          kicker: "Online figuurtest",
          titel: "Ontdek welk figuurtype jij hebt",
          tekst: "Meet jezelf op, beantwoord een paar vragen en ontvang direct je persoonlijke kledingadvies als PDF.",
          prijs: "{prijs}",
          linkTekst: "Start de figuurtest",
          link: "/figuurtest",
          kleur: "coral",
        },
        {
          kicker: "Persoonlijk advies",
          titel: "Samen kijken naar wat jou goed staat",
          tekst: "Maak een afspraak met Lida voor persoonlijk imago- en kledingadvies, afgestemd op jouw vraag.",
          prijs: "{afspraak_vanaf}",
          linkTekst: "Plan een afspraak",
          link: "/afspraak",
          kleur: "sage",
        },
        {
          kicker: "Cadeaubon",
          titel: "Geef zelfvertrouwen cadeau",
          tekst: "Geef de online figuurtest cadeau. Kies een bedrag en laat de bon direct of op een gekozen datum mailen.",
          prijs: "",
          linkTekst: "Bekijk de cadeaubon",
          link: "/cadeaubon",
          kleur: "butter",
        },
      ],
    },
    zonderAfspraakLinkTekst: {
      soort: "tekst",
      label: "Zonder afspraaksoorten: linktekst in plaats van ‘Plan een afspraak’",
      uitleg:
        "Zolang er in Beheer → Afspraken geen actieve afspraaksoort is, krijgt een kaart met de link /afspraak deze tekst en de link hieronder. Leeg = geen link.",
      max: 60,
      standaard: "Stel je vraag",
    },
    zonderAfspraakLink: {
      soort: "tekst",
      label: "Zonder afspraaksoorten: link",
      uitleg: "Bijv. /contact. Bestaat die pagina (nog) niet, dan staat er geen link op de kaart.",
      max: 200,
      standaard: "/contact",
    },
  },
});

export const WEBSITE_PROBLEEM = sectie({
  sleutel: "website.probleem",
  titel: "Herken je dit?",
  uitleg: "Het probleem van de bezoeker, en wat goed advies haar oplevert.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Herken je dit?" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      standaard: "Een volle kledingkast en tóch het gevoel dat je niets hebt om aan te trekken?",
    },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 3,
      standaard:
        "Je koopt iets nieuws, maar twijfelt thuis alsnog. Modellen vallen anders dan gehoopt en combineren kost te veel tijd. Weten wat bij jouw figuur past, maakt keuzes juist eenvoudiger.",
    },
    punten: {
      soort: "lijst",
      label: "Opsomming (met vinkjes)",
      itemNaam: "punt",
      max: 6,
      velden: { tekst: { soort: "tekst", label: "Tekst", max: 120, standaard: "" } },
      standaard: [
        { tekst: "Je weet welke snitten en lengtes jouw figuur mooi laten uitkomen" },
        { tekst: "Je koopt bewuster en voorkomt miskopen" },
        { tekst: "Je combineert sneller met wat je al hebt" },
        { tekst: "Je voelt je zekerder zonder een compleet nieuwe garderobe" },
      ],
    },
    afbeelding: { soort: "afbeelding", label: "Foto (vierkant)", uitleg: BEELD_UITLEG, standaard: "" },
    afbeeldingAlt: { soort: "tekst", label: "Beschrijving van de foto", uitleg: ALT_UITLEG, max: 200, standaard: "" },
  },
});

export const WEBSITE_STAPPEN = sectie({
  sleutel: "website.stappen",
  titel: "Zo werkt het",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Lekker overzichtelijk" },
    titel: { soort: "tekst", label: "Titel", uitleg: ACCENT_UITLEG, standaard: "Zo werkt het" },
    stappen: {
      soort: "lijst",
      label: "Stappen",
      itemNaam: "stap",
      max: 6,
      velden: {
        titel: { soort: "tekst", label: "Titel" , standaard: "" },
        tekst: { soort: "tekstvak", label: "Tekst", regels: 2, standaard: "" },
      },
      standaard: [
        {
          titel: "Bestel en betaal veilig",
          tekst: "Je rekent eenvoudig af via iDEAL of een andere betaalmethode. Direct daarna kun je beginnen.",
        },
        {
          titel: "Meet jezelf op",
          tekst: "Met een meetlint en duidelijke illustraties vul je je lengte, maten en een paar vragen over je figuur in.",
        },
        {
          titel: "Ontvang je persoonlijke advies",
          tekst: "Je krijgt meteen je figuurtype te zien en ontvangt je persoonlijke kledingadvies als PDF in je mailbox.",
        },
      ],
    },
  },
});

export const WEBSITE_FIGUURTYPES = sectie({
  sleutel: "website.figuurtypes",
  titel: "Figuurtypes (algemeen)",
  uitleg:
    "Een algemeen blok over figuurtypes, standaard verborgen (Website → Homepage). De figuurtypes zelf (namen, tekeningen, uitleg) zijn alleen voor betalende klanten en staan nooit op de openbare site; schrijf hier dus geen typenamen of -kenmerken.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Ieder lichaam is anders" },
    titel: { soort: "tekst", label: "Titel", uitleg: ACCENT_UITLEG, standaard: "Welk *figuurtype* heb jij?" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "De verhoudingen tussen je schouders, taille en heupen bepalen welke kleding jou het mooist laat uitkomen. Met de figuurtest ontdek je welk figuurtype bij jou past, met uitleg en persoonlijk advies.",
    },
    punten: {
      soort: "lijst",
      label: "Opsomming (met vinkjes)",
      itemNaam: "punt",
      max: 5,
      velden: { tekst: { soort: "tekst", label: "Tekst", max: 120, standaard: "" } },
      standaard: [
        { tekst: "Je meet jezelf thuis op met een meetlint en duidelijke uitleg" },
        { tekst: "Je ziet direct je figuurtype, met tekening en uitleg" },
        { tekst: "Je advies is afgestemd op je figuur, lengte en postuur" },
      ],
    },
    knop: { soort: "tekst", label: "Knoptekst (leeg = geen knop)", max: 60, standaard: "Ontdek jouw figuurtype" },
    knopLink: { soort: "tekst", label: "Knop: link", max: 200, standaard: "/figuurtest" },
  },
});

export const WEBSITE_ADVIES = sectie({
  sleutel: "website.advies",
  titel: "Wat zit er in je advies",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Je persoonlijke advies" },
    titel: { soort: "tekst", label: "Titel", standaard: "Wat zit er in je persoonlijke advies?" },
    intro: {
      soort: "tekstvak",
      label: "Introductie",
      regels: 3,
      standaard:
        "Je advies is geen algemeen lijstje, maar afgestemd op jouw maten en antwoorden. Je ontvangt het als overzichtelijke PDF die je kunt bewaren, printen of meenemen als je gaat winkelen.",
    },
    punten: {
      soort: "lijst",
      label: "Opsomming",
      itemNaam: "punt",
      max: 12,
      velden: { tekst: { soort: "tekst", label: "Tekst", standaard: "" } },
      standaard: [
        { tekst: "Jouw figuurtype, met uitleg over wat dat betekent voor je verhoudingen" },
        { tekst: "Welke snitten, lengtes en pasvormen jouw figuur mooi laten uitkomen" },
        { tekst: "Tips voor broeken, rokken, jurken, jasjes en tops" },
        { tekst: "Wat je beter kunt vermijden, en waarom" },
        { tekst: "Een overzicht van je eigen maten om bij het winkelen te gebruiken" },
      ],
    },
    voorbeeldLabel: {
      soort: "tekst",
      label: "Voorbeeld van de PDF: klein label",
      uitleg: "De getekende voorbeeldpagina naast de opsomming (decoratie).",
      max: 60,
      standaard: "Persoonlijk kledingadvies",
    },
    voorbeeldTitel: { soort: "tekst", label: "Voorbeeld van de PDF: titel", max: 80, standaard: "Jouw persoonlijke kledingadvies" },
    voorbeeldType: { soort: "tekst", label: "Voorbeeld van de PDF: regel onder de titel", max: 60, standaard: "Jouw figuurtype" },
    voorbeeldOnderschrift: { soort: "tekst", label: "Voorbeeld van de PDF: onderschrift", max: 60, standaard: "Voorbeeldweergave" },
  },
});

export const WEBSITE_OVER = sectie({
  sleutel: "website.over",
  titel: "Over Lida",
  uitleg:
    "Vervang de teksten tussen [vierkante haken] door je eigen verhaal. De eerste alinea staat iets groter. Gebruik hier een echte foto van Lida.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Jouw gids" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      standaard: "Niet vertellen wat ‘in’ is. Wel laten zien wat jóu goed staat.",
    },
    initialen: {
      soort: "tekst",
      label: "Initialen (in het kleurvlak zolang er geen foto is)",
      max: 4,
      standaard: "LT",
    },
    tekst: {
      soort: "opmaak",
      label: "Tekst",
      regels: 10,
      standaard: [
        "Ik ben Lida Thiry, imago- en kledingadviseur. [aan te vullen: korte introductie — achtergrond, opleiding en hoeveel jaar ervaring.]",
        "[aan te vullen: waarom je dit werk doet en wat je klanten wilt meegeven, bijvoorbeeld: “Ik geloof dat iedere vrouw zich goed kan voelen in haar kleding, als ze weet wat bij haar figuur past.”]",
        "Deze online test is gebaseerd op de methode die ik ook in mijn persoonlijke adviesgesprekken gebruik.",
      ].join("\n\n"),
    },
    knop: { soort: "tekst", label: "Knop: tekst (leeg = geen knop)", max: 60, standaard: "Meer over Lida" },
    knopLink: {
      soort: "tekst",
      label: "Knop: link",
      uitleg: "Bijv. /over-mij. Bestaat die pagina (nog) niet, dan gaat de knop naar /contact, en als die er ook niet is naar /afspraak.",
      max: 200,
      standaard: "/over-mij",
    },
    afbeelding: { soort: "afbeelding", label: "Foto van Lida (staand, 0,9:1)", uitleg: BEELD_UITLEG, standaard: "" },
    afbeeldingAlt: { soort: "tekst", label: "Beschrijving van de foto", uitleg: ALT_UITLEG, max: 200, standaard: "" },
    citaat: {
      soort: "tekst",
      label: "Citaat op het kaartje bij de foto (leeg = geen kaartje)",
      max: 160,
      standaard: "Jouw beste stijl hoeft niet nieuw te zijn. Hij moet vooral van jou voelen.",
    },
  },
});

export const WEBSITE_ERVARINGEN = sectie({
  sleutel: "website.ervaringen",
  titel: "Ervaringen van klanten",
  uitleg:
    "Goedgekeurde reviews met toestemming (Beheer → Reviews) staan automatisch vooraan; de ervaringen hieronder komen daarna. Er staan er maximaal drie, ingekort tot ongeveer 35 woorden en met alleen de voornaam. Gebruik alleen echte reacties, met toestemming van de klant. Zonder reviews en ervaringen staat er de tekst bij 'Tekst zolang er nog geen ervaringen zijn' (leeg = het blok niet tonen).",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Wat klanten ervaren" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      standaard: "Meer rust in je kast. Meer vertrouwen voor de spiegel.",
    },
    leegTekst: {
      soort: "tekst",
      label: "Tekst zolang er nog geen ervaringen zijn",
      uitleg: "Staat onder de titel zolang er geen goedgekeurde reviews of ingevulde ervaringen zijn. Leeg = het blok dan niet tonen.",
      max: 200,
      standaard: "[Ervaringen van klanten volgen]",
    },
    ervaringen: {
      soort: "lijst",
      label: "Ervaringen",
      itemNaam: "ervaring",
      max: 9,
      velden: {
        citaat: { soort: "tekstvak", label: "Citaat", regels: 3, max: 600, standaard: "" },
        naam: { soort: "tekst", label: "Naam (bijv. Anna, Utrecht)", standaard: "" },
      },
      standaard: [],
    },
  },
});

export const WEBSITE_VRAGEN = sectie({
  sleutel: "website.vragen",
  titel: "Veelgestelde vragen",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Goed om te weten" },
    titel: { soort: "tekst", label: "Titel", standaard: "Veelgestelde vragen" },
    vragen: {
      soort: "lijst",
      label: "Vragen",
      itemNaam: "vraag",
      velden: {
        vraag: { soort: "tekst", label: "Vraag", standaard: "" },
        antwoord: { soort: "tekstvak", label: "Antwoord", regels: 3, standaard: "" },
      },
      standaard: [
        {
          vraag: "Hoe lang duurt de test?",
          antwoord:
            "Reken op ongeveer 15 tot 20 minuten. Het meeste daarvan gaat zitten in het opmeten; de vragen zelf zijn zo beantwoord.",
        },
        {
          vraag: "Wat heb ik nodig?",
          antwoord:
            "Een flexibel meetlint (zo'n zacht lint van de naaidoos) en bij voorkeur iemand die je even helpt met meten. Draag dunne, nauwsluitende kleding of meet in je ondergoed: dan zijn de maten het nauwkeurigst.",
        },
        {
          vraag: "Wat krijg ik precies?",
          antwoord:
            "Na het invullen zie je direct je figuurtype. Daarnaast ontvang je een persoonlijke PDF met uitleg over je type en concreet kledingadvies: welke snitten, lengtes en pasvormen bij je passen, en wat je beter kunt laten hangen.",
        },
        {
          vraag: "Wat gebeurt er met mijn maten?",
          antwoord:
            "Je maten gebruiken we alleen om jouw advies te maken. Ze worden beveiligd opgeslagen in de EU en na een vaste termijn geanonimiseerd. Meer lees je in de privacyverklaring.",
        },
        {
          vraag: "Kan ik de test later doen of verder gaan?",
          antwoord:
            "Ja. Na je betaling ontvang je je persoonlijke testlink ook per e-mail. Zo kun je de test starten op een moment dat het jou uitkomt, bijvoorbeeld wanneer er iemand is die je kan helpen met meten.",
        },
      ],
    },
  },
});

export const WEBSITE_AFSLUITING = sectie({
  sleutel: "website.afsluiting",
  titel: "Afsluiting onderaan",
  velden: {
    titel: { soort: "tekst", label: "Titel", standaard: "Klaar om te ontdekken wat bij jou past?" },
    tekst: {
      soort: "tekstvak",
      label: "Tekst",
      regels: 2,
      standaard:
        "Pak een meetlint, vraag iemand om je te helpen en ontvang vandaag nog je persoonlijke kledingadvies.",
    },
    knop: {
      soort: "tekst",
      label: "Knoptekst (naar de test; de prijs komt er automatisch achter)",
      max: 60,
      standaard: "Start de test",
    },
    knopLink: { soort: "tekst", label: "Knop: link", max: 200, standaard: "/figuurtest" },
  },
});

export const WEBSITE_BLOG = sectie({
  sleutel: "website.blog",
  titel: "Laatste blogberichten",
  uitleg: "Blok op de homepage met de drie nieuwste blogberichten. Wordt alleen getoond als er berichten zijn.",
  velden: {
    bovenschrift: { soort: "tekst", label: "Klein label boven de titel", max: 80, standaard: "Zelf ontdekken" },
    titel: {
      soort: "tekst",
      label: "Titel",
      uitleg: ACCENT_UITLEG,
      standaard: "Praktische inspiratie zonder modedictaat",
    },
    linktekst: { soort: "tekst", label: "Linktekst naar het overzicht", max: 60, standaard: "Bekijk alle artikelen" },
    leesVerder: { soort: "tekst", label: "Linktekst op elke kaart", max: 40, standaard: "Lees verder" },
  },
});

export const WEBSITE_FOUT = sectie({
  sleutel: "website.fout",
  titel: "Foutpagina's",
  uitleg:
    "De pagina die bezoekers zien als een pagina niet (meer) bestaat, of als er onverwacht iets misgaat. Technische details worden nooit aan bezoekers getoond.",
  velden: {
    nietGevondenTitel: { soort: "tekst", label: "Pagina niet gevonden: titel", max: 120, standaard: "Deze pagina bestaat niet (meer)" },
    nietGevondenTekst: {
      soort: "tekstvak",
      label: "Pagina niet gevonden: tekst",
      regels: 3,
      max: 500,
      standaard:
        "Misschien is de pagina verhuisd of zit er een typfout in het adres. Hieronder vind je een paar plekken om verder te kijken.",
    },
    suggestiesTitel: { soort: "tekst", label: "Titel boven de suggesties", max: 80, standaard: "Misschien zoek je dit" },
    blogTitel: { soort: "tekst", label: "Titel boven de nieuwste blogberichten", max: 80, standaard: "Nieuw op de blog" },
    foutTitel: { soort: "tekst", label: "Er ging iets mis: titel", max: 120, standaard: "Er ging even iets mis" },
    foutTekst: {
      soort: "tekstvak",
      label: "Er ging iets mis: tekst",
      regels: 3,
      max: 500,
      standaard:
        "Sorry, deze pagina kon niet goed geladen worden. Probeer het nog eens; lukt het dan nog niet, kom dan later terug of ga naar de homepage.",
    },
    opnieuwKnop: { soort: "tekst", label: "Knop: opnieuw proberen", max: 40, standaard: "Opnieuw proberen" },
    homeKnop: { soort: "tekst", label: "Knop/link naar de homepage", max: 40, standaard: "Naar de homepage" },
    bovenschrift: { soort: "tekst", label: "Pagina niet gevonden: klein label boven de titel", max: 80, standaard: "Foutcode 404" },
    suggesties: {
      soort: "lijst",
      label: "Pagina niet gevonden: suggesties",
      uitleg:
        "De tegels onder ‘Misschien zoek je dit’. Een lege linktekst bij / gebruikt de tekst van de knop naar de homepage, bij /contact de naam van de contactpagina uit het menu. Een suggestie naar /contact verschijnt alleen als die pagina bestaat.",
      itemNaam: "suggestie",
      max: 8,
      velden: {
        label: { soort: "tekst", label: "Linktekst", max: 60, standaard: "" },
        uitleg: { soort: "tekst", label: "Korte uitleg", max: 160, standaard: "" },
        link: { soort: "tekst", label: "Link (bijv. /figuurtest)", max: 200, standaard: "" },
      },
      standaard: [
        { label: "", uitleg: "Lees wat de kledingadviestest je oplevert.", link: "/" },
        { label: "Doe de test", uitleg: "Ontdek je figuurtype en ontvang je persoonlijke advies.", link: "/figuurtest" },
        { label: "Blog", uitleg: "Tips en inspiratie over kleding en figuur.", link: "/blog" },
        { label: "", uitleg: "Stel je vraag rechtstreeks aan Lida.", link: "/contact" },
      ],
    },
    blogLink: { soort: "tekst", label: "Pagina niet gevonden: link naar alle blogberichten", max: 60, standaard: "Alle artikelen" },
  },
});

export const WEBSITE: Groep = {
  sleutel: "website",
  titel: "Website",
  omschrijving:
    "De kop en voettekst van de site, de teksten en foto's op de homepage (introductie, adviesroutes, stappen, Over Lida, ervaringen, blog en veelgestelde vragen) en de foutpagina's.",
  bekijkUrl: "/",
  secties: [
    WEBSITE_KOP,
    WEBSITE_HERO,
    WEBSITE_DIENSTEN,
    WEBSITE_PROBLEEM,
    WEBSITE_STAPPEN,
    WEBSITE_FIGUURTYPES,
    WEBSITE_ADVIES,
    WEBSITE_OVER,
    WEBSITE_ERVARINGEN,
    WEBSITE_BLOG,
    WEBSITE_VRAGEN,
    WEBSITE_AFSLUITING,
    WEBSITE_FOUT,
  ],
};
