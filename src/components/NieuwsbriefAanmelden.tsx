import type { ReactNode } from "react";
import type { SectieWaarden } from "@/lib/inhoud/schema";
import type { NIEUWSBRIEF_AANMELDEN } from "@/lib/inhoud/groepen/nieuwsbrief";
import { NieuwsbriefFormulier } from "./NieuwsbriefFormulier";

export type NieuwsbriefAanmeldTeksten = SectieWaarden<typeof NIEUWSBRIEF_AANMELDEN>;

/**
 * Het standaard aanmeldblok voor de nieuwsbrief (teksten uit Teksten →
 * Nieuwsbrief). De toestemmingstekst komt als (op de server opgemaakte) inhoud
 * mee, zodat links naar de privacyverklaring werken.
 */
export function NieuwsbriefAanmelden({
  teksten,
  toestemming,
}: {
  teksten: NieuwsbriefAanmeldTeksten;
  toestemming: ReactNode;
}) {
  return (
    <NieuwsbriefFormulier
      titel={teksten.titel}
      tekst={<p>{teksten.tekst}</p>}
      naamVeld="optioneel"
      naamLabel={teksten.naam_label}
      emailLabel={teksten.email_label}
      knop={teksten.knop}
      succes={teksten.succes}
      fout={teksten.fout}
      toestemming={toestemming}
    />
  );
}
