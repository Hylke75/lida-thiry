import { vulIn } from "@/lib/inhoud/schema";
import type { TestTeksten } from "@/lib/inhoud/groepen/test";
import { knopKlassen } from "@/components/site/Basis";
import { klantMeldingKlassen } from "@/components/site/KlantPagina";
import { veiligeLink } from "@/lib/website/weergave";

/**
 * Lida's rekenmethode gaf geen duidelijk silhouet. Zoals Lida het wil: de klant
 * kiest zelf (met uitleg over het gevolg) of vraagt een stijladvies op afstand aan.
 */
export function GeenDuidelijkSilhouet({
  teksten: t,
  silhouet,
  bezig,
  kiesZelf,
}: {
  teksten: TestTeksten["proporties"];
  /** Naam van het silhouet dat de klant zelf koos. */
  silhouet: string;
  bezig: boolean;
  kiesZelf: () => void;
}) {
  const stoa = veiligeLink(t.geen_type_stoa_link, "/contact");
  return (
    <section aria-live="polite" className={`${klantMeldingKlassen("letop")} flex flex-col gap-3`}>
      <h2 className="m-0 font-serif text-[22px] leading-[1.15] font-normal">{t.geen_type_titel}</h2>
      <p className="m-0 whitespace-pre-line">{t.geen_type_tekst}</p>
      <p className="m-0 whitespace-pre-line font-bold">{t.geen_type_gevolg}</p>
      <div className="flex flex-col gap-3 tablet:flex-row tablet:flex-wrap">
        <button type="button" onClick={kiesZelf} disabled={bezig} className={knopKlassen()}>
          {vulIn(t.geen_type_eigen_knop, { silhouet })}
        </button>
        <a href={stoa} className={knopKlassen({ variant: "outline" })}>
          {t.geen_type_stoa_knop}
        </a>
      </div>
    </section>
  );
}
