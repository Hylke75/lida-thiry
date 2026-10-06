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
  weergave = "standaard",
}: {
  teksten: NieuwsbriefAanmeldTeksten;
  toestemming: ReactNode;
  /** "paneel": de homepage-variant (tekst en formulier naast elkaar). */
  weergave?: "standaard" | "paneel";
}) {
  return (
    <NieuwsbriefFormulier
      titel={teksten.titel}
      tekst={<p>{teksten.tekst}</p>}
      // Op de homepage (paneel) alleen het e-mailadres, zoals in het ontwerp; de naam is toch optioneel.
      naamVeld={weergave === "paneel" ? "verborgen" : "optioneel"}
      naamLabel={teksten.naam_label}
      emailLabel={teksten.email_label}
      knop={teksten.knop}
      succes={teksten.succes}
      fout={teksten.fout}
      toestemming={toestemming}
      weergave={weergave}
      bovenschrift={weergave === "paneel" ? teksten.bovenschrift : undefined}
    />
  );
}
