import { Opmaak } from "./Opmaak";
import { NieuwsbriefFormulier } from "./NieuwsbriefFormulier";
import { formulierTeksten, type Formulier, type StandaardAanmeldTeksten } from "@/lib/nieuwsbrief/formulierregels";

/**
 * Een aanmeldformulier uit Beheer → Nieuwsbrief → Formulieren, aangevuld met de
 * standaardteksten (labels, foutmelding, toestemming als het formulier er geen
 * heeft). Zonder serverafhankelijkheden: ook bruikbaar als live voorbeeld in het beheer.
 */
export function AanmeldFormulier({
  formulier,
  standaard,
  kop = "h2",
  voorbeeld = false,
}: {
  formulier: Pick<Formulier, "slug" | "titel" | "tekst" | "naam_veld" | "knop" | "succes_tekst" | "toestemming_tekst">;
  standaard: StandaardAanmeldTeksten;
  kop?: "h1" | "h2";
  voorbeeld?: boolean;
}) {
  const t = formulierTeksten(formulier, standaard);
  return (
    <NieuwsbriefFormulier
      formulier={formulier.slug}
      titel={t.titel}
      tekst={t.tekst ? <Opmaak tekst={t.tekst} /> : undefined}
      naamVeld={t.naamVeld}
      naamLabel={t.naamLabel}
      emailLabel={t.emailLabel}
      knop={t.knop}
      succes={t.succes}
      fout={t.fout}
      toestemming={<Opmaak tekst={t.toestemming} />}
      kop={kop}
      voorbeeld={voorbeeld}
    />
  );
}
