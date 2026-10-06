import type { ReactNode } from "react";
import { NieuwsbriefAanmelden, type NieuwsbriefAanmeldTeksten } from "@/components/NieuwsbriefAanmelden";
import { Opmaak } from "@/components/Opmaak";
import { Container } from "./Basis";

/** Het zachte kleurverloop van het nieuwsbriefpaneel (.newsletter-inner). */
export const NIEUWSBRIEF_VERLOOP = "bg-[linear-gradient(105deg,#ffe6df,#fff4d2_53%,#e8f4e5)]";

/**
 * Het nieuwsbriefpaneel van de homepage (tekst links, formulier rechts) als losse
 * sectie onder blogpagina's. `onder` staat onder het paneel (bijv. de RSS-link).
 */
export function InhoudNieuwsbrief({
  teksten,
  onder,
  className = "",
}: {
  teksten: NieuwsbriefAanmeldTeksten;
  onder?: ReactNode;
  className?: string;
}) {
  return (
    <section aria-label="Nieuwsbrief" className={`pb-[68px] tablet:pb-[92px] ${className}`}>
      <Container>
        <div className={`rounded-ontwerp-lg ${NIEUWSBRIEF_VERLOOP} px-6 py-[30px] tablet:p-[52px]`}>
          <NieuwsbriefAanmelden weergave="paneel" teksten={teksten} toestemming={<Opmaak tekst={teksten.toestemming_tekst} />} />
        </div>
        {onder}
      </Container>
    </section>
  );
}
