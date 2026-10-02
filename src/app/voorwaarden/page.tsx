import type { Metadata } from "next";
import Link from "next/link";
import { Identiteit, JuridischePagina } from "@/components/JuridischePagina";

export const metadata: Metadata = {
  title: "Algemene voorwaarden",
  description:
    "De algemene voorwaarden voor de online kledingadviestest van Lida Thiry Imago & Kledingadvies.",
  alternates: { canonical: "/voorwaarden" },
};

export default function VoorwaardenPage() {
  return (
    <JuridischePagina titel="Algemene voorwaarden" bijgewerkt="[datum]">
      <h2>1. Wie zijn wij</h2>
      <p>
        Deze voorwaarden gelden voor de online kledingadviestest die wordt aangeboden
        door:
      </p>
      <Identiteit />

      <h2>2. Definities</h2>
      <ul>
        <li>
          <strong>Ondernemer</strong>: Lida Thiry Imago &amp; Kledingadvies, zoals
          hierboven vermeld.
        </li>
        <li>
          <strong>Klant</strong>: de natuurlijke persoon die de test bestelt, niet
          handelend in de uitoefening van een beroep of bedrijf.
        </li>
        <li>
          <strong>Test</strong>: de online vragenlijst waarin de klant haar lengte,
          lichaamsmaten en antwoorden op enkele vragen invult.
        </li>
        <li>
          <strong>Advies</strong>: het persoonlijke kledingadvies dat op basis van de
          test wordt opgesteld en als PDF wordt geleverd.
        </li>
        <li>
          <strong>Digitale inhoud</strong>: de test en het advies samen.
        </li>
      </ul>

      <h2>3. Toepasselijkheid</h2>
      <p>
        Deze voorwaarden zijn van toepassing op iedere bestelling van de test. Door een
        bestelling te plaatsen, verklaar je deze voorwaarden te hebben gelezen en
        ermee akkoord te gaan. De voorwaarden zijn op deze pagina te raadplegen en
        kunnen worden opgeslagen of geprint.
      </p>

      <h2>4. Het aanbod</h2>
      <p>
        Het aanbod bestaat uit eenmalige toegang tot de online test en het daarop
        gebaseerde persoonlijke advies in PDF-vorm. Het advies is gebaseerd op de
        maten en antwoorden die je zelf invult. De juistheid van het advies hangt dus
        mede af van de nauwkeurigheid van jouw metingen. Het advies is een
        stijladvies en geen medisch of anderszins professioneel advies over je
        gezondheid of lichaam.
      </p>

      <h2>5. Prijs en betaling</h2>
      <ul>
        <li>
          De prijs staat vermeld op de website en op de bestelpagina. Alle prijzen zijn
          in euro&apos;s en <strong>inclusief btw</strong>. Er komen geen verzend- of
          andere kosten bij.
        </li>
        <li>
          Betaling vindt vooraf plaats via onze betaaldienstverlener{" "}
          <strong>Mollie</strong>, met de betaalmethoden die daar worden aangeboden
          (zoals iDEAL).
        </li>
        <li>
          De overeenkomst komt tot stand op het moment dat je betaling is ontvangen.
          Je ontvangt daarvan een bevestiging per e-mail.
        </li>
        <li>
          Op verzoek ontvang je een factuur. Neem daarvoor contact op via [e-mailadres].
        </li>
      </ul>

      <h2>6. Levering</h2>
      <p>
        Direct na een geslaagde betaling krijg je toegang tot de test via een
        persoonlijke link, die je ook per e-mail ontvangt. Na het invullen van de test
        wordt het advies direct getoond en per e-mail aan je verstuurd. De testlink is
        persoonlijk en bedoeld voor eenmalig gebruik door jou; deel deze niet met
        anderen. Een testlink kan na verloop van tijd verlopen; neem in dat geval
        contact met ons op.
      </p>

      <h2>7. Herroepingsrecht</h2>
      <p>
        Bij aankopen op afstand heb je normaal gesproken 14 dagen bedenktijd. Voor
        digitale inhoud die niet op een materiële drager wordt geleverd, vervalt dit
        herroepingsrecht zodra de levering is begonnen, als je daar vooraf{" "}
        <strong>uitdrukkelijk mee hebt ingestemd</strong> en hebt verklaard dat je
        daarmee afstand doet van je herroepingsrecht (artikel 6:230p sub g BW).
      </p>
      <p>
        Bij het bestellen vragen wij je hiervoor uitdrukkelijk toestemming via een
        apart aan te vinken vakje. Omdat je direct na betaling toegang krijgt tot de
        test, vervalt je herroepingsrecht op dat moment. Je toestemming wordt bij je
        bestelling vastgelegd.
      </p>

      <h2>8. Gebruik van het advies</h2>
      <p>
        Het advies is uitsluitend bestemd voor persoonlijk gebruik. De teksten,
        illustraties en de opzet van de test en het advies blijven eigendom van Lida
        Thiry Imago &amp; Kledingadvies. Het is niet toegestaan deze te verveelvoudigen,
        openbaar te maken of commercieel te gebruiken zonder schriftelijke
        toestemming.
      </p>

      <h2>9. Aansprakelijkheid</h2>
      <p>
        Wij doen ons best om een zorgvuldig en bruikbaar advies te geven. Het advies
        is echter algemeen van aard binnen jouw figuurtype en gebaseerd op jouw eigen
        invoer. Wij zijn niet aansprakelijk voor keuzes of aankopen die je op basis
        van het advies maakt. Onze aansprakelijkheid is in alle gevallen beperkt tot
        het bedrag dat je voor de test hebt betaald, behalve bij opzet of bewuste
        roekeloosheid.
      </p>

      <h2>10. Klachten</h2>
      <p>
        Ben je niet tevreden of werkt er iets niet zoals het hoort? Laat het ons
        binnen een redelijke termijn weten via [e-mailadres], met een duidelijke
        omschrijving. We reageren binnen 14 dagen. Komen we er samen niet uit, dan kun
        je het geschil voorleggen aan de bevoegde rechter.
      </p>

      <h2>11. Privacy</h2>
      <p>
        Wij gaan zorgvuldig om met je persoonsgegevens, waaronder je lichaamsmaten.
        Lees hierover meer in onze <Link href="/privacy">privacyverklaring</Link>.
      </p>

      <h2>12. Toepasselijk recht</h2>
      <p>
        Op deze voorwaarden en alle overeenkomsten met ons is Nederlands recht van
        toepassing. Geschillen worden voorgelegd aan de bevoegde rechter in
        Nederland, onverminderd je rechten als consument.
      </p>

      <h2>13. Wijzigingen</h2>
      <p>
        Wij kunnen deze voorwaarden aanpassen. Op je bestelling zijn altijd de
        voorwaarden van toepassing die golden op het moment van bestellen.
      </p>
    </JuridischePagina>
  );
}
