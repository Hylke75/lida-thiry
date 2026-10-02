import type { Metadata } from "next";
import Link from "next/link";
import { Identiteit, JuridischePagina } from "@/components/JuridischePagina";
import { leesInstelling } from "@/lib/instellingen";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Privacyverklaring",
  description:
    "Hoe Lida Thiry Imago & Kledingadvies omgaat met je persoonsgegevens en lichaamsmaten bij de online kledingadviestest.",
  alternates: { canonical: "/privacy" },
};

const STANDAARD_BEWAARTERMIJN_DAGEN = 120;

async function bewaartermijnMatenDagen(): Promise<number> {
  try {
    const waarde = Number(await leesInstelling("bewaartermijn_maten_dagen"));
    return Number.isFinite(waarde) && waarde > 0 ? Math.round(waarde) : STANDAARD_BEWAARTERMIJN_DAGEN;
  } catch {
    return STANDAARD_BEWAARTERMIJN_DAGEN;
  }
}

export default async function PrivacyPage() {
  const dagen = await bewaartermijnMatenDagen();

  return (
    <JuridischePagina titel="Privacyverklaring" bijgewerkt="[datum]">
      <p>
        In deze privacyverklaring lees je welke persoonsgegevens wij verwerken als je
        de online kledingadviestest bestelt en invult, waarom we dat doen, hoe lang we
        ze bewaren en welke rechten je hebt. We gaan zorgvuldig met je gegevens om en
        houden ons aan de Algemene verordening gegevensbescherming (AVG).
      </p>

      <h2>1. Wie is verantwoordelijk</h2>
      <p>Verwerkingsverantwoordelijke voor je gegevens is:</p>
      <Identiteit />

      <h2>2. Welke gegevens verwerken wij</h2>
      <ul>
        <li>
          <strong>Contactgegevens</strong>: je naam en e-mailadres.
        </li>
        <li>
          <strong>Factuurgegevens</strong>: adres, postcode en plaats (als je die
          invult).
        </li>
        <li>
          <strong>Betaalgegevens</strong>: de status en het bedrag van je betaling en
          een betalingskenmerk. Je bankgegevens zelf worden verwerkt door onze
          betaaldienstverlener Mollie; die ontvangen wij niet.
        </li>
        <li>
          <strong>Lichaamsmaten en testantwoorden</strong>: je lengte, gewicht,
          lichaamsmaten (zoals schouder-, borst-, taille- en heupomvang) en je
          antwoorden op de vragen over je figuur.
        </li>
        <li>
          <strong>Uitkomst</strong>: het figuurtype dat uit de test komt en het advies
          dat daarop is gebaseerd.
        </li>
        <li>
          <strong>Technische gegevens</strong>: gegevens die nodig zijn om de website
          veilig te laten werken, zoals IP-adres en tijdstip in serverlogs.
        </li>
      </ul>

      <h2>3. Je lichaamsmaten: extra zorgvuldig</h2>
      <p>
        Gegevens over je lichaam zijn persoonlijk en kunnen gevoelig zijn. Daarom gaan
        we er extra zorgvuldig mee om:
      </p>
      <ul>
        <li>
          We gebruiken je maten <strong>uitsluitend</strong> om je figuurtype te
          bepalen en je persoonlijke advies op te stellen.
        </li>
        <li>
          We gebruiken ze niet voor marketing, delen ze niet met derden voor eigen
          doeleinden en verkopen ze nooit.
        </li>
        <li>
          Alleen Lida Thiry heeft via een beveiligde, met wachtwoord afgeschermde
          beheeromgeving toegang tot je gegevens.
        </li>
        <li>
          Je maten worden <strong>{dagen} dagen</strong> na het invullen van de test
          geanonimiseerd: daarna zijn ze niet meer aan jou te koppelen.
        </li>
      </ul>

      <h2>4. Waarvoor en op welke grondslag</h2>
      <ul>
        <li>
          <strong>Uitvoeren van de overeenkomst</strong> (artikel 6 lid 1 sub b AVG):
          het verwerken van je bestelling en betaling, het geven van toegang tot de test,
          het opstellen en toesturen van je advies, en contact met je over je
          bestelling. Hiervoor zijn je naam, e-mailadres, maten en antwoorden nodig.
        </li>
        <li>
          <strong>Wettelijke verplichting</strong> (artikel 6 lid 1 sub c AVG): het
          bewaren van je bestel- en factuurgegevens voor de belastingadministratie.
        </li>
        <li>
          <strong>Gerechtvaardigd belang</strong> (artikel 6 lid 1 sub f AVG): het
          beveiligen van de website en het voorkomen van misbruik.
        </li>
      </ul>
      <p>
        Wij nemen geen besluiten over je die uitsluitend op geautomatiseerde
        verwerking zijn gebaseerd en die rechtsgevolgen hebben of je anderszins in
        aanmerkelijke mate treffen. De test bepaalt automatisch je figuurtype, maar
        dat is alleen de basis voor een stijladvies.
      </p>

      <h2>5. Hoe lang bewaren we je gegevens</h2>
      <ul>
        <li>
          <strong>Lichaamsmaten en testantwoorden</strong>: {dagen} dagen na het
          invullen van de test; daarna worden ze geanonimiseerd.
        </li>
        <li>
          <strong>Bestel-, betaal- en factuurgegevens</strong>: 7 jaar, vanwege de
          wettelijke fiscale bewaarplicht.
        </li>
        <li>
          <strong>Serverlogs</strong>: zo kort mogelijk, in de regel enkele weken.
        </li>
      </ul>

      <h2>6. Met wie delen we gegevens</h2>
      <p>
        We schakelen een paar zorgvuldig gekozen dienstverleners in. Zij verwerken je
        gegevens alleen in onze opdracht en op basis van een verwerkersovereenkomst:
      </p>
      <ul>
        <li>
          <strong>Supabase</strong> — database en beveiligde opslag. Je gegevens
          worden opgeslagen in de EU (datacenter in Frankfurt, Duitsland).
        </li>
        <li>
          <strong>Mollie</strong> (Nederland) — afhandeling van je betaling.
        </li>
        <li>
          <strong>Resend</strong> — verzenden van e-mails, zoals je testlink en je
          advies.
        </li>
        <li>
          <strong>Vercel</strong> — hosting van de website.
        </li>
      </ul>
      <p>
        Resend en Vercel zijn Amerikaanse bedrijven. Waar gegevens buiten de Europese
        Economische Ruimte kunnen worden verwerkt, gebeurt dat op basis van passende
        waarborgen, zoals het EU-VS Data Privacy Framework of
        modelcontractbepalingen van de Europese Commissie.
      </p>
      <p>
        We verstrekken je gegevens verder alleen aan anderen als we daartoe wettelijk
        verplicht zijn.
      </p>

      <h2>7. Cookies</h2>
      <p>
        Deze website gebruikt geen tracking- of advertentiecookies. We gebruiken
        alleen functionele cookies die nodig zijn om de website en de beveiligde
        beheeromgeving te laten werken.
      </p>

      <h2>8. Beveiliging</h2>
      <p>
        We nemen passende technische en organisatorische maatregelen om je gegevens te
        beschermen, zoals versleutelde verbindingen (https), toegangsbeperking tot de
        beheeromgeving en persoonlijke, moeilijk te raden testlinks.
      </p>

      <h2>9. Jouw rechten</h2>
      <p>Je hebt het recht om:</p>
      <ul>
        <li>
          <strong>inzage</strong> te vragen in de gegevens die we van je hebben;
        </li>
        <li>
          onjuiste gegevens te laten <strong>corrigeren</strong>;
        </li>
        <li>
          je gegevens te laten <strong>verwijderen</strong>, voor zover we ze niet
          wettelijk moeten bewaren;
        </li>
        <li>
          de verwerking te laten <strong>beperken</strong> of er{" "}
          <strong>bezwaar</strong> tegen te maken;
        </li>
        <li>
          je gegevens in een gangbaar formaat te ontvangen (
          <strong>dataportabiliteit</strong>).
        </li>
      </ul>
      <p>
        Stuur je verzoek naar [e-mailadres]. We reageren binnen een maand. Om zeker te
        weten dat het verzoek van jou komt, kunnen we je vragen je identiteit te
        bevestigen, bijvoorbeeld door te mailen vanaf het e-mailadres waarmee je hebt
        besteld.
      </p>

      <h2>10. Contact en klachten</h2>
      <p>
        Heb je vragen over deze privacyverklaring of over hoe we met je gegevens
        omgaan? Neem contact op via [e-mailadres]. Ben je niet tevreden over hoe wij
        met je gegevens omgaan, dan heb je het recht een klacht in te dienen bij de{" "}
        <a
          href="https://autoriteitpersoonsgegevens.nl"
          target="_blank"
          rel="noopener noreferrer"
        >
          Autoriteit Persoonsgegevens
        </a>
        . We stellen het op prijs als je eerst contact met ons opneemt, zodat we samen
        naar een oplossing kunnen zoeken.
      </p>

      <h2>11. Wijzigingen</h2>
      <p>
        We kunnen deze privacyverklaring aanpassen. De meest actuele versie staat
        altijd op deze pagina. Zie ook onze{" "}
        <Link href="/voorwaarden">algemene voorwaarden</Link>.
      </p>
    </JuridischePagina>
  );
}
