import { sectie, type Groep } from "../schema";

const UITLEG =
  "Juridische teksten: laat wijzigingen controleren door een deskundige. Gegevens tussen [blokhaken] moeten nog worden ingevuld. " +
  "Een regel met alleen {bedrijfsgegevens} toont het blok met de bedrijfsgegevens (naam, adres, e-mail, KvK- en btw-nummer) uit Beheer → Instellingen.";

const CONTACT_EMAIL = "het contact-e-mailadres (Beheer → Instellingen); zolang dat leeg is staat hier [e-mailadres]";
const BEDRIJFSGEGEVENS =
  "op een eigen regel: het blok met de bedrijfsgegevens uit Beheer → Instellingen";

const VOORWAARDEN_TEKST = `## 1. Wie zijn wij

Deze voorwaarden gelden voor de online kledingadviestest die wordt aangeboden door:

{bedrijfsgegevens}

## 2. Definities

- **Ondernemer**: Lida Thiry Imago & Kledingadvies, zoals hierboven vermeld.
- **Klant**: de natuurlijke persoon die de test bestelt, niet handelend in de uitoefening van een beroep of bedrijf.
- **Test**: de online vragenlijst waarin de klant haar lengte, lichaamsmaten en antwoorden op enkele vragen invult.
- **Advies**: het persoonlijke kledingadvies dat op basis van de test wordt opgesteld en als PDF wordt geleverd.
- **Digitale inhoud**: de test en het advies samen.

## 3. Toepasselijkheid

Deze voorwaarden zijn van toepassing op iedere bestelling van de test. Door een bestelling te plaatsen, verklaar je deze voorwaarden te hebben gelezen en ermee akkoord te gaan. De voorwaarden zijn op deze pagina te raadplegen en kunnen worden opgeslagen of geprint.

## 4. Het aanbod

Het aanbod bestaat uit eenmalige toegang tot de online test en het daarop gebaseerde persoonlijke advies in PDF-vorm. Het advies is gebaseerd op de maten en antwoorden die je zelf invult. De juistheid van het advies hangt dus mede af van de nauwkeurigheid van jouw metingen. Het advies is een stijladvies en geen medisch of anderszins professioneel advies over je gezondheid of lichaam.

## 5. Prijs en betaling

- De prijs staat vermeld op de website en op de bestelpagina. Alle prijzen zijn in euro's en **inclusief btw**. Er komen geen verzend- of andere kosten bij.
- Betaling vindt vooraf plaats via onze betaaldienstverlener **Mollie**, met de betaalmethoden die daar worden aangeboden (zoals iDEAL).
- De overeenkomst komt tot stand op het moment dat je betaling is ontvangen. Je ontvangt daarvan een bevestiging per e-mail.
- Op verzoek ontvang je een factuur. Neem daarvoor contact op via {contact_email}.

## 6. Levering

Direct na een geslaagde betaling krijg je toegang tot de test via een persoonlijke link, die je ook per e-mail ontvangt. Na het invullen van de test wordt het advies direct getoond en per e-mail aan je verstuurd. De testlink is persoonlijk en bedoeld voor eenmalig gebruik door jou; deel deze niet met anderen. Een testlink kan na verloop van tijd verlopen; neem in dat geval contact met ons op.

## 7. Herroepingsrecht

Bij aankopen op afstand heb je normaal gesproken 14 dagen bedenktijd. Voor digitale inhoud die niet op een materiële drager wordt geleverd, vervalt dit herroepingsrecht zodra de levering is begonnen, als je daar vooraf **uitdrukkelijk mee hebt ingestemd** en hebt verklaard dat je daarmee afstand doet van je herroepingsrecht (artikel 6:230p sub g BW).

Bij het bestellen vragen wij je hiervoor uitdrukkelijk toestemming via een apart aan te vinken vakje. Omdat je direct na betaling toegang krijgt tot de test, vervalt je herroepingsrecht op dat moment. Je toestemming wordt bij je bestelling vastgelegd.

## 8. Gebruik van het advies

Het advies is uitsluitend bestemd voor persoonlijk gebruik. De teksten, illustraties en de opzet van de test en het advies blijven eigendom van Lida Thiry Imago & Kledingadvies. Het is niet toegestaan deze te verveelvoudigen, openbaar te maken of commercieel te gebruiken zonder schriftelijke toestemming.

## 9. Aansprakelijkheid

Wij doen ons best om een zorgvuldig en bruikbaar advies te geven. Het advies is echter algemeen van aard binnen jouw figuurtype en gebaseerd op jouw eigen invoer. Wij zijn niet aansprakelijk voor keuzes of aankopen die je op basis van het advies maakt. Onze aansprakelijkheid is in alle gevallen beperkt tot het bedrag dat je voor de test hebt betaald, behalve bij opzet of bewuste roekeloosheid.

## 10. Klachten

Ben je niet tevreden of werkt er iets niet zoals het hoort? Laat het ons binnen een redelijke termijn weten via {contact_email}, met een duidelijke omschrijving. We reageren binnen 14 dagen. Komen we er samen niet uit, dan kun je het geschil voorleggen aan de bevoegde rechter.

## 11. Privacy

Wij gaan zorgvuldig om met je persoonsgegevens, waaronder je lichaamsmaten. Lees hierover meer in onze [privacyverklaring](/privacy).

## 12. Toepasselijk recht

Op deze voorwaarden en alle overeenkomsten met ons is Nederlands recht van toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in Nederland, onverminderd je rechten als consument.

## 13. Wijzigingen

Wij kunnen deze voorwaarden aanpassen. Op je bestelling zijn altijd de voorwaarden van toepassing die golden op het moment van bestellen.`;

const PRIVACY_TEKST = `In deze privacyverklaring lees je welke persoonsgegevens wij verwerken als je de online kledingadviestest bestelt en invult, waarom we dat doen, hoe lang we ze bewaren en welke rechten je hebt. We gaan zorgvuldig met je gegevens om en houden ons aan de Algemene verordening gegevensbescherming (AVG).

## 1. Wie is verantwoordelijk

Verwerkingsverantwoordelijke voor je gegevens is:

{bedrijfsgegevens}

## 2. Welke gegevens verwerken wij

- **Contactgegevens**: je naam en e-mailadres.
- **Factuurgegevens**: adres, postcode en plaats (als je die invult).
- **Betaalgegevens**: de status en het bedrag van je betaling en een betalingskenmerk. Je bankgegevens zelf worden verwerkt door onze betaaldienstverlener Mollie; die ontvangen wij niet.
- **Lichaamsmaten en testantwoorden**: je lengte, gewicht, lichaamsmaten (zoals schouder-, borst-, taille- en heupomvang) en je antwoorden op de vragen over je figuur.
- **Uitkomst**: het figuurtype dat uit de test komt en het advies dat daarop is gebaseerd.
- **Technische gegevens**: gegevens die nodig zijn om de website veilig te laten werken, zoals IP-adres en tijdstip in serverlogs.

## 3. Je lichaamsmaten: extra zorgvuldig

Gegevens over je lichaam zijn persoonlijk en kunnen gevoelig zijn. Daarom gaan we er extra zorgvuldig mee om:

- We gebruiken je maten **uitsluitend** om je figuurtype te bepalen en je persoonlijke advies op te stellen.
- We gebruiken ze niet voor marketing, delen ze niet met derden voor eigen doeleinden en verkopen ze nooit.
- Alleen Lida Thiry heeft via een beveiligde, met wachtwoord afgeschermde beheeromgeving toegang tot je gegevens.
- Je maten worden **{bewaartermijn_dagen} dagen** na het invullen van de test geanonimiseerd: daarna zijn ze niet meer aan jou te koppelen.

## 4. Waarvoor en op welke grondslag

- **Uitvoeren van de overeenkomst** (artikel 6 lid 1 sub b AVG): het verwerken van je bestelling en betaling, het geven van toegang tot de test, het opstellen en toesturen van je advies, en contact met je over je bestelling. Hiervoor zijn je naam, e-mailadres, maten en antwoorden nodig.
- **Wettelijke verplichting** (artikel 6 lid 1 sub c AVG): het bewaren van je bestel- en factuurgegevens voor de belastingadministratie.
- **Gerechtvaardigd belang** (artikel 6 lid 1 sub f AVG): het beveiligen van de website en het voorkomen van misbruik.

Wij nemen geen besluiten over je die uitsluitend op geautomatiseerde verwerking zijn gebaseerd en die rechtsgevolgen hebben of je anderszins in aanmerkelijke mate treffen. De test bepaalt automatisch je figuurtype, maar dat is alleen de basis voor een stijladvies.

## 5. Hoe lang bewaren we je gegevens

- **Lichaamsmaten en testantwoorden**: {bewaartermijn_dagen} dagen na het invullen van de test; daarna worden ze geanonimiseerd.
- **Bestel-, betaal- en factuurgegevens**: 7 jaar, vanwege de wettelijke fiscale bewaarplicht.
- **Serverlogs**: zo kort mogelijk, in de regel enkele weken.

## 6. Met wie delen we gegevens

We schakelen een paar zorgvuldig gekozen dienstverleners in. Zij verwerken je gegevens alleen in onze opdracht en op basis van een verwerkersovereenkomst:

- **Supabase** — database en beveiligde opslag. Je gegevens worden opgeslagen in de EU (datacenter in Frankfurt, Duitsland).
- **Mollie** (Nederland) — afhandeling van je betaling.
- **Resend** — verzenden van e-mails, zoals je testlink en je advies.
- **Vercel** — hosting van de website.

Resend en Vercel zijn Amerikaanse bedrijven. Waar gegevens buiten de Europese Economische Ruimte kunnen worden verwerkt, gebeurt dat op basis van passende waarborgen, zoals het EU-VS Data Privacy Framework of modelcontractbepalingen van de Europese Commissie.

We verstrekken je gegevens verder alleen aan anderen als we daartoe wettelijk verplicht zijn.

## 7. Cookies

Deze website gebruikt geen tracking- of advertentiecookies. We gebruiken alleen functionele cookies die nodig zijn om de website en de beveiligde beheeromgeving te laten werken.

## 8. Beveiliging

We nemen passende technische en organisatorische maatregelen om je gegevens te beschermen, zoals versleutelde verbindingen (https), toegangsbeperking tot de beheeromgeving en persoonlijke, moeilijk te raden testlinks.

## 9. Jouw rechten

Je hebt het recht om:

- **inzage** te vragen in de gegevens die we van je hebben;
- onjuiste gegevens te laten **corrigeren**;
- je gegevens te laten **verwijderen**, voor zover we ze niet wettelijk moeten bewaren;
- de verwerking te laten **beperken** of er **bezwaar** tegen te maken;
- je gegevens in een gangbaar formaat te ontvangen (**dataportabiliteit**).

Stuur je verzoek naar {contact_email}. We reageren binnen een maand. Om zeker te weten dat het verzoek van jou komt, kunnen we je vragen je identiteit te bevestigen, bijvoorbeeld door te mailen vanaf het e-mailadres waarmee je hebt besteld.

## 10. Contact en klachten

Heb je vragen over deze privacyverklaring of over hoe we met je gegevens omgaan? Neem contact op via {contact_email}. Ben je niet tevreden over hoe wij met je gegevens omgaan, dan heb je het recht een klacht in te dienen bij de [Autoriteit Persoonsgegevens](https://autoriteitpersoonsgegevens.nl). We stellen het op prijs als je eerst contact met ons opneemt, zodat we samen naar een oplossing kunnen zoeken.

## 11. Wijzigingen

We kunnen deze privacyverklaring aanpassen. De meest actuele versie staat altijd op deze pagina. Zie ook onze [algemene voorwaarden](/voorwaarden).`;

export const JURIDISCH_VOORWAARDEN = sectie({
  sleutel: "juridisch.voorwaarden",
  titel: "Algemene voorwaarden",
  uitleg: UITLEG,
  variabelen: { bedrijfsgegevens: BEDRIJFSGEGEVENS, contact_email: CONTACT_EMAIL },
  velden: {
    bijgewerkt: { soort: "tekst", label: "Laatst bijgewerkt", standaard: "[datum]" },
    tekst: { soort: "opmaak", label: "Tekst", regels: 30, standaard: VOORWAARDEN_TEKST },
  },
});

export const JURIDISCH_PRIVACY = sectie({
  sleutel: "juridisch.privacy",
  titel: "Privacyverklaring",
  uitleg: UITLEG,
  variabelen: {
    bewaartermijn_dagen:
      "het aantal dagen waarna lichaamsmaten worden geanonimiseerd (Beheer → Instellingen, bewaartermijn maten)",
    bedrijfsgegevens: BEDRIJFSGEGEVENS,
    contact_email: CONTACT_EMAIL,
  },
  velden: {
    bijgewerkt: { soort: "tekst", label: "Laatst bijgewerkt", standaard: "[datum]" },
    tekst: { soort: "opmaak", label: "Tekst", regels: 30, standaard: PRIVACY_TEKST },
  },
});

export const JURIDISCH: Groep = {
  sleutel: "juridisch",
  titel: "Voorwaarden en privacy",
  omschrijving: "De algemene voorwaarden en de privacyverklaring.",
  bekijkUrl: "/voorwaarden",
  secties: [JURIDISCH_VOORWAARDEN, JURIDISCH_PRIVACY],
};
