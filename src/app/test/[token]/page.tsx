import type { Metadata } from "next";
import { TekstLink } from "@/components/site/Basis";
import { KlantKaart, KlantKop, KlantPagina } from "@/components/site/KlantPagina";
import { beoordeelToken, haalTypeTitel } from "@/lib/test-order";
import { leesMeetBeelden } from "@/lib/meetbeelden";
import { TestWizard } from "./TestWizard";
import { haalSilhouetten, silhouetVoorSleutel } from "@/lib/lichaamstypes";
import { leesInstelling } from "@/lib/instellingen";
import { EXTRA_FIGUURTYPES_SLEUTEL, extraFiguurtypesAan } from "@/lib/extra-figuurtypes";
import { TypeOnthulling } from "./TypeOnthulling";
import { leesSectie } from "@/lib/inhoud/lees";
import { vulIn } from "@/lib/inhoud/schema";
import {
  TEST_AFRONDEN,
  TEST_ALGEMEEN,
  TEST_MATEN,
  TEST_MELDINGEN,
  TEST_METEN,
  TEST_OVER_JOU,
  TEST_SILHOUET,
  TEST_UITSLAG,
  TEST_VRAGEN,
  type TestTeksten,
} from "@/lib/inhoud/groepen/test";

export const dynamic = "force-dynamic";

// Persoonlijke pagina achter de testlink: nooit in zoekmachines.
export const metadata: Metadata = { robots: { index: false, follow: false } };

function Melding({
  titel,
  tekst,
  teksten,
}: {
  titel: string;
  tekst: string;
  teksten: { bovenschrift: string; start_link: string };
}) {
  return (
    <KlantPagina midden>
      <KlantKaart accent="butter" className="flex flex-col items-center gap-6">
        <KlantKop midden bovenschrift={teksten.bovenschrift} titel={titel} className="mb-0! tablet:mb-0!">
          <p>{tekst}</p>
        </KlantKop>
        <TekstLink href="/" className="text-[16px] text-ink-soft">
          {teksten.start_link}
        </TekstLink>
      </KlantKaart>
    </KlantPagina>
  );
}

async function leesTestTeksten(): Promise<TestTeksten> {
  const [algemeen, overJou, meten, maten, silhouet, vragen, afronden, uitslag] = await Promise.all([
    leesSectie(TEST_ALGEMEEN),
    leesSectie(TEST_OVER_JOU),
    leesSectie(TEST_METEN),
    leesSectie(TEST_MATEN),
    leesSectie(TEST_SILHOUET),
    leesSectie(TEST_VRAGEN),
    leesSectie(TEST_AFRONDEN),
    leesSectie(TEST_UITSLAG),
  ]);
  return { algemeen, overJou, meten, maten, silhouet, vragen, afronden, uitslag };
}

export default async function TestPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const b = await beoordeelToken(token);

  if (b.toestand === "geldig") {
    const [teksten, meetBeelden, silhouetten, extraTypes] = await Promise.all([
      leesTestTeksten(),
      leesMeetBeelden(),
      haalSilhouetten(),
      // Een storing bij het lezen mag de test niet breken: dan geen bandmaat-vraag.
      leesInstelling(EXTRA_FIGUURTYPES_SLEUTEL).catch(() => null),
    ]);
    return (
      <TestWizard
        token={token}
        klantnaam={b.order.klantnaam}
        meetBeelden={meetBeelden}
        silhouetten={silhouetten}
        teksten={teksten}
        vraagBandmaat={extraFiguurtypesAan(extraTypes)}
      />
    );
  }

  const meldingen = await leesSectie(TEST_MELDINGEN);
  switch (b.toestand) {
    case "onbekend":
      return <Melding titel={meldingen.onbekend_titel} tekst={meldingen.onbekend_tekst} teksten={meldingen} />;
    case "verlopen":
      return <Melding titel={meldingen.verlopen_titel} tekst={meldingen.verlopen_tekst} teksten={meldingen} />;
    case "niet_betaald":
      return <Melding titel={meldingen.niet_betaald_titel} tekst={meldingen.niet_betaald_tekst} teksten={meldingen} />;
    case "al_afgerond": {
      const sleutel = b.order.toegekend_type;
      if (!sleutel) {
        return <Melding titel={meldingen.afgerond_titel} tekst={meldingen.afgerond_tekst} teksten={meldingen} />;
      }
      const [titel, silhouet, uitslag] = await Promise.all([
        haalTypeTitel(sleutel).catch(() => null),
        silhouetVoorSleutel(sleutel),
        leesSectie(TEST_UITSLAG),
      ]);
      return (
        <TypeOnthulling
          token={token}
          sleutel={sleutel}
          titel={titel}
          silhouet={silhouet}
          kop={vulIn(uitslag.kop_terug, { naam: b.order.klantnaam })}
          intro={uitslag.intro_terug}
          teksten={uitslag}
        />
      );
    }
  }
}
