import type { ReactNode } from "react";
import { TekstLink } from "@/components/site/Basis";
import { InhoudKop } from "@/components/site/InhoudKop";
import { InhoudProza } from "@/components/site/InhoudProza";
import { CONTAINER } from "@/components/site/stijl";
import { leesPubliekeInstellingen } from "@/lib/instellingen";
import { BEDRIJFSNAAM_STANDAARD } from "@/lib/site";

/** Gemeenschappelijke opmaak voor de voorwaarden en de privacyverklaring. */
export function JuridischePagina({
  titel,
  bijgewerkt,
  concept,
  children,
}: {
  titel: string;
  bijgewerkt: string;
  /** Toon de conceptmelding (zolang er nog [invulplekken] in de tekst staan). */
  concept: boolean;
  children: ReactNode;
}) {
  return (
    <main className="flex w-full flex-1 flex-col">
      <InhoudKop
        smal
        titel={titel}
        boven={
          <TekstLink href="/" className="-my-2 text-[13px]">
            <span aria-hidden="true">←</span> Terug naar de startpagina
          </TekstLink>
        }
        onder={<p className="m-0 text-[14px] font-semibold text-ink-soft">Laatst bijgewerkt: {bijgewerkt}</p>}
      />
      <div className={`${CONTAINER} flex max-w-[720px] flex-col gap-10 pt-10 pb-[68px] tablet:pt-14 tablet:pb-[92px]`}>
        {concept && (
          <p className="m-0 rounded-ontwerp-sm border border-butter bg-[#fff8dd] px-5 py-4 text-[14px] text-ink">
            <strong className="font-extrabold">Concept — laten controleren.</strong> Deze tekst is een concept en moet nog
            juridisch worden nagekeken en aangevuld (zie de gegevens tussen [blokhaken]).
          </p>
        )}
        <InhoudProza juridisch>{children}</InhoudProza>
      </div>
    </main>
  );
}

/**
 * Identiteitsblok van de ondernemer, gevuld uit de instellingen (Beheer → Instellingen).
 * Wat nog niet is ingevuld, blijft zichtbaar als gemarkeerde placeholder.
 */
/** Het contact-e-mailadres uit de instellingen, of een zichtbare invulplek. */
export async function contactEmail(): Promise<string> {
  const inst = await leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>);
  return inst.contact_email?.trim() || "[e-mailadres]";
}

export async function Identiteit() {
  const inst = await leesPubliekeInstellingen().catch(() => ({}) as Record<string, string | null>);
  const waarde = (sleutel: string, placeholder: string) => inst[sleutel]?.trim() || placeholder;
  return (
    <div className="rounded-ontwerp-sm border border-line bg-cream px-5 py-5 text-[15px] leading-[1.6] text-ink [&_p]:m-0">
      <p className="mb-1! font-serif text-[22px] leading-[1.2]">
        {waarde("bedrijfsnaam", BEDRIJFSNAAM_STANDAARD)}
      </p>
      <p>Eigenaar: Lida Thiry</p>
      <p className="whitespace-pre-line">Adres: {waarde("bedrijf_adres", "[adres], [postcode] [plaats]")}</p>
      <p>E-mail: {waarde("contact_email", "[e-mailadres]")}</p>
      <p>KvK-nummer: {waarde("kvk_nummer", "[KvK-nummer]")}</p>
      <p>Btw-identificatienummer: {waarde("btw_nummer", "[btw-id]")}</p>
    </div>
  );
}
